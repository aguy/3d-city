import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import {
  CAMERA_PRESETS,
  CameraParameters,
  DEFAULT_CAMERA_PARAMS,
  DEFAULT_STREET_BOUNDS,
  DEFAULT_TRANSITION_SETTINGS,
  TransitionSettings,
} from '../types/cameraTypes';
import { applyCameraParameters } from '../scene/cameraController';
import {
  PAPER_THEME_PALETTES,
  applyPlotterEffects,
  applyRenderModeToScene,
  createTargetReticle,
} from '../scene/plotterMaterial';
import { SceneDescriptor } from '../types/scenePromptTypes';
import { ScenePromptBar } from './ScenePromptBar';
import { createSobelPipeline } from '../scene/sobelShader';
import { buildRoadScene } from '../scene/roadBuilder';
import {
  applyBuildingDetailLevel,
  buildBuildingsScene,
} from '../scene/buildingBuilder';
import { buildVehiclesScene, updateVehicles } from '../scene/vehicleBuilder';
import {
  buildPedestriansScene,
  updatePedestrians,
} from '../scene/pedestrianBuilder';
import {
  applyObserverCamera,
  createTransitionVisualizerGroup,
  updateTransitionVisualizerGroup,
} from '../scene/transitionController';
import { TransitionVisualizerHud } from './TransitionVisualizerHud';

const DEFAULT_SECOND_KEYFRAME: CameraParameters = {
  ...DEFAULT_CAMERA_PARAMS,
  ...CAMERA_PRESETS[1].params,
};

export interface StreetViewportProps {
  params: CameraParameters;
  sceneDescriptor?: SceneDescriptor;
  onGenerateScene?: (descriptor: SceneDescriptor) => void;
  fromParams?: CameraParameters;
  toParams?: CameraParameters;
  fromLabel?: string;
  toLabel?: string;
  progressT?: number;
  isPlaying?: boolean;
  isTouring?: boolean;
  transitionSettings?: TransitionSettings;
  onScrub?: (t: number) => void;
  onTogglePlay?: () => void;
  onToggleTour?: () => void;
  onCaptureFrom?: () => void;
  onCaptureTo?: () => void;
  onSwapKeyframes?: () => void;
  onUpdateTransitionSettings?: (partial: Partial<TransitionSettings>) => void;
}

export const StreetViewport: React.FC<StreetViewportProps> = ({
  params,
  sceneDescriptor,
  onGenerateScene = () => {},
  fromParams = DEFAULT_CAMERA_PARAMS,
  toParams = DEFAULT_SECOND_KEYFRAME,
  fromLabel = 'Canyon Overview',
  toLabel = 'Pedestrian Eye-Level',
  progressT = 0,
  isPlaying = false,
  isTouring = false,
  transitionSettings = DEFAULT_TRANSITION_SETTINGS,
  onScrub = () => {},
  onTogglePlay = () => {},
  onToggleTour = () => {},
  onCaptureFrom = () => {},
  onCaptureTo = () => {},
  onSwapKeyframes = () => {},
  onUpdateTransitionSettings = () => {},
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const paramsRef = useRef<CameraParameters>(params);
  paramsRef.current = params;

  const fromParamsRef = useRef<CameraParameters>(fromParams);
  fromParamsRef.current = fromParams;

  const toParamsRef = useRef<CameraParameters>(toParams);
  toParamsRef.current = toParams;

  const progressTRef = useRef<number>(progressT);
  progressTRef.current = progressT;

  const transitionSettingsRef =
    useRef<TransitionSettings>(transitionSettings);
  transitionSettingsRef.current = transitionSettings;

  const sceneDescriptorRef = useRef<SceneDescriptor | undefined>(sceneDescriptor);
  sceneDescriptorRef.current = sceneDescriptor;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 960;
    const height = container.clientHeight || 720;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    // 1. Scene setup (no standard lighting or textures — pure plotter aesthetic)
    const scene = new THREE.Scene();

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(
      paramsRef.current.fov,
      width / height,
      0.5,
      650
    );

    // 3. WebGLRenderer with alpha: true so the CSS graph paper background shows through
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Populate urban street canyon assets + 3D Transition Trajectory Visualizer
    let currentDescriptor = sceneDescriptorRef.current;
    let roadGroup = buildRoadScene(currentDescriptor);
    let buildingsGroup = buildBuildingsScene(currentDescriptor);
    let vScene = buildVehiclesScene(currentDescriptor?.propDensity?.vehicles ?? 0.7);
    let vehiclesGroup = vScene.group;
    let animatedVehicles = vScene.animatedVehicles;
    let pScene = buildPedestriansScene(currentDescriptor?.propDensity?.pedestrians ?? 0.8);
    let pedestriansGroup = pScene.group;
    let animatedPedestrians = pScene.animatedPedestrians;
    const targetReticle = createTargetReticle();
    const transitionVisualizerGroup = createTransitionVisualizerGroup();

    scene.add(roadGroup);
    scene.add(buildingsGroup);
    scene.add(vehiclesGroup);
    scene.add(pedestriansGroup);
    scene.add(targetReticle);
    scene.add(transitionVisualizerGroup);

    // 5. Post-processing Sobel pipeline (Method 2)
    const sobelPipeline = createSobelPipeline(renderer, scene, camera);
    sobelPipeline.setSize(width, height, pixelRatio);

    let lastRenderMode = paramsRef.current.renderMode;
    let lastWindowDensity = paramsRef.current.windowDensity;
    let lastBalconyDensity = paramsRef.current.balconyDensity;
    let lastBuildingDetail = paramsRef.current.buildingDetail;
    let lastVisualizerSignature = '';

    applyRenderModeToScene(scene, lastRenderMode);
    applyPlotterEffects(paramsRef.current);
    sobelPipeline.setStyleUniforms(
      lastRenderMode === 'sobel-post',
      paramsRef.current.lineWeight,
      paramsRef.current.lineJitter,
      paramsRef.current
    );
    applyBuildingDetailLevel(buildingsGroup, {
      windowDensity: lastWindowDensity,
      balconyDensity: lastBalconyDensity,
      buildingDetail: lastBuildingDetail,
    });

    // 6. Responsive ResizeObserver
    const handleResize = () => {
      if (!container) return;
      const newW = Math.max(1, container.clientWidth);
      const newH = Math.max(1, container.clientHeight);
      const pr = Math.min(window.devicePixelRatio || 1, 2);

      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();

      renderer.setPixelRatio(pr);
      renderer.setSize(newW, newH);
      sobelPipeline.setSize(newW, newH, pr);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 7. Main animation loop binding slider state to the 3D camera, building details & transition trajectory
    let animationFrameId = 0;
    let prevTime = performance.now();

    const animate = (now: number) => {
      animationFrameId = requestAnimationFrame(animate);

      const dt = Math.min((now - prevTime) / 1000, 0.1);
      prevTime = now;

      const currentParams = paramsRef.current;
      const currentTransitionSettings = transitionSettingsRef.current;
      const currentFromParams = fromParamsRef.current;
      const currentToParams = toParamsRef.current;
      const currentProgressT = progressTRef.current;

      // Check if SceneDescriptor changed to dynamically rebuild ground, buildings, vehicles & pedestrians
      if (sceneDescriptorRef.current !== currentDescriptor) {
        currentDescriptor = sceneDescriptorRef.current;
        scene.remove(roadGroup);
        scene.remove(buildingsGroup);
        scene.remove(vehiclesGroup);
        scene.remove(pedestriansGroup);

        roadGroup = buildRoadScene(currentDescriptor);
        buildingsGroup = buildBuildingsScene(currentDescriptor);

        vScene = buildVehiclesScene(currentDescriptor?.propDensity?.vehicles ?? 0.7);
        vehiclesGroup = vScene.group;
        animatedVehicles = vScene.animatedVehicles;

        pScene = buildPedestriansScene(currentDescriptor?.propDensity?.pedestrians ?? 0.8);
        pedestriansGroup = pScene.group;
        animatedPedestrians = pScene.animatedPedestrians;

        scene.add(roadGroup);
        scene.add(buildingsGroup);
        scene.add(vehiclesGroup);
        scene.add(pedestriansGroup);

        applyRenderModeToScene(scene, currentParams.renderMode);
        applyBuildingDetailLevel(buildingsGroup, {
          windowDensity: currentParams.windowDensity,
          balconyDensity: currentParams.balconyDensity,
          buildingDetail: currentParams.buildingDetail,
        });
      }

      // Update building detail level (windows, balconies, architecture) if changed
      if (
        currentParams.windowDensity !== lastWindowDensity ||
        currentParams.balconyDensity !== lastBalconyDensity ||
        currentParams.buildingDetail !== lastBuildingDetail
      ) {
        lastWindowDensity = currentParams.windowDensity;
        lastBalconyDensity = currentParams.balconyDensity;
        lastBuildingDetail = currentParams.buildingDetail;
        applyBuildingDetailLevel(buildingsGroup, {
          windowDensity: lastWindowDensity,
          balconyDensity: lastBalconyDensity,
          buildingDetail: lastBuildingDetail,
        });
      }

      // Sync all plotter pen, shading, lens, depth, and paper theme uniforms
      applyPlotterEffects(currentParams);
      sobelPipeline.setStyleUniforms(
        currentParams.renderMode === 'sobel-post',
        currentParams.lineWeight,
        currentParams.lineJitter,
        currentParams
      );

      // Update 3D Transition Trajectory, Velocity Ticks & Ghost Frustums when transition state changes
      const visualizerSignature = JSON.stringify({
        f: currentFromParams,
        t: currentToParams,
        c: currentTransitionSettings.observerMode ? currentParams : null,
        e: currentTransitionSettings.easing,
        v: currentTransitionSettings.showTrajectory3D,
        o: currentTransitionSettings.observerMode,
      });

      if (visualizerSignature !== lastVisualizerSignature) {
        lastVisualizerSignature = visualizerSignature;
        updateTransitionVisualizerGroup(transitionVisualizerGroup, {
          fromParams: currentFromParams,
          toParams: currentToParams,
          currentParams,
          progressT: currentProgressT,
          easing: currentTransitionSettings.easing,
          visible: currentTransitionSettings.showTrajectory3D,
          observerMode: currentTransitionSettings.observerMode,
          bounds: DEFAULT_STREET_BOUNDS,
        });
        applyRenderModeToScene(scene, currentParams.renderMode);
      }

      // Update render mode materials if changed
      if (currentParams.renderMode !== lastRenderMode) {
        lastRenderMode = currentParams.renderMode;
        applyRenderModeToScene(scene, lastRenderMode);
      }

      // Apply either Observer Camera (external 3/4 view watching the 3D camera rig animate)
      // or Active First-Person Camera (bound to the 7 camera sliders + orthoBlend)
      const transform = currentTransitionSettings.observerMode
        ? applyObserverCamera(
            camera,
            currentFromParams,
            currentToParams,
            currentParams,
            DEFAULT_STREET_BOUNDS
          )
        : applyCameraParameters(camera, currentParams, DEFAULT_STREET_BOUNDS);

      // Update Look ahead m target reticle on the street
      targetReticle.visible = currentParams.showTargetMarker;
      targetReticle.position.set(
        transform.target.x,
        0.06,
        transform.target.z
      );

      // Optional traffic & pedestrian motion along the street canyon
      if (currentParams.animateScene) {
        updateVehicles(animatedVehicles, dt);
        updatePedestrians(animatedPedestrians, dt);
      }

      // Render through the post-processing pipeline when Sobel mode is active,
      // or when any screen-space pen, ink, multi-pass, DOF, or 2-pen effect is enabled
      const needsPostPass =
        currentParams.renderMode === 'sobel-post' ||
        Math.abs(currentParams.lineWeight - 1.0) > 0.02 ||
        currentParams.lineJitter > 0 ||
        currentParams.cornerOvershoot > 0 ||
        currentParams.inkPooling > 0 ||
        currentParams.inkDropout > 0 ||
        currentParams.sketchPasses > 1 ||
        currentParams.dofBlur > 0 ||
        currentParams.penMisregistration > 0 ||
        currentParams.depthTaper > 0;

      if (needsPostPass) {
        sobelPipeline.composer.render();
      } else {
        renderer.render(scene, camera);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      renderer.dispose();
    };
  }, []);

  const palette =
    PAPER_THEME_PALETTES[params.paperTheme] ?? PAPER_THEME_PALETTES.cream;

  const paperStyle = {
    '--paper-bg': palette.cssPaperBg,
    '--grid-minor': palette.cssGridMinor,
    '--grid-major': palette.cssGridMajor,
  } as React.CSSProperties;

  return (
    <main
      className="right-panel"
      style={paperStyle}
      aria-label="3D Plotter Street Canyon Viewport"
    >
      <ScenePromptBar onGenerate={onGenerateScene} />

      <div className="viewport-canvas-container" ref={containerRef} />

      <div className="viewport-hud-top-left">
        <span className="hud-tag">
          PEN: {params.lineWeight.toFixed(1)}PX · JITTER: {params.lineJitter}% ·{' '}
          PASSES: {params.sketchPasses}×
        </span>
        <span className="hud-tag">
          PAPER: {params.paperTheme.toUpperCase()} · HATCH:{' '}
          {params.hatchDensity}% · STIPPLE: {params.stippleShade}%
        </span>
        {(params.lensCurvature !== 0 || params.orthoBlend > 0) && (
          <span className="hud-tag">
            OPTICS: CURVE {params.lensCurvature}% · ORTHO {params.orthoBlend}%
          </span>
        )}
        {transitionSettings.observerMode && (
          <span className="hud-tag hud-tag-invert">
            DIRECTOR OBSERVER VIEW (3D CAMERA RIG ACTIVE)
          </span>
        )}
      </div>

      <TransitionVisualizerHud
        fromParams={fromParams}
        toParams={toParams}
        currentParams={params}
        fromLabel={fromLabel}
        toLabel={toLabel}
        progressT={progressT}
        isPlaying={isPlaying}
        isTouring={isTouring}
        settings={transitionSettings}
        onScrub={onScrub}
        onTogglePlay={onTogglePlay}
        onToggleTour={onToggleTour}
        onCaptureFrom={onCaptureFrom}
        onCaptureTo={onCaptureTo}
        onSwapKeyframes={onSwapKeyframes}
        onUpdateSettings={onUpdateTransitionSettings}
      />

      <div className="viewport-hud-bottom-right">
        <span>
          Z-ALONG: {params.cameraAlong.toFixed(1)}% · X-SIDE:{' '}
          {params.cameraSide.toFixed(0)}% · LOOK-AHEAD: {params.lookAhead}m
        </span>
      </div>
    </main>
  );
};
