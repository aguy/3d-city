import React, { useMemo } from 'react';
import {
  CameraParameters,
  EasingType,
  TransitionSettings,
} from '../types/cameraTypes';
import {
  evaluateEasing,
  evaluateEasingVelocity,
} from '../scene/transitionController';

export interface TransitionVisualizerHudProps {
  fromParams: CameraParameters;
  toParams: CameraParameters;
  currentParams: CameraParameters;
  fromLabel: string;
  toLabel: string;
  progressT: number;
  isPlaying: boolean;
  isTouring: boolean;
  settings: TransitionSettings;
  onScrub: (t: number) => void;
  onTogglePlay: () => void;
  onToggleTour: () => void;
  onCaptureFrom: () => void;
  onCaptureTo: () => void;
  onSwapKeyframes: () => void;
  onUpdateSettings: (partial: Partial<TransitionSettings>) => void;
}

const EASING_LABELS: Record<EasingType, string> = {
  easeInOutCubic: 'CUBIC IN-OUT',
  easeOutQuart: 'QUART OUT',
  easeInOutSine: 'SINE IN-OUT',
  overshoot: 'SPRING OVERSHOOT',
  linear: 'LINEAR',
};

export const TransitionVisualizerHud: React.FC<
  TransitionVisualizerHudProps
> = ({
  fromParams,
  toParams,
  currentParams,
  fromLabel,
  toLabel,
  progressT,
  isPlaying,
  isTouring,
  settings,
  onScrub,
  onTogglePlay,
  onToggleTour,
  onCaptureFrom,
  onCaptureTo,
  onSwapKeyframes,
  onUpdateSettings,
}) => {
  const easedT = evaluateEasing(settings.easing, progressT);
  const velocity = evaluateEasingVelocity(settings.easing, progressT);
  const elapsedSec = progressT * settings.duration;

  // Build SVG path and time-tick points for the active easing curve
  const svgGraph = useMemo(() => {
    const width = 148;
    const height = 86;
    const padX = 14;
    const padY = 12;
    const plotW = width - padX * 2;
    const plotH = height - padY * 2;

    const toSvgX = (t: number) => padX + t * plotW;
    const toSvgY = (p: number) => padY + (1 - p) * plotH;

    const samples = 40;
    const pathParts: string[] = [];
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const p = evaluateEasing(settings.easing, t);
      const sx = toSvgX(t).toFixed(1);
      const sy = toSvgY(p).toFixed(1);
      pathParts.push(`${i === 0 ? 'M' : 'L'} ${sx} ${sy}`);
    }

    const ticks: Array<{ x: number; y: number; t: number }> = [];
    const tickSteps = 8;
    for (let i = 0; i <= tickSteps; i++) {
      const t = i / tickSteps;
      const p = evaluateEasing(settings.easing, t);
      ticks.push({ x: toSvgX(t), y: toSvgY(p), t });
    }

    return {
      width,
      height,
      padX,
      padY,
      plotW,
      plotH,
      toSvgX,
      toSvgY,
      curveD: pathParts.join(' '),
      ticks,
    };
  }, [settings.easing]);

  const playheadX = svgGraph.toSvgX(progressT);
  const playheadY = svgGraph.toSvgY(easedT);

  return (
    <section
      className="transition-hud-panel"
      aria-label="Camera Transition Animation Visualizer"
    >
      {/* Left Column: SVG Plotter Easing Curve & Velocity Telemetry */}
      <div className="transition-curve-box">
        <div className="transition-curve-header">
          <span>EASING // {EASING_LABELS[settings.easing]}</span>
          <span>v={velocity.toFixed(2)}x</span>
        </div>
        <svg
          className="transition-curve-svg"
          viewBox={`0 0 ${svgGraph.width} ${svgGraph.height}`}
          role="img"
          aria-label="Transition easing curve graph"
        >
          {/* Plotter grid frame */}
          <rect
            x={svgGraph.padX}
            y={svgGraph.padY}
            width={svgGraph.plotW}
            height={svgGraph.plotH}
            fill="none"
            stroke="#1e1e1c"
            strokeWidth="1"
          />
          {/* Midpoint hairlines */}
          <line
            x1={svgGraph.padX}
            y1={svgGraph.padY + svgGraph.plotH * 0.5}
            x2={svgGraph.padX + svgGraph.plotW}
            y2={svgGraph.padY + svgGraph.plotH * 0.5}
            stroke="rgba(30,30,28,0.2)"
            strokeDasharray="2 2"
            strokeWidth="0.8"
          />
          <line
            x1={svgGraph.padX + svgGraph.plotW * 0.5}
            y1={svgGraph.padY}
            x2={svgGraph.padX + svgGraph.plotW * 0.5}
            y2={svgGraph.padY + svgGraph.plotH}
            stroke="rgba(30,30,28,0.2)"
            strokeDasharray="2 2"
            strokeWidth="0.8"
          />
          {/* Linear reference diagonal */}
          <line
            x1={svgGraph.toSvgX(0)}
            y1={svgGraph.toSvgY(0)}
            x2={svgGraph.toSvgX(1)}
            y2={svgGraph.toSvgY(1)}
            stroke="rgba(30,30,28,0.32)"
            strokeDasharray="3 3"
            strokeWidth="1"
          />
          {/* Easing curve */}
          <path
            d={svgGraph.curveD}
            fill="none"
            stroke="#121212"
            strokeWidth="1.8"
          />
          {/* Sampled uniform time-step ticks along the curve */}
          {svgGraph.ticks.map((pt) => (
            <circle
              key={pt.t}
              cx={pt.x}
              cy={pt.y}
              r="1.7"
              fill="#f8f6f0"
              stroke="#121212"
              strokeWidth="1"
            />
          ))}
          {/* Active playhead crosshair lines */}
          <line
            x1={playheadX}
            y1={svgGraph.padY}
            x2={playheadX}
            y2={svgGraph.padY + svgGraph.plotH}
            stroke="#121212"
            strokeDasharray="2 2"
            strokeWidth="0.9"
          />
          <line
            x1={svgGraph.padX}
            y1={playheadY}
            x2={svgGraph.padX + svgGraph.plotW}
            y2={playheadY}
            stroke="#121212"
            strokeDasharray="2 2"
            strokeWidth="0.9"
          />
          {/* Active playhead marker */}
          <circle
            cx={playheadX}
            cy={playheadY}
            r="3.8"
            fill="#121212"
            stroke="#f8f6f0"
            strokeWidth="1.2"
          />
        </svg>
        <div className="transition-curve-footer">
          <span>
            t={elapsedSec.toFixed(2)}s / {settings.duration.toFixed(1)}s
          </span>
          <span>p={(easedT * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* Center Column: Scrubber, Transport & Mode Controls */}
      <div className="transition-controls-col">
        <div className="transition-route-banner">
          <span className="keyframe-pill">A: {fromLabel}</span>
          <span className="route-arrow">───►</span>
          <span className="keyframe-pill">B: {toLabel}</span>
          {isTouring && <span className="tour-active-badge">AUTO-TOUR</span>}
        </div>

        <div className="transition-scrubber-row">
          <span className="scrubber-end-label">A (0%)</span>
          <input
            type="range"
            min={0}
            max={1000}
            step={1}
            value={Math.round(progressT * 1000)}
            onChange={(e) => onScrub(Number(e.target.value) / 1000)}
            className="transition-scrubber-input"
            aria-label="Scrub transition timeline"
          />
          <span className="scrubber-end-label">
            B ({(progressT * 100).toFixed(0)}%)
          </span>
        </div>

        <div className="transition-buttons-row">
          <button
            type="button"
            className={`plotter-action-btn ${isPlaying && !isTouring ? 'active' : ''}`}
            onClick={onTogglePlay}
          >
            {isPlaying && !isTouring ? '❚❚ PAUSE' : '▶ PLAY A→B'}
          </button>
          <button
            type="button"
            className={`plotter-action-btn ${isTouring ? 'active' : ''}`}
            onClick={onToggleTour}
            title="Cycle smoothly through all 4 viewport camera presets"
          >
            {isTouring ? '◼ STOP TOUR' : '↻ TOUR PRESETS'}
          </button>
          <button
            type="button"
            className="plotter-action-btn"
            onClick={onCaptureFrom}
            title="Capture current camera sliders as Start Keyframe A"
          >
            SET A
          </button>
          <button
            type="button"
            className="plotter-action-btn"
            onClick={onCaptureTo}
            title="Capture current camera sliders as End Keyframe B"
          >
            SET B
          </button>
          <button
            type="button"
            className="plotter-action-btn"
            onClick={onSwapKeyframes}
            title="Swap Start Keyframe A and End Keyframe B"
          >
            A⇄B
          </button>
          <button
            type="button"
            className={`plotter-action-btn ${settings.observerMode ? 'active' : ''}`}
            onClick={() =>
              onUpdateSettings({ observerMode: !settings.observerMode })
            }
            title="Switch to elevated 3/4 Director Observer View to watch the 3D camera rig and FOV frustum animate"
          >
            {settings.observerMode ? '◉ OBSERVER RIG' : '◎ OBSERVER RIG'}
          </button>
          <button
            type="button"
            className={`plotter-action-btn ${settings.showTrajectory3D ? 'active' : ''}`}
            onClick={() =>
              onUpdateSettings({
                showTrajectory3D: !settings.showTrajectory3D,
              })
            }
            title="Toggle 3D camera flight path, velocity ticks, and ghost frustums"
          >
            3D PATH
          </button>
        </div>
      </div>

      {/* Right Column: Live Parameter Interpolation Readout (A -> NOW -> B) */}
      <div className="transition-matrix-col">
        <div className="matrix-header">
          <span>PARAM</span>
          <span>START A</span>
          <span>LIVE</span>
          <span>END B</span>
        </div>
        <div className="matrix-row">
          <span>HEIGHT</span>
          <span>{fromParams.cameraHeight.toFixed(1)}m</span>
          <strong className="matrix-live">
            {currentParams.cameraHeight.toFixed(1)}m
          </strong>
          <span>{toParams.cameraHeight.toFixed(1)}m</span>
        </div>
        <div className="matrix-row">
          <span>ALONG</span>
          <span>{fromParams.cameraAlong.toFixed(0)}%</span>
          <strong className="matrix-live">
            {currentParams.cameraAlong.toFixed(1)}%
          </strong>
          <span>{toParams.cameraAlong.toFixed(0)}%</span>
        </div>
        <div className="matrix-row">
          <span>SIDE</span>
          <span>{fromParams.cameraSide.toFixed(0)}%</span>
          <strong className="matrix-live">
            {currentParams.cameraSide.toFixed(0)}%
          </strong>
          <span>{toParams.cameraSide.toFixed(0)}%</span>
        </div>
        <div className="matrix-row">
          <span>PITCH/TURN</span>
          <span>
            {fromParams.pitch.toFixed(0)}°/{fromParams.turn.toFixed(0)}°
          </span>
          <strong className="matrix-live">
            {currentParams.pitch.toFixed(0)}°/{currentParams.turn.toFixed(0)}°
          </strong>
          <span>
            {toParams.pitch.toFixed(0)}°/{toParams.turn.toFixed(0)}°
          </span>
        </div>
        <div className="matrix-row">
          <span>FOV/LOOK</span>
          <span>
            {fromParams.fov.toFixed(0)}°/{fromParams.lookAhead.toFixed(0)}m
          </span>
          <strong className="matrix-live">
            {currentParams.fov.toFixed(0)}°/{currentParams.lookAhead.toFixed(0)}m
          </strong>
          <span>
            {toParams.fov.toFixed(0)}°/{toParams.lookAhead.toFixed(0)}m
          </span>
        </div>
      </div>
    </section>
  );
};
