import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ControlSidebar } from './components/ControlSidebar';
import { StreetViewport } from './components/StreetViewport';
import {
  CAMERA_PRESETS,
  CameraParameters,
  DEFAULT_CAMERA_PARAMS,
  DEFAULT_TRANSITION_SETTINGS,
  TransitionSettings,
} from './types/cameraTypes';
import {
  evaluateEasing,
  interpolateCameraParams,
} from './scene/transitionController';
import './App.css';

const INITIAL_TO_PARAMS: CameraParameters = {
  ...DEFAULT_CAMERA_PARAMS,
  ...CAMERA_PRESETS[1].params,
};

function didCameraPoseChange(
  a: CameraParameters,
  b: CameraParameters
): boolean {
  return (
    a.cameraHeight !== b.cameraHeight ||
    a.pitch !== b.pitch ||
    a.turn !== b.turn ||
    a.fov !== b.fov ||
    a.lookAhead !== b.lookAhead ||
    a.cameraAlong !== b.cameraAlong ||
    a.cameraSide !== b.cameraSide
  );
}

export const App: React.FC = () => {
  const [cameraParams, setCameraParams] = useState<CameraParameters>(
    DEFAULT_CAMERA_PARAMS
  );
  const [fromParams, setFromParams] = useState<CameraParameters>(
    DEFAULT_CAMERA_PARAMS
  );
  const [toParams, setToParams] =
    useState<CameraParameters>(INITIAL_TO_PARAMS);
  const [fromLabel, setFromLabel] = useState<string>(CAMERA_PRESETS[0].name);
  const [toLabel, setToLabel] = useState<string>(CAMERA_PRESETS[1].name);
  const [progressT, setProgressT] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isTouring, setIsTouring] = useState<boolean>(false);
  const [transitionSettings, setTransitionSettings] =
    useState<TransitionSettings>(DEFAULT_TRANSITION_SETTINGS);

  const tourIndexRef = useRef<number>(0);
  const progressRef = useRef<number>(progressT);
  progressRef.current = progressT;

  const cameraParamsRef = useRef<CameraParameters>(cameraParams);
  cameraParamsRef.current = cameraParams;

  const fromParamsRef = useRef<CameraParameters>(fromParams);
  fromParamsRef.current = fromParams;

  const toParamsRef = useRef<CameraParameters>(toParams);
  toParamsRef.current = toParams;

  const settingsRef = useRef<TransitionSettings>(transitionSettings);
  settingsRef.current = transitionSettings;

  // Manual slider adjustments:
  // - If the user moved one of the 7 camera pose sliders, pause active transition playback.
  // - If the user changed renderMode (M1/M2), Live traffic, Line weight/jitter, or Building details,
  //   apply it immediately and keep any active transition animation running in the chosen render mode!
  const handleManualCameraChange = useCallback((next: CameraParameters) => {
    const poseChanged = didCameraPoseChange(cameraParamsRef.current, next);
    if (poseChanged) {
      setIsPlaying(false);
      setIsTouring(false);
    }

    cameraParamsRef.current = next;
    setCameraParams(next);

    // Keep keyframe style metadata aligned with all active plotter, shading, paper, lens & building controls
    const syncStyle = (kf: CameraParameters): CameraParameters => ({
      ...next,
      cameraHeight: kf.cameraHeight,
      pitch: kf.pitch,
      turn: kf.turn,
      fov: kf.fov,
      lookAhead: kf.lookAhead,
      cameraAlong: kf.cameraAlong,
      cameraSide: kf.cameraSide,
    });

    fromParamsRef.current = syncStyle(fromParamsRef.current);
    toParamsRef.current = syncStyle(toParamsRef.current);
    setFromParams(fromParamsRef.current);
    setToParams(toParamsRef.current);
  }, []);

  // Clicking a preset triggers an animated transition from current pose -> preset pose
  const handleSelectPreset = useCallback(
    (presetName: string, presetParams: Partial<CameraParameters>) => {
      const current = cameraParamsRef.current;
      const nextTo: CameraParameters = {
        ...current,
        ...presetParams,
      };
      fromParamsRef.current = current;
      toParamsRef.current = nextTo;
      setFromParams(current);
      setToParams(nextTo);
      setFromLabel('Current Pose');
      setToLabel(presetName);
      setIsTouring(false);

      if (settingsRef.current.animateOnPreset) {
        progressRef.current = 0;
        setProgressT(0);
        setIsPlaying(true);
      } else {
        progressRef.current = 1;
        setProgressT(1);
        setIsPlaying(false);
        cameraParamsRef.current = nextTo;
        setCameraParams(nextTo);
      }
    },
    []
  );

  // Scrubbing the transition timeline manually
  const handleScrub = useCallback((nextT: number) => {
    const clamped = Math.max(0, Math.min(1, nextT));
    setIsPlaying(false);
    setIsTouring(false);
    progressRef.current = clamped;
    setProgressT(clamped);

    const eased = evaluateEasing(settingsRef.current.easing, clamped);
    setCameraParams((prev) => {
      const interpolated = interpolateCameraParams(
        fromParamsRef.current,
        toParamsRef.current,
        eased,
        prev
      );
      cameraParamsRef.current = interpolated;
      return interpolated;
    });
  }, []);

  const handleTogglePlay = useCallback(() => {
    setIsTouring(false);
    setIsPlaying((prev) => {
      const nextPlaying = !prev;
      if (nextPlaying && progressRef.current >= 0.995) {
        progressRef.current = 0;
        setProgressT(0);
      }
      return nextPlaying;
    });
  }, []);

  const handleStartTransitionFromSidebar = useCallback(() => {
    setIsTouring(false);
    progressRef.current = 0;
    setProgressT(0);
    setIsPlaying(true);
  }, []);

  const handleToggleTour = useCallback(() => {
    setIsTouring((prevTour) => {
      const nextTour = !prevTour;
      if (nextTour) {
        const current = cameraParamsRef.current;
        const idx = 0;
        const nextIdx = 1 % CAMERA_PRESETS.length;
        tourIndexRef.current = idx;
        const startP: CameraParameters = {
          ...current,
          ...CAMERA_PRESETS[idx].params,
        };
        const endP: CameraParameters = {
          ...current,
          ...CAMERA_PRESETS[nextIdx].params,
        };
        fromParamsRef.current = startP;
        toParamsRef.current = endP;
        setFromParams(startP);
        setToParams(endP);
        setFromLabel(CAMERA_PRESETS[idx].name);
        setToLabel(CAMERA_PRESETS[nextIdx].name);
        progressRef.current = 0;
        setProgressT(0);
        cameraParamsRef.current = startP;
        setCameraParams(startP);
        setIsPlaying(true);
      } else {
        setIsPlaying(false);
      }
      return nextTour;
    });
  }, []);

  const handleCaptureFrom = useCallback(() => {
    setIsPlaying(false);
    setIsTouring(false);
    const current = { ...cameraParamsRef.current };
    fromParamsRef.current = current;
    setFromParams(current);
    setFromLabel('Custom A');
    progressRef.current = 0;
    setProgressT(0);
  }, []);

  const handleCaptureTo = useCallback(() => {
    setIsPlaying(false);
    setIsTouring(false);
    const current = { ...cameraParamsRef.current };
    toParamsRef.current = current;
    setToParams(current);
    setToLabel('Custom B');
    progressRef.current = 1;
    setProgressT(1);
  }, []);

  const handleSwapKeyframes = useCallback(() => {
    setIsPlaying(false);
    setIsTouring(false);
    const prevFrom = fromParamsRef.current;
    const prevTo = toParamsRef.current;
    fromParamsRef.current = prevTo;
    toParamsRef.current = prevFrom;
    setFromParams(prevTo);
    setToParams(prevFrom);
    setFromLabel(toLabel);
    setToLabel(fromLabel);
    const invertedT = 1 - progressRef.current;
    progressRef.current = invertedT;
    setProgressT(invertedT);
    const eased = evaluateEasing(settingsRef.current.easing, invertedT);
    setCameraParams((prev) => {
      const interpolated = interpolateCameraParams(
        prevTo,
        prevFrom,
        eased,
        prev
      );
      cameraParamsRef.current = interpolated;
      return interpolated;
    });
  }, [fromLabel, toLabel]);

  const handleUpdateTransitionSettings = useCallback(
    (partial: Partial<TransitionSettings>) => {
      setTransitionSettings((prev) => {
        const next = { ...prev, ...partial };
        // If easing changed while paused, update current interpolated camera immediately
        if (partial.easing && !isPlaying) {
          const eased = evaluateEasing(partial.easing, progressRef.current);
          setCameraParams((cur) => {
            const interpolated = interpolateCameraParams(
              fromParamsRef.current,
              toParamsRef.current,
              eased,
              cur
            );
            cameraParamsRef.current = interpolated;
            return interpolated;
          });
        }
        return next;
      });
    },
    [isPlaying]
  );

  // Transition Playback Animation Loop
  useEffect(() => {
    if (!isPlaying) return;

    let rafId = 0;
    let lastTime = performance.now();

    const step = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const duration = Math.max(0.25, settingsRef.current.duration);
      let nextT = progressRef.current + dt / duration;

      if (nextT >= 1) {
        if (isTouring) {
          // Advance to the next preset leg in the tour while preserving current renderMode & styles
          const nextStartIdx =
            (tourIndexRef.current + 1) % CAMERA_PRESETS.length;
          const nextEndIdx = (nextStartIdx + 1) % CAMERA_PRESETS.length;
          tourIndexRef.current = nextStartIdx;

          const activeStyle = cameraParamsRef.current;
          const nextFrom: CameraParameters = {
            ...activeStyle,
            ...CAMERA_PRESETS[nextStartIdx].params,
          };
          const nextTo: CameraParameters = {
            ...activeStyle,
            ...CAMERA_PRESETS[nextEndIdx].params,
          };

          fromParamsRef.current = nextFrom;
          toParamsRef.current = nextTo;
          setFromParams(nextFrom);
          setToParams(nextTo);
          setFromLabel(CAMERA_PRESETS[nextStartIdx].name);
          setToLabel(CAMERA_PRESETS[nextEndIdx].name);
          nextT = 0;
        } else if (settingsRef.current.loop) {
          nextT = nextT % 1;
        } else {
          nextT = 1;
          progressRef.current = 1;
          setProgressT(1);
          const finalEased = evaluateEasing(settingsRef.current.easing, 1);
          setCameraParams((prev) => {
            const interpolated = interpolateCameraParams(
              fromParamsRef.current,
              toParamsRef.current,
              finalEased,
              prev
            );
            cameraParamsRef.current = interpolated;
            return interpolated;
          });
          setIsPlaying(false);
          return;
        }
      }

      progressRef.current = nextT;
      setProgressT(nextT);

      const eased = evaluateEasing(settingsRef.current.easing, nextT);
      setCameraParams((prev) => {
        const interpolated = interpolateCameraParams(
          fromParamsRef.current,
          toParamsRef.current,
          eased,
          prev
        );
        cameraParamsRef.current = interpolated;
        return interpolated;
      });

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, isTouring]);

  return (
    <div className="app-layout">
      <ControlSidebar
        params={cameraParams}
        onChange={handleManualCameraChange}
        transitionSettings={transitionSettings}
        onChangeTransitionSettings={setTransitionSettings}
        onSelectPreset={handleSelectPreset}
        onPlayTransition={handleStartTransitionFromSidebar}
      />
      <StreetViewport
        params={cameraParams}
        fromParams={fromParams}
        toParams={toParams}
        fromLabel={fromLabel}
        toLabel={toLabel}
        progressT={progressT}
        isPlaying={isPlaying}
        isTouring={isTouring}
        transitionSettings={transitionSettings}
        onScrub={handleScrub}
        onTogglePlay={handleTogglePlay}
        onToggleTour={handleToggleTour}
        onCaptureFrom={handleCaptureFrom}
        onCaptureTo={handleCaptureTo}
        onSwapKeyframes={handleSwapKeyframes}
        onUpdateTransitionSettings={handleUpdateTransitionSettings}
      />
    </div>
  );
};

export default App;
