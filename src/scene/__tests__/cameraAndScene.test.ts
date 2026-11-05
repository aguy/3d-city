import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
  DEFAULT_CAMERA_PARAMS,
  DEFAULT_STREET_BOUNDS,
} from '../../types/cameraTypes';
import {
  applyCameraParameters,
  computeCameraTransform,
} from '../cameraController';
import {
  PAPER_THEME_PALETTES,
  applyPlotterEffects,
  applyPlotterLineStyle,
  applyRenderModeToScene,
  createPlotterMesh,
  plotterStyleUniforms,
} from '../plotterMaterial';
import { buildRoadScene } from '../roadBuilder';
import {
  applyBuildingDetailLevel,
  buildBuildingsScene,
} from '../buildingBuilder';
import {
  buildCityPointCloud,
  updatePointCloudDensity,
} from '../pointsBuilder';
import { buildVehiclesScene, updateVehicles } from '../vehicleBuilder';
import {
  buildPedestriansScene,
  updatePedestrians,
} from '../pedestrianBuilder';
import {
  applyObserverCamera,
  createTransitionVisualizerGroup,
  evaluateEasing,
  evaluateEasingVelocity,
  interpolateCameraParams,
  sampleTransitionTrajectory,
  updateTransitionVisualizerGroup,
} from '../transitionController';

describe('Camera Controller & Transformations', () => {
  it('maps Camera height m directly to camera Y position', () => {
    const camera = new THREE.PerspectiveCamera(50, 1.5, 0.5, 500);
    applyCameraParameters(camera, {
      ...DEFAULT_CAMERA_PARAMS,
      cameraHeight: 42.5,
    });
    expect(camera.position.y).toBeCloseTo(42.5, 4);
  });

  it('maps Camera along % to Z axis and Camera side % to X axis', () => {
    const startTransform = computeCameraTransform(
      { ...DEFAULT_CAMERA_PARAMS, cameraAlong: 0, cameraSide: -100 },
      DEFAULT_STREET_BOUNDS
    );
    expect(startTransform.position.z).toBeCloseTo(
      DEFAULT_STREET_BOUNDS.startZ,
      4
    );
    expect(startTransform.position.x).toBeCloseTo(
      -DEFAULT_STREET_BOUNDS.halfWidthX,
      4
    );

    const endTransform = computeCameraTransform(
      { ...DEFAULT_CAMERA_PARAMS, cameraAlong: 100, cameraSide: 100 },
      DEFAULT_STREET_BOUNDS
    );
    expect(endTransform.position.z).toBeCloseTo(
      DEFAULT_STREET_BOUNDS.endZ,
      4
    );
    expect(endTransform.position.x).toBeCloseTo(
      DEFAULT_STREET_BOUNDS.halfWidthX,
      4
    );
  });

  it('calculates Look ahead m target along the street axis and aims camera with lookAt', () => {
    const camera = new THREE.PerspectiveCamera(50, 1.5, 0.5, 500);
    const transformNear = applyCameraParameters(camera, {
      ...DEFAULT_CAMERA_PARAMS,
      cameraHeight: 20,
      lookAhead: 15,
      pitch: 0,
      turn: 0,
    });
    const pitchNear = camera.rotation.x;

    const transformFar = applyCameraParameters(camera, {
      ...DEFAULT_CAMERA_PARAMS,
      cameraHeight: 20,
      lookAhead: 150,
      pitch: 0,
      turn: 0,
    });
    const pitchFar = camera.rotation.x;

    expect(transformNear.target.z).toBeCloseTo(
      transformNear.position.z - 15,
      4
    );
    expect(transformFar.target.z).toBeCloseTo(
      transformFar.position.z - 150,
      4
    );
    // Looking closer at the ground from 20m high tilts more downward than looking 150m ahead
    expect(pitchNear).toBeLessThan(pitchFar);
  });

  it('converts Pitch ° and Turn ° from degrees to radians and applies them to camera rotation', () => {
    const camera = new THREE.PerspectiveCamera(50, 1.5, 0.5, 500);
    applyCameraParameters(camera, {
      ...DEFAULT_CAMERA_PARAMS,
      pitch: 0,
      turn: 0,
    });
    const baseRotX = camera.rotation.x;
    const baseRotY = camera.rotation.y;

    const transform = applyCameraParameters(camera, {
      ...DEFAULT_CAMERA_PARAMS,
      pitch: 15,
      turn: 30,
    });

    expect(transform.pitchRad).toBeCloseTo(THREE.MathUtils.degToRad(15), 5);
    expect(transform.turnRad).toBeCloseTo(THREE.MathUtils.degToRad(30), 5);
    expect(camera.rotation.x).toBeCloseTo(
      baseRotX + THREE.MathUtils.degToRad(15),
      4
    );
    expect(camera.rotation.y).toBeCloseTo(
      baseRotY - THREE.MathUtils.degToRad(30),
      4
    );
  });

  it('updates camera.fov and calls updateProjectionMatrix when Field of view ° changes', () => {
    const camera = new THREE.PerspectiveCamera(50, 1.5, 0.5, 500);
    const spy = vi.spyOn(camera, 'updateProjectionMatrix');

    applyCameraParameters(camera, {
      ...DEFAULT_CAMERA_PARAMS,
      fov: 75,
    });

    expect(camera.fov).toBe(75);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('Plotter Scene & Asset Builders', () => {
  it('creates EdgesGeometry + LineSegments and switches render modes cleanly', () => {
    const scene = new THREE.Scene();
    const box = createPlotterMesh(new THREE.BoxGeometry(2, 4, 2));
    scene.add(box);

    let occluder: THREE.Mesh | undefined;
    let edgeLines: THREE.LineSegments | undefined;
    box.traverse((child) => {
      if (child.userData.isOccluder && child instanceof THREE.Mesh) {
        occluder = child;
      }
      if (child.userData.isEdgeLine && child instanceof THREE.LineSegments) {
        edgeLines = child;
      }
    });

    expect(occluder).toBeDefined();
    expect(edgeLines).toBeDefined();

    applyRenderModeToScene(scene, 'edges-wireframe');
    expect(occluder!.visible).toBe(false);
    expect(edgeLines!.visible).toBe(true);

    applyRenderModeToScene(scene, 'sobel-post');
    expect(occluder!.visible).toBe(true);
    expect(edgeLines!.visible).toBe(false);

    applyRenderModeToScene(scene, 'edges-occluded');
    expect(occluder!.visible).toBe(true);
    expect(edgeLines!.visible).toBe(true);
  });

  it('builds road, buildings, vehicles, and pedestrians along the street canyon', () => {
    const road = buildRoadScene();
    const buildings = buildBuildingsScene();
    const { group: vehicles, animatedVehicles } = buildVehiclesScene();
    const { group: pedestrians, animatedPedestrians } =
      buildPedestriansScene();

    expect(road.children.length).toBeGreaterThan(10);
    expect(buildings.children.length).toBeGreaterThan(20);
    expect(vehicles.children.length).toBe(animatedVehicles.length);
    expect(animatedVehicles.length).toBeGreaterThan(10);
    expect(pedestrians.children.length).toBeGreaterThan(
      animatedPedestrians.length
    );

    const initialVehicleZ = animatedVehicles[0].mesh.position.z;
    updateVehicles(animatedVehicles, 0.5);
    expect(animatedVehicles[0].mesh.position.z).not.toBe(initialVehicleZ);

    const initialPedZ = animatedPedestrians[0].mesh.position.z;
    updatePedestrians(animatedPedestrians, 0.5);
    expect(animatedPedestrians[0].mesh.position.z).not.toBe(initialPedZ);
  });

  it('dynamically controls windows, balconies, and architectural details via parameters', () => {
    const buildings = buildBuildingsScene();

    const countVisibleTagged = (key: string) => {
      let visibleCount = 0;
      let totalCount = 0;
      buildings.traverse((obj) => {
        if (typeof obj.userData[key] === 'number') {
          totalCount++;
          if (obj.visible) visibleCount++;
        }
      });
      return { visibleCount, totalCount };
    };

    // At 0%, all windows, balconies, and architectural details are hidden
    applyBuildingDetailLevel(buildings, {
      windowDensity: 0,
      balconyDensity: 0,
      buildingDetail: 0,
    });
    expect(countVisibleTagged('windowThreshold').visibleCount).toBe(0);
    expect(countVisibleTagged('balconyThreshold').visibleCount).toBe(0);
    expect(countVisibleTagged('detailThreshold').visibleCount).toBe(0);
    expect(countVisibleTagged('windowThreshold').totalCount).toBeGreaterThan(50);
    expect(countVisibleTagged('balconyThreshold').totalCount).toBeGreaterThan(50);

    // At 50%, partial subset of windows and balconies are visible
    applyBuildingDetailLevel(buildings, {
      windowDensity: 50,
      balconyDensity: 50,
      buildingDetail: 50,
    });
    const win50 = countVisibleTagged('windowThreshold');
    const bal50 = countVisibleTagged('balconyThreshold');
    expect(win50.visibleCount).toBeGreaterThan(0);
    expect(win50.visibleCount).toBeLessThan(win50.totalCount);
    expect(bal50.visibleCount).toBeGreaterThan(0);
    expect(bal50.visibleCount).toBeLessThan(bal50.totalCount);

    // At 100%, all windows, balconies, and architectural details are visible
    applyBuildingDetailLevel(buildings, {
      windowDensity: 100,
      balconyDensity: 100,
      buildingDetail: 100,
    });
    const win100 = countVisibleTagged('windowThreshold');
    const bal100 = countVisibleTagged('balconyThreshold');
    const det100 = countVisibleTagged('detailThreshold');
    expect(win100.visibleCount).toBe(win100.totalCount);
    expect(bal100.visibleCount).toBe(bal100.totalCount);
    expect(det100.visibleCount).toBe(det100.totalCount);
  });

  it('updates plotter line weight, jitter, shading, lens, multi-pen, and paper theme uniforms accurately', () => {
    applyPlotterLineStyle(2.8, 65);
    expect(plotterStyleUniforms.uLineWeight.value).toBeCloseTo(2.8, 4);
    expect(plotterStyleUniforms.uJitter.value).toBeCloseTo(0.65, 4);

    applyPlotterEffects({
      ...DEFAULT_CAMERA_PARAMS,
      lineWeight: 1.8,
      lineJitter: 40,
      cornerOvershoot: 75,
      inkPooling: 50,
      inkDropout: 30,
      sketchPasses: 3,
      hatchDensity: 60,
      stippleShade: 45,
      depthTaper: 80,
      dofBlur: 55,
      penMisregistration: 4.2,
      paperTheme: 'blueprint',
      distantGradient: true,
      lensCurvature: -60,
      orthoBlend: 100,
      lookAhead: 95,
      pointsDensity: 70,
    });

    expect(plotterStyleUniforms.uLineWeight.value).toBeCloseTo(1.8, 4);
    expect(plotterStyleUniforms.uJitter.value).toBeCloseTo(0.4, 4);
    expect(plotterStyleUniforms.uOvershoot.value).toBeCloseTo(0.75, 4);
    expect(plotterStyleUniforms.uInkPooling.value).toBeCloseTo(0.5, 4);
    expect(plotterStyleUniforms.uInkDropout.value).toBeCloseTo(0.3, 4);
    expect(plotterStyleUniforms.uSketchPasses.value).toBe(3);
    expect(plotterStyleUniforms.uHatchDensity.value).toBeCloseTo(0.6, 4);
    expect(plotterStyleUniforms.uStippleShade.value).toBeCloseTo(0.45, 4);
    expect(plotterStyleUniforms.uDepthTaper.value).toBeCloseTo(0.8, 4);
    expect(plotterStyleUniforms.uDofBlur.value).toBeCloseTo(0.55, 4);
    expect(plotterStyleUniforms.uFocalDistance.value).toBeCloseTo(95, 4);
    expect(plotterStyleUniforms.uPenMisregistration.value).toBeCloseTo(4.2, 4);
    expect(plotterStyleUniforms.uLensCurvature.value).toBeCloseTo(-0.6, 4);
    expect(plotterStyleUniforms.uPointsDensity.value).toBeCloseTo(0.7, 4);
    expect(plotterStyleUniforms.uDistantGradient.value).toBe(1.0);
    expect(plotterStyleUniforms.uPaperColor.value.getHex()).toBe(
      PAPER_THEME_PALETTES.blueprint.paperBgHex
    );
    expect(plotterStyleUniforms.uInkColor.value.getHex()).toBe(
      PAPER_THEME_PALETTES.blueprint.primaryInkHex
    );
    expect(plotterStyleUniforms.uGradientHorizonColor.value.getHex()).toBe(
      PAPER_THEME_PALETTES.blueprint.gradientHorizonHex
    );
    expect(plotterStyleUniforms.uGradientZenithColor.value.getHex()).toBe(
      PAPER_THEME_PALETTES.blueprint.gradientZenithHex
    );

    // Verify orthoBlend interpolates camera projectionMatrix toward orthographic
    const camPersp = new THREE.PerspectiveCamera(50, 1.5, 0.5, 500);
    applyCameraParameters(camPersp, {
      ...DEFAULT_CAMERA_PARAMS,
      orthoBlend: 0,
    });
    const perspW = camPersp.projectionMatrix.elements[11]; // -1 in pure perspective

    const camOrtho = new THREE.PerspectiveCamera(50, 1.5, 0.5, 500);
    applyCameraParameters(camOrtho, {
      ...DEFAULT_CAMERA_PARAMS,
      orthoBlend: 100,
    });
    const orthoW = camOrtho.projectionMatrix.elements[11]; // 0 in pure orthographic
    expect(perspW).toBeCloseTo(-1, 4);
    expect(orthoW).toBeCloseTo(0, 4);

    // Reset back to default
    applyPlotterEffects(DEFAULT_CAMERA_PARAMS);
  });

  it('generates 3D city point cloud and controls progressive object micro-details via pointsDensity', () => {
    const road = buildRoadScene();
    const buildings = buildBuildingsScene();
    const vScene = buildVehiclesScene(0.7);

    // Verify micro-details are tagged with pointsThreshold in road and vehicles
    let roadPointsTagged = 0;
    road.traverse((obj) => {
      if (typeof obj.userData.pointsThreshold === 'number') {
        roadPointsTagged++;
      }
    });
    expect(roadPointsTagged).toBeGreaterThan(0);

    let vehiclePointsTagged = 0;
    vScene.group.traverse((obj) => {
      if (typeof obj.userData.pointsThreshold === 'number') {
        vehiclePointsTagged++;
      }
    });
    expect(vehiclePointsTagged).toBeGreaterThan(0);

    // Build the point cloud from the scene groups
    const pointCloud = buildCityPointCloud({
      road,
      buildings,
      vehicles: vScene.group,
    });
    expect(pointCloud).toBeInstanceOf(THREE.Points);
    expect(pointCloud.geometry.attributes.position.count).toBeGreaterThan(500);
    expect(pointCloud.geometry.attributes.aThreshold.count).toBe(
      pointCloud.geometry.attributes.position.count
    );

    // Verify updatePointCloudDensity updates drawRange and visibility
    updatePointCloudDensity(pointCloud, 0);
    expect(pointCloud.visible).toBe(false);
    expect(pointCloud.geometry.drawRange.count).toBe(0);

    updatePointCloudDensity(pointCloud, 50);
    expect(pointCloud.visible).toBe(true);
    expect(pointCloud.geometry.drawRange.count).toBe(
      Math.floor(pointCloud.geometry.attributes.position.count * 0.5)
    );

    updatePointCloudDensity(pointCloud, 100);
    expect(pointCloud.visible).toBe(true);
    expect(pointCloud.geometry.drawRange.count).toBe(
      pointCloud.geometry.attributes.position.count
    );

    // Verify applyBuildingDetailLevel controls pointsThreshold visibility and applyRenderModeToScene preserves hiddenByDetail
    const testScene = new THREE.Scene();
    testScene.add(buildings);
    applyBuildingDetailLevel(buildings, {
      windowDensity: 100,
      balconyDensity: 100,
      buildingDetail: 100,
      pointsDensity: 0,
    });
    applyRenderModeToScene(testScene, 'edges-occluded');
    let visiblePointsDetails = 0;
    buildings.traverse((obj) => {
      if (typeof obj.userData.pointsThreshold === 'number' && obj.visible) {
        visiblePointsDetails++;
      }
    });
    expect(visiblePointsDetails).toBe(0);

    applyBuildingDetailLevel(buildings, {
      windowDensity: 100,
      balconyDensity: 100,
      buildingDetail: 100,
      pointsDensity: 100,
    });
    applyRenderModeToScene(testScene, 'edges-occluded');
    let visiblePointsDetails100 = 0;
    buildings.traverse((obj) => {
      if (typeof obj.userData.pointsThreshold === 'number' && obj.visible) {
        visiblePointsDetails100++;
      }
    });
    expect(visiblePointsDetails100).toBeGreaterThan(0);
  });

  it('evaluates transition easing curves, interpolates camera parameters, and builds 3D transition trajectory geometry', () => {
    expect(evaluateEasing('easeInOutCubic', 0)).toBeCloseTo(0, 5);
    expect(evaluateEasing('easeInOutCubic', 0.5)).toBeCloseTo(0.5, 5);
    expect(evaluateEasing('easeInOutCubic', 1)).toBeCloseTo(1, 5);
    expect(evaluateEasingVelocity('easeInOutCubic', 0.5)).toBeGreaterThan(1.2);

    const startParams = {
      ...DEFAULT_CAMERA_PARAMS,
      cameraHeight: 10,
      cameraAlong: 10,
      cameraSide: -50,
      fov: 40,
    };
    const endParams = {
      ...DEFAULT_CAMERA_PARAMS,
      cameraHeight: 50,
      cameraAlong: 80,
      cameraSide: 50,
      fov: 70,
    };

    const midParams = interpolateCameraParams(
      startParams,
      endParams,
      0.5,
      {
        ...DEFAULT_CAMERA_PARAMS,
        renderMode: 'sobel-post',
        animateScene: true,
        lineWeight: 2.5,
      }
    );
    expect(midParams.cameraHeight).toBeCloseTo(30, 2);
    expect(midParams.cameraAlong).toBeCloseTo(45, 2);
    expect(midParams.cameraSide).toBeCloseTo(0, 2);
    expect(midParams.fov).toBeCloseTo(55, 2);
    expect(midParams.renderMode).toBe('sobel-post');
    expect(midParams.animateScene).toBe(true);
    expect(midParams.lineWeight).toBeCloseTo(2.5, 2);

    const samples = sampleTransitionTrajectory(
      startParams,
      endParams,
      'easeOutQuart',
      16
    );
    expect(samples).toHaveLength(17);
    expect(samples[0].transform.position.y).toBeCloseTo(10, 2);
    expect(samples[16].transform.position.y).toBeCloseTo(50, 2);

    const visualizerGroup = createTransitionVisualizerGroup();
    updateTransitionVisualizerGroup(visualizerGroup, {
      fromParams: startParams,
      toParams: endParams,
      currentParams: midParams,
      progressT: 0.5,
      easing: 'easeInOutCubic',
      visible: true,
      observerMode: true,
    });
    expect(visualizerGroup.visible).toBe(true);
    expect(visualizerGroup.children.length).toBeGreaterThan(0);

    const observerCam = new THREE.PerspectiveCamera(50, 1.6, 0.5, 500);
    const activeTf = applyObserverCamera(
      observerCam,
      startParams,
      endParams,
      midParams
    );
    expect(activeTf.position.y).toBeCloseTo(30, 2);
    expect(observerCam.position.y).toBeGreaterThan(30);
  });
});
