import React, { useEffect, useRef } from 'react';
import { Pane } from 'tweakpane';
import {
  CAMERA_PRESETS,
  CameraParameters,
  DEFAULT_CAMERA_PARAMS,
  DEFAULT_STREET_BOUNDS,
  DEFAULT_TRANSITION_SETTINGS,
  TransitionSettings,
} from '../types/cameraTypes';
import { computeCameraTransform } from '../scene/cameraController';

interface ControlSidebarProps {
  params: CameraParameters;
  onChange: (next: CameraParameters) => void;
  transitionSettings?: TransitionSettings;
  onChangeTransitionSettings?: (next: TransitionSettings) => void;
  onSelectPreset?: (
    presetName: string,
    presetParams: Partial<CameraParameters>
  ) => void;
  onPlayTransition?: () => void;
}

export const ControlSidebar: React.FC<ControlSidebarProps> = ({
  params,
  onChange,
  transitionSettings = DEFAULT_TRANSITION_SETTINGS,
  onChangeTransitionSettings,
  onSelectPreset,
  onPlayTransition,
}) => {
  const paneMountRef = useRef<HTMLDivElement | null>(null);
  const paneInstanceRef = useRef<Pane | null>(null);
  const mutableStateRef = useRef<CameraParameters>({
    ...DEFAULT_CAMERA_PARAMS,
    ...params,
  });
  const mutableTransitionRef = useRef<TransitionSettings>({
    ...DEFAULT_TRANSITION_SETTINGS,
    ...transitionSettings,
  });
  const isExternalSyncRef = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onChangeTransitionRef = useRef(onChangeTransitionSettings);
  onChangeTransitionRef.current = onChangeTransitionSettings;
  const onPlayTransitionRef = useRef(onPlayTransition);
  onPlayTransitionRef.current = onPlayTransition;

  useEffect(() => {
    const container = paneMountRef.current;
    if (!container) return;

    container.innerHTML = '';
    const state = Object.assign(
      mutableStateRef.current,
      DEFAULT_CAMERA_PARAMS,
      params
    );
    if (typeof state.pointsDensity !== 'number' || Number.isNaN(state.pointsDensity)) {
      state.pointsDensity = DEFAULT_CAMERA_PARAMS.pointsDensity;
    }

    const pane = new Pane({
      container,
      title: 'CAMERA CONTROLS',
      expanded: true,
    });
    paneInstanceRef.current = pane;

    const notifyChange = () => {
      if (isExternalSyncRef.current) return;
      onChangeRef.current({ ...state });
    };

    // Required 7 Camera Parameter Sliders (exact specification labels)
    pane
      .addBinding(state, 'cameraHeight', {
        label: 'Camera height m',
        min: 1,
        max: 80,
        step: 0.5,
      })
      .on('change', notifyChange);

    pane
      .addBinding(state, 'pitch', {
        label: 'Pitch °',
        min: -60,
        max: 60,
        step: 1,
      })
      .on('change', notifyChange);

    pane
      .addBinding(state, 'turn', {
        label: 'Turn °',
        min: -180,
        max: 180,
        step: 1,
      })
      .on('change', notifyChange);

    pane
      .addBinding(state, 'fov', {
        label: 'Field of view °',
        min: 15,
        max: 110,
        step: 1,
      })
      .on('change', notifyChange);

    pane
      .addBinding(state, 'lookAhead', {
        label: 'Look ahead m',
        min: 5,
        max: 200,
        step: 1,
      })
      .on('change', notifyChange);

    pane
      .addBinding(state, 'cameraAlong', {
        label: 'Camera along %',
        min: 0,
        max: 100,
        step: 0.5,
      })
      .on('change', notifyChange);

    pane
      .addBinding(state, 'cameraSide', {
        label: 'Camera side %',
        min: -100,
        max: 100,
        step: 1,
      })
      .on('change', notifyChange);

    // Object & Building Details Folder (Windows, Balconies, Architectural Ornaments, Points & Detail Density)
    const buildingFolder = pane.addFolder({
      title: 'OBJECT & BUILDING DETAILS',
      expanded: true,
    });

    buildingFolder
      .addBinding(state, 'windowDensity', {
        label: 'Windows %',
        min: 0,
        max: 100,
        step: 1,
      })
      .on('change', notifyChange);

    buildingFolder
      .addBinding(state, 'balconyDensity', {
        label: 'Balconies %',
        min: 0,
        max: 100,
        step: 1,
      })
      .on('change', notifyChange);

    buildingFolder
      .addBinding(state, 'buildingDetail', {
        label: 'Architecture %',
        min: 0,
        max: 100,
        step: 1,
      })
      .on('change', notifyChange);

    buildingFolder
      .addBinding(state, 'pointsDensity', {
        label: 'Object details %',
        min: 0,
        max: 100,
        step: 1,
      })
      .on('change', notifyChange);

    // Plotter Pen & Ink Mechanics Folder
    const penFolder = pane.addFolder({
      title: 'PLOTTER PEN & INK',
      expanded: true,
    });

    penFolder
      .addBinding(state, 'lineWeight', {
        label: 'Line weight px',
        min: 0.4,
        max: 5.0,
        step: 0.1,
      })
      .on('change', notifyChange);

    penFolder
      .addBinding(state, 'manualSketch', {
        label: 'Manual draw %',
        min: 0,
        max: 100,
        step: 1,
      })
      .on('change', notifyChange);

    penFolder
      .addBinding(state, 'lineJitter', {
        label: 'Line jitter %',
        min: 0,
        max: 100,
        step: 1,
      })
      .on('change', notifyChange);

    penFolder
      .addBinding(state, 'cornerOvershoot', {
        label: 'Overshoot %',
        min: 0,
        max: 100,
        step: 1,
      })
      .on('change', notifyChange);

    penFolder
      .addBinding(state, 'inkPooling', {
        label: 'Ink pooling %',
        min: 0,
        max: 100,
        step: 1,
      })
      .on('change', notifyChange);

    penFolder
      .addBinding(state, 'inkDropout', {
        label: 'Ink dropout %',
        min: 0,
        max: 100,
        step: 1,
      })
      .on('change', notifyChange);

    penFolder
      .addBinding(state, 'sketchPasses', {
        label: 'Sketch passes',
        min: 1,
        max: 4,
        step: 1,
      })
      .on('change', notifyChange);

    // Surface Shading, Paper & Multi-Pen Folder
    const styleFolder = pane.addFolder({
      title: 'SHADING, PAPER & MULTI-PEN',
      expanded: true,
    });

    styleFolder
      .addBinding(state, 'paperTheme', {
        label: 'Paper theme',
        options: {
          'Cream Graph': 'cream',
          'Cyanotype Blueprint': 'blueprint',
          'Dark CAD Terminal': 'terminal',
          'Sepia Vellum': 'vellum',
        },
      })
      .on('change', notifyChange);

    styleFolder
      .addBinding(state, 'renderMode', {
        label: 'Method',
        options: {
          'M1: Hidden-Line Edges': 'edges-occluded',
          'M1: Pure Wireframe': 'edges-wireframe',
          'M2: Sobel Shader': 'sobel-post',
        },
      })
      .on('change', notifyChange);

    styleFolder
      .addBinding(state, 'hatchDensity', {
        label: 'Cross-hatch %',
        min: 0,
        max: 100,
        step: 1,
      })
      .on('change', notifyChange);

    styleFolder
      .addBinding(state, 'stippleShade', {
        label: 'Stipple dots %',
        min: 0,
        max: 100,
        step: 1,
      })
      .on('change', notifyChange);

    styleFolder
      .addBinding(state, 'penMisregistration', {
        label: '2-Pen offset px',
        min: 0,
        max: 8,
        step: 0.2,
      })
      .on('change', notifyChange);

    styleFolder
      .addBinding(state, 'distantGradient', {
        label: 'Distant gradient',
      })
      .on('change', notifyChange);

    styleFolder
      .addBinding(state, 'showTargetMarker', {
        label: 'Target reticle',
      })
      .on('change', notifyChange);

    styleFolder
      .addBinding(state, 'animateScene', {
        label: 'Live traffic',
      })
      .on('change', notifyChange);

    // Lens & Atmospheric Depth Folder
    const lensFolder = pane.addFolder({
      title: 'LENS & DEPTH FX',
      expanded: true,
    });

    lensFolder
      .addBinding(state, 'orthoBlend', {
        label: 'Ortho blend %',
        min: 0,
        max: 100,
        step: 1,
      })
      .on('change', notifyChange);

    lensFolder
      .addBinding(state, 'lensCurvature', {
        label: 'Lens curve %',
        min: -100,
        max: 100,
        step: 1,
      })
      .on('change', notifyChange);

    lensFolder
      .addBinding(state, 'depthTaper', {
        label: 'Depth taper %',
        min: 0,
        max: 100,
        step: 1,
      })
      .on('change', notifyChange);

    lensFolder
      .addBinding(state, 'dofBlur', {
        label: 'Focus blur %',
        min: 0,
        max: 100,
        step: 1,
      })
      .on('change', notifyChange);

    // Transition Animation Visualization Folder
    const transitionState = mutableTransitionRef.current;
    const notifyTransitionChange = () => {
      if (isExternalSyncRef.current) return;
      onChangeTransitionRef.current?.({ ...transitionState });
    };

    const transitionFolder = pane.addFolder({
      title: 'TRANSITION ANIMATION',
      expanded: true,
    });

    transitionFolder
      .addBinding(transitionState, 'showTrajectory3D', {
        label: '3D flight path',
      })
      .on('change', notifyTransitionChange);

    transitionFolder
      .addBinding(transitionState, 'observerMode', {
        label: 'Observer rig',
      })
      .on('change', notifyTransitionChange);

    transitionFolder
      .addBinding(transitionState, 'duration', {
        label: 'Duration s',
        min: 0.4,
        max: 8.0,
        step: 0.1,
      })
      .on('change', notifyTransitionChange);

    transitionFolder
      .addBinding(transitionState, 'easing', {
        label: 'Easing curve',
        options: {
          'Cubic In-Out': 'easeInOutCubic',
          'Quart Out': 'easeOutQuart',
          'Sine In-Out': 'easeInOutSine',
          'Spring Overshoot': 'overshoot',
          Linear: 'linear',
        },
      })
      .on('change', notifyTransitionChange);

    transitionFolder
      .addBinding(transitionState, 'loop', {
        label: 'Loop A→B',
      })
      .on('change', notifyTransitionChange);

    const playTransitionBtn = transitionFolder.addButton({
      title: '▶ Animate Transition (A → B)',
    });
    playTransitionBtn.on('click', () => {
      onPlayTransitionRef.current?.();
    });

    const printBtn = pane.addButton({
      title: '🖨 Print Plotter Drawing',
    });
    printBtn.on('click', () => {
      window.dispatchEvent(new CustomEvent('plotter:print'));
    });

    const resetBtn = pane.addButton({
      title: 'Reset to Default View',
    });
    resetBtn.on('click', () => {
      Object.assign(state, {
        ...DEFAULT_CAMERA_PARAMS,
        renderMode: state.renderMode,
        animateScene: state.animateScene,
        showTargetMarker: state.showTargetMarker,
        distantGradient: state.distantGradient,
        lineWeight: state.lineWeight,
        manualSketch: state.manualSketch,
        lineJitter: state.lineJitter,
      });
      isExternalSyncRef.current = true;
      pane.refresh();
      isExternalSyncRef.current = false;
      onChangeRef.current({ ...state });
    });

    return () => {
      pane.dispose();
      paneInstanceRef.current = null;
    };
  }, []);

  // Sync external preset / animation updates into Tweakpane
  useEffect(() => {
    Object.assign(mutableStateRef.current, DEFAULT_CAMERA_PARAMS, params);
    if (
      typeof mutableStateRef.current.pointsDensity !== 'number' ||
      Number.isNaN(mutableStateRef.current.pointsDensity)
    ) {
      mutableStateRef.current.pointsDensity =
        DEFAULT_CAMERA_PARAMS.pointsDensity;
    }
    Object.assign(mutableTransitionRef.current, transitionSettings);
    if (paneInstanceRef.current) {
      isExternalSyncRef.current = true;
      paneInstanceRef.current.refresh();
      isExternalSyncRef.current = false;
    }
  }, [params, transitionSettings]);

  const computed = computeCameraTransform(params, DEFAULT_STREET_BOUNDS);

  const applyPreset = (
    presetName: string,
    presetParams: Partial<CameraParameters>
  ) => {
    if (onSelectPreset) {
      onSelectPreset(presetName, presetParams);
      return;
    }
    onChange({
      ...params,
      ...presetParams,
    });
  };

  return (
    <aside className="left-panel" aria-label="Plotter Camera Controls">
      <header className="sidebar-header">
        <div className="plotter-badge">DWG // PLT-04</div>
        <h1 className="sidebar-title">Plotter Sketchpad</h1>
        <p className="sidebar-subtitle">
          Street Canyon — Wireframe Perspective Rig
        </p>
      </header>

      <div className="tweakpane-host" ref={paneMountRef} />

      <section className="presets-section" aria-label="Camera View Presets">
        <h2 className="section-label">VIEWPORT PRESETS</h2>
        <div className="presets-grid">
          {CAMERA_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              className="preset-button"
              title={preset.description}
              onClick={() => applyPreset(preset.name, preset.params)}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </section>

      <section className="telemetry-section" aria-label="Camera Telemetry">
        <h2 className="section-label">CAMERA TELEMETRY</h2>
        <dl className="telemetry-grid">
          <div>
            <dt>POS (X, Y, Z)</dt>
            <dd>
              {computed.position.x.toFixed(1)}m,{' '}
              {computed.position.y.toFixed(1)}m,{' '}
              {computed.position.z.toFixed(1)}m
            </dd>
          </div>
          <div>
            <dt>LOOK-AT TARGET</dt>
            <dd>
              {computed.target.x.toFixed(1)}m, {computed.target.y.toFixed(1)}m,{' '}
              {computed.target.z.toFixed(1)}m
            </dd>
          </div>
          <div>
            <dt>FACADE & DETAIL</dt>
            <dd>
              WIN {params.windowDensity}% · BAL {params.balconyDensity}% · ARCH{' '}
              {params.buildingDetail}% · PTS {params.pointsDensity}%
            </dd>
          </div>
          <div>
            <dt>PEN / OPTICS</dt>
            <dd>
              {params.lineWeight.toFixed(1)}px · JITTER {params.lineJitter}% ·
              FOV {computed.fov}°
            </dd>
          </div>
        </dl>
      </section>
    </aside>
  );
};
