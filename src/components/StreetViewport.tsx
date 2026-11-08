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
  const printImageRef = useRef<HTMLImageElement | null>(null);
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

    // 3. WebGLRenderer with alpha: true and preserveDrawingBuffer: true for crisp printing
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
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
    let lastPointsDensity =
      paramsRef.current.pointsDensity ?? DEFAULT_CAMERA_PARAMS.pointsDensity;
    let lastVisualizerSignature = '';

    const updateSceneDetailsVisibility = (
      targetScene: THREE.Scene,
      pd: number
    ) => {
      targetScene.traverse((obj) => {
        if (typeof obj.userData.pointsThreshold === 'number') {
          const vis = pd > 0 && obj.userData.pointsThreshold <= pd;
          obj.visible = vis;
          obj.userData.hiddenByDetail = !vis;
        }
      });
    };

    applyBuildingDetailLevel(buildingsGroup, {
      windowDensity: lastWindowDensity,
      balconyDensity: lastBalconyDensity,
      buildingDetail: lastBuildingDetail,
      pointsDensity: lastPointsDensity,
    });
    updateSceneDetailsVisibility(scene, lastPointsDensity);
    applyRenderModeToScene(scene, lastRenderMode);
    applyPlotterEffects(paramsRef.current);
    sobelPipeline.setStyleUniforms(
      lastRenderMode === 'sobel-post',
      paramsRef.current.lineWeight,
      paramsRef.current.lineJitter,
      paramsRef.current
    );

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

    const renderCurrentFrame = () => {
      const currentParams = paramsRef.current;
      const needsPostPass =
        currentParams.renderMode === 'sobel-post' ||
        Math.abs(currentParams.lineWeight - 1.0) > 0.02 ||
        currentParams.manualSketch > 0 ||
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

    const preparePrintSnapshot = () => {
      renderCurrentFrame();
      const glCanvas = renderer.domElement;
      const printImg = printImageRef.current;
      if (!glCanvas || !printImg || glCanvas.width === 0 || glCanvas.height === 0) {
        return;
      }

      const currentParams = paramsRef.current;
      const activePalette =
        PAPER_THEME_PALETTES[currentParams.paperTheme] ??
        PAPER_THEME_PALETTES.cream;

      const offscreen = document.createElement('canvas');
      offscreen.width = glCanvas.width;
      offscreen.height = glCanvas.height;
      const ctx = offscreen.getContext('2d');
      if (!ctx) return;

      const w = offscreen.width;
      const h = offscreen.height;
      const pr = renderer.getPixelRatio();

      // 1. Paint paper background or distant atmospheric gradient
      if (currentParams.distantGradient) {
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        const zenithHex = `#${activePalette.gradientZenithHex.toString(16).padStart(6, '0')}`;
        const horizonHex = `#${activePalette.gradientHorizonHex.toString(16).padStart(6, '0')}`;
        grad.addColorStop(0, zenithHex);
        grad.addColorStop(0.46, horizonHex);
        grad.addColorStop(0.9, activePalette.cssPaperBg);
        grad.addColorStop(1, activePalette.cssPaperBg);
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = activePalette.cssPaperBg;
      }
      ctx.fillRect(0, 0, w, h);

      // 2. Paint minor (12px) and major (60px) graph paper grid lines
      const minorStep = 12 * pr;
      const majorStep = 60 * pr;
      ctx.lineWidth = Math.max(1, pr * 0.75);

      ctx.strokeStyle = activePalette.cssGridMinor;
      ctx.beginPath();
      for (let x = 0; x <= w; x += minorStep) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = 0; y <= h; y += minorStep) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();

      ctx.strokeStyle = activePalette.cssGridMajor;
      ctx.beginPath();
      for (let x = 0; x <= w; x += majorStep) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = 0; y <= h; y += majorStep) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();

      // 3. Composite the rendered WebGL plotter canvas on top
      ctx.drawImage(glCanvas, 0, 0);

      try {
        printImg.src = offscreen.toDataURL('image/png');
      } catch {
        // Ignore security/taint errors in headless test environments
      }
    };

    const handleTriggerPrint = () => {
      preparePrintSnapshot();
      setTimeout(() => {
        window.print();
      }, 40);
    };

    window.addEventListener('beforeprint', preparePrintSnapshot);
    window.addEventListener('plotter:print', handleTriggerPrint);

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

        const currentPointsDensity =
          currentParams.pointsDensity ?? DEFAULT_CAMERA_PARAMS.pointsDensity;

        applyBuildingDetailLevel(buildingsGroup, {
          windowDensity: currentParams.windowDensity,
          balconyDensity: currentParams.balconyDensity,
          buildingDetail: currentParams.buildingDetail,
          pointsDensity: currentPointsDensity,
        });
        updateSceneDetailsVisibility(scene, currentPointsDensity);
        applyRenderModeToScene(scene, currentParams.renderMode);
      }

      const currentPointsDensity =
        currentParams.pointsDensity ?? DEFAULT_CAMERA_PARAMS.pointsDensity;

      // Update building detail level (windows, balconies, architecture, points density) if changed
      if (
        currentParams.windowDensity !== lastWindowDensity ||
        currentParams.balconyDensity !== lastBalconyDensity ||
        currentParams.buildingDetail !== lastBuildingDetail ||
        currentPointsDensity !== lastPointsDensity
      ) {
        lastWindowDensity = currentParams.windowDensity;
        lastBalconyDensity = currentParams.balconyDensity;
        lastBuildingDetail = currentParams.buildingDetail;
        lastPointsDensity = currentPointsDensity;
        applyBuildingDetailLevel(buildingsGroup, {
          windowDensity: lastWindowDensity,
          balconyDensity: lastBalconyDensity,
          buildingDetail: lastBuildingDetail,
          pointsDensity: lastPointsDensity,
        });
        updateSceneDetailsVisibility(scene, lastPointsDensity);
        applyRenderModeToScene(scene, currentParams.renderMode);
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

      renderCurrentFrame();
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('beforeprint', preparePrintSnapshot);
      window.removeEventListener('plotter:print', handleTriggerPrint);
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
    '--sky-gradient': params.distantGradient ? palette.cssGradientBg : 'none',
  } as React.CSSProperties;

  return (
    <main
      className="right-panel"
      style={paperStyle}
      aria-label="3D Plotter Street Canyon Viewport"
    >
      <ScenePromptBar onGenerate={onGenerateScene} />

      <div className="viewport-canvas-container" ref={containerRef} />

      <img
        ref={printImageRef}
        className="print-snapshot-img"
        alt="Plotter Drawing Print View"
      />

      <div className="viewport-hud-top-left">
        <span className="hud-tag">
          PEN: {params.lineWeight.toFixed(1)}PX · MANUAL: {params.manualSketch}%
          {' · '}JITTER: {params.lineJitter}% · PASSES: {params.sketchPasses}×
        </span>
        <span className="hud-tag">
          PAPER: {params.paperTheme.toUpperCase()} · HATCH:{' '}
          {params.hatchDensity}% · STIPPLE: {params.stippleShade}% · DETAIL:{' '}
          {params.pointsDensity}%
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
