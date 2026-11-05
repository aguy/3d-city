import * as THREE from 'three';
import {
  CameraParameters,
  DEFAULT_STREET_BOUNDS,
  EasingType,
  StreetBounds,
} from '../types/cameraTypes';
import {
  ComputedCameraTransform,
  computeCameraTransform,
} from './cameraController';
import { createPlotterSegments } from './plotterMaterial';

export interface TransitionSample {
  /** Normalized linear time [0..1] */
  t: number;
  /** Eased interpolation factor */
  easedT: number;
  /** Instantaneous velocity (dp/dt) */
  velocity: number;
  /** Interpolated camera parameters at this sample */
  params: CameraParameters;
  /** World-space transform at this sample */
  transform: ComputedCameraTransform;
}

/**
 * Evaluates a normalized easing function for t in [0, 1].
 */
export function evaluateEasing(easing: EasingType, t: number): number {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  switch (easing) {
    case 'linear':
      return x;
    case 'easeInOutSine':
      return -(Math.cos(Math.PI * x) - 1) / 2;
    case 'easeOutQuart':
      return 1 - Math.pow(1 - x, 4);
    case 'overshoot': {
      const c1 = 1.70158;
      const c2 = c1 * 1.525;
      return x < 0.5
        ? (Math.pow(2 * x, 2) * ((c2 + 1) * 2 * x - c2)) / 2
        : (Math.pow(2 * x - 2, 2) * ((c2 + 1) * (x * 2 - 2) + c2) + 2) / 2;
    }
    case 'easeInOutCubic':
    default:
      return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }
}

/**
 * Computes the numerical derivative dp/dt of the easing curve at time t in [0, 1].
 */
export function evaluateEasingVelocity(easing: EasingType, t: number): number {
  const eps = 0.002;
  const t0 = Math.max(0, t - eps);
  const t1 = Math.min(1, t + eps);
  const dt = Math.max(1e-5, t1 - t0);
  return (evaluateEasing(easing, t1) - evaluateEasing(easing, t0)) / dt;
}

/**
 * Smoothly interpolates the 7 camera pose parameters between `from` and `to` using `easedT`,
 * while preserving the active `styleSource` (renderMode, animateScene, showTargetMarker,
 * lineWeight, lineJitter, and building details) so animating never reverts the user's rendering method.
 */
export function interpolateCameraParams(
  from: CameraParameters,
  to: CameraParameters,
  easedT: number,
  styleSource: CameraParameters = to
): CameraParameters {
  const lerp = (a: number, b: number) => a + (b - a) * easedT;

  return {
    ...styleSource,
    cameraHeight: Number(lerp(from.cameraHeight, to.cameraHeight).toFixed(2)),
    pitch: Number(lerp(from.pitch, to.pitch).toFixed(2)),
    turn: Number(lerp(from.turn, to.turn).toFixed(2)),
    fov: Number(lerp(from.fov, to.fov).toFixed(2)),
    lookAhead: Number(lerp(from.lookAhead, to.lookAhead).toFixed(2)),
    cameraAlong: Number(lerp(from.cameraAlong, to.cameraAlong).toFixed(2)),
    cameraSide: Number(lerp(from.cameraSide, to.cameraSide).toFixed(2)),
  };
}

/**
 * Samples the transition trajectory across `sampleCount` uniform time steps in [0, 1].
 */
export function sampleTransitionTrajectory(
  from: CameraParameters,
  to: CameraParameters,
  easing: EasingType,
  sampleCount = 24,
  bounds: StreetBounds = DEFAULT_STREET_BOUNDS
): TransitionSample[] {
  const steps = Math.max(2, sampleCount);
  const samples: TransitionSample[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const easedT = evaluateEasing(easing, t);
    const velocity = evaluateEasingVelocity(easing, t);
    const params = interpolateCameraParams(from, to, easedT);
    const transform = computeCameraTransform(params, bounds);
    samples.push({
      t,
      easedT,
      velocity,
      params,
      transform,
    });
  }

  return samples;
}

/**
 * Computes the world-space orientation quaternion of the camera for a given parameter set.
 */
export function computeCameraOrientation(
  transform: ComputedCameraTransform
): THREE.Quaternion {
  const tempCam = new THREE.PerspectiveCamera(transform.fov, 1.6, 0.5, 500);
  tempCam.position.copy(transform.position);
  tempCam.up.set(0, 1, 0);
  tempCam.lookAt(transform.target);

  const euler = new THREE.Euler().setFromQuaternion(tempCam.quaternion, 'YXZ');
  euler.x = THREE.MathUtils.clamp(
    euler.x + transform.pitchRad,
    -Math.PI / 2 + 0.01,
    Math.PI / 2 - 0.01
  );
  euler.y -= transform.turnRad;
  tempCam.rotation.copy(euler);

  return tempCam.quaternion.clone();
}

/**
 * Generates line-segment vertex pairs representing a 3D wireframe camera frustum & rig body
 * positioned and oriented at `transform`.
 */
export function buildCameraFrustumSegments(
  transform: ComputedCameraTransform,
  frustumLength = 3.2,
  includeBodyBox = false
): THREE.Vector3[] {
  const quat = computeCameraOrientation(transform);
  const origin = transform.position;

  const halfFovRad = THREE.MathUtils.degToRad(
    THREE.MathUtils.clamp(transform.fov, 15, 110) * 0.5
  );
  const halfH = Math.tan(halfFovRad) * frustumLength;
  const halfW = halfH * 1.45; // 1.45 aspect ratio cone representation

  const toWorld = (x: number, y: number, z: number) =>
    new THREE.Vector3(x, y, z).applyQuaternion(quat).add(origin);

  const cTL = toWorld(-halfW, halfH, -frustumLength);
  const cTR = toWorld(halfW, halfH, -frustumLength);
  const cBR = toWorld(halfW, -halfH, -frustumLength);
  const cBL = toWorld(-halfW, -halfH, -frustumLength);

  const pts: THREE.Vector3[] = [
    // 4 pyramid rays from camera nodal point to far frame corners
    origin.clone(),
    cTL,
    origin.clone(),
    cTR,
    origin.clone(),
    cBR,
    origin.clone(),
    cBL,
    // Far frame rectangle
    cTL,
    cTR,
    cTR,
    cBR,
    cBR,
    cBL,
    cBL,
    cTL,
  ];

  // Up-vector orientation chevron above top edge of frustum frame
  const upApex = toWorld(0, halfH * 1.35, -frustumLength);
  pts.push(cTL, upApex, upApex, cTR);

  if (includeBodyBox) {
    // Plotter camera chassis box behind nodal point
    const bw = 0.65;
    const bh = 0.48;
    const bd = 1.1;
    const b000 = toWorld(-bw, -bh, 0);
    const b100 = toWorld(bw, -bh, 0);
    const b110 = toWorld(bw, bh, 0);
    const b010 = toWorld(-bw, bh, 0);
    const b001 = toWorld(-bw, -bh, bd);
    const b101 = toWorld(bw, -bh, bd);
    const b111 = toWorld(bw, bh, bd);
    const b011 = toWorld(-bw, bh, bd);

    pts.push(
      b000,
      b100,
      b100,
      b110,
      b110,
      b010,
      b010,
      b000,
      b001,
      b101,
      b101,
      b111,
      b111,
      b011,
      b011,
      b001,
      b000,
      b001,
      b100,
      b101,
      b110,
      b111,
      b010,
      b011
    );

    // Crosshair inside far frustum frame
    const midTop = toWorld(0, halfH, -frustumLength);
    const midBot = toWorld(0, -halfH, -frustumLength);
    const midLeft = toWorld(-halfW, 0, -frustumLength);
    const midRight = toWorld(halfW, 0, -frustumLength);
    pts.push(midTop, midBot, midLeft, midRight);
  }

  return pts;
}

/**
 * Helper to create dashed 3D line segments between two points.
 */
function buildDashedLinePoints(
  start: THREE.Vector3,
  end: THREE.Vector3,
  dashCount = 12
): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < dashCount; i++) {
    const t0 = i / dashCount;
    const t1 = (i + 0.55) / dashCount;
    pts.push(
      new THREE.Vector3().lerpVectors(start, end, t0),
      new THREE.Vector3().lerpVectors(start, end, t1)
    );
  }
  return pts;
}

/**
 * Helper to create a 3D wireframe diamond marker at a world position.
 */
function buildMarkerDiamondPoints(
  center: THREE.Vector3,
  radius = 0.7
): THREE.Vector3[] {
  const px = new THREE.Vector3(center.x + radius, center.y, center.z);
  const nx = new THREE.Vector3(center.x - radius, center.y, center.z);
  const py = new THREE.Vector3(center.x, center.y + radius, center.z);
  const ny = new THREE.Vector3(center.x, center.y - radius, center.z);
  const pz = new THREE.Vector3(center.x, center.y, center.z + radius);
  const nz = new THREE.Vector3(center.x, center.y, center.z - radius);

  return [
    px,
    py,
    py,
    nx,
    nx,
    ny,
    ny,
    px,
    pz,
    py,
    py,
    nz,
    nz,
    ny,
    ny,
    pz,
    px,
    pz,
    pz,
    nx,
    nx,
    nz,
    nz,
    px,
  ];
}

export interface TransitionVisualizerUpdateOptions {
  fromParams: CameraParameters;
  toParams: CameraParameters;
  currentParams: CameraParameters;
  progressT: number;
  easing: EasingType;
  visible: boolean;
  observerMode: boolean;
  bounds?: StreetBounds;
}

/**
 * Creates a reusable 3D Group for rendering the camera transition trajectory,
 * eased time-step ticks, ghost camera frustums, target motion path, and live camera rig.
 */
export function createTransitionVisualizerGroup(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'TransitionVisualizerGroup';
  return group;
}

/**
 * Rebuilds the 3D transition trajectory and frustum geometry whenever keyframe endpoints,
 * easing curve, or current transition progress updates.
 */
export function updateTransitionVisualizerGroup(
  group: THREE.Group,
  options: TransitionVisualizerUpdateOptions
): void {
  const {
    fromParams,
    toParams,
    currentParams,
    easing,
    visible,
    observerMode,
    bounds = DEFAULT_STREET_BOUNDS,
  } = options;

  group.visible = visible;
  if (!visible) return;

  // Dispose existing child geometries before rebuilding
  while (group.children.length > 0) {
    const child = group.children[0];
    group.remove(child);
    if (child instanceof THREE.LineSegments) {
      child.geometry.dispose();
    }
  }

  const samples = sampleTransitionTrajectory(
    fromParams,
    toParams,
    easing,
    32,
    bounds
  );

  const primaryPoints: THREE.Vector3[] = [];
  const secondaryPoints: THREE.Vector3[] = [];

  // 1. Continuous 3D Camera Trajectory Curve + Street Ground Projection Drop-Lines
  for (let i = 0; i < samples.length - 1; i++) {
    const p0 = samples[i].transform.position;
    const p1 = samples[i + 1].transform.position;
    primaryPoints.push(p0, p1);

    // Target trajectory on the street plane
    const t0 = samples[i].transform.target;
    const t1 = samples[i + 1].transform.target;
    secondaryPoints.push(
      new THREE.Vector3(t0.x, 0.14, t0.z),
      new THREE.Vector3(t1.x, 0.14, t1.z)
    );
  }

  // 2. Uniform Time-Step Velocity Ticks (t = 0, 1/8, 2/8, ..., 1)
  // Spacing between ticks in 3D space directly visualizes the easing curve acceleration!
  const tickCount = 12;
  for (let i = 0; i <= tickCount; i++) {
    const t = i / tickCount;
    const easedT = evaluateEasing(easing, t);
    const sampleParams = interpolateCameraParams(fromParams, toParams, easedT);
    const tf = computeCameraTransform(sampleParams, bounds);
    const pos = tf.position;

    // Cross-tick perpendicular to street & vertical drop pin to street level
    const tickSize = i === 0 || i === tickCount ? 0.85 : 0.42;
    primaryPoints.push(
      new THREE.Vector3(pos.x - tickSize, pos.y, pos.z),
      new THREE.Vector3(pos.x + tickSize, pos.y, pos.z),
      new THREE.Vector3(pos.x, pos.y - tickSize, pos.z),
      new THREE.Vector3(pos.x, pos.y + tickSize, pos.z)
    );

    // Vertical height reference line down to the street at quarter intervals
    if (i % 3 === 0) {
      secondaryPoints.push(
        ...buildDashedLinePoints(
          pos,
          new THREE.Vector3(pos.x, 0.08, pos.z),
          6
        )
      );
      // Sightline ray from sampled camera position to its corresponding look-ahead target
      secondaryPoints.push(
        ...buildDashedLinePoints(
          pos,
          new THREE.Vector3(tf.target.x, 0.14, tf.target.z),
          10
        )
      );
    }
  }

  // 3. Start (Keyframe A) & End (Keyframe B) Frustums + Intermediate Ghost Frustums
  const startTransform = samples[0].transform;
  const endTransform = samples[samples.length - 1].transform;

  primaryPoints.push(...buildCameraFrustumSegments(startTransform, 3.0, false));
  primaryPoints.push(...buildCameraFrustumSegments(endTransform, 3.4, false));
  primaryPoints.push(...buildMarkerDiamondPoints(startTransform.position, 0.55));
  primaryPoints.push(...buildMarkerDiamondPoints(endTransform.position, 0.65));

  // Start & End target markers on the street
  primaryPoints.push(
    ...buildMarkerDiamondPoints(
      new THREE.Vector3(startTransform.target.x, 0.16, startTransform.target.z),
      0.8
    ),
    ...buildMarkerDiamondPoints(
      new THREE.Vector3(endTransform.target.x, 0.16, endTransform.target.z),
      0.95
    )
  );

  // Intermediate ghost frustums at t = 0.33 and t = 0.66
  for (const ghostT of [0.33, 0.67]) {
    const easedGhost = evaluateEasing(easing, ghostT);
    const ghostParams = interpolateCameraParams(
      fromParams,
      toParams,
      easedGhost
    );
    const ghostTf = computeCameraTransform(ghostParams, bounds);
    secondaryPoints.push(...buildCameraFrustumSegments(ghostTf, 2.2, false));
  }

  // 4. Current Active Camera Rig & Live Sightline Beam
  const currentTransform = computeCameraTransform(currentParams, bounds);
  const currentTargetGround = new THREE.Vector3(
    currentTransform.target.x,
    0.16,
    currentTransform.target.z
  );

  if (observerMode) {
    // In Observer Mode, draw the full 3D animated camera chassis, FOV cone, and laser sightline
    primaryPoints.push(
      ...buildCameraFrustumSegments(currentTransform, 4.8, true)
    );
    primaryPoints.push(
      ...buildDashedLinePoints(
        currentTransform.position,
        currentTargetGround,
        14
      )
    );
    primaryPoints.push(
      ...buildMarkerDiamondPoints(currentTransform.position, 0.75)
    );
  }

  if (primaryPoints.length > 0) {
    const primarySegs = createPlotterSegments(primaryPoints, 'primary');
    primarySegs.userData.alwaysVisibleInSobel = true;
    group.add(primarySegs);
  }
  if (secondaryPoints.length > 0) {
    const secondarySegs = createPlotterSegments(secondaryPoints, 'secondary');
    secondarySegs.userData.alwaysVisibleInSobel = true;
    group.add(secondarySegs);
  }
}

/**
 * Positions the Three.js camera at an elevated architectural 3/4 observer vantage point
 * so the user can watch the 3D camera rig and FOV frustum animate along the transition path.
 */
export function applyObserverCamera(
  camera: THREE.PerspectiveCamera,
  fromParams: CameraParameters,
  toParams: CameraParameters,
  currentParams: CameraParameters,
  bounds: StreetBounds = DEFAULT_STREET_BOUNDS
): ComputedCameraTransform {
  const fromTf = computeCameraTransform(fromParams, bounds);
  const toTf = computeCameraTransform(toParams, bounds);
  const curTf = computeCameraTransform(currentParams, bounds);

  // Compute bounding midpoint of the active transition path and look-ahead targets
  const minZ = Math.min(fromTf.position.z, toTf.position.z, curTf.target.z);
  const maxZ = Math.max(fromTf.position.z, toTf.position.z);
  const midZ = (minZ + maxZ) * 0.5;
  const spanZ = Math.max(35, maxZ - minZ);

  const maxY = Math.max(fromTf.position.y, toTf.position.y, 18);

  // Place observer camera at an elevated 3/4 perspective looking into the street canyon
  const observerPos = new THREE.Vector3(
    13.5,
    Math.min(72, Math.max(34, maxY * 1.15 + 14)),
    Math.min(bounds.startZ + 25, maxZ + Math.max(28, spanZ * 0.35))
  );

  const lookCenter = new THREE.Vector3(
    (fromTf.position.x + toTf.position.x) * 0.35,
    Math.max(6, maxY * 0.38),
    midZ
  );

  camera.position.copy(observerPos);
  camera.up.set(0, 1, 0);
  camera.lookAt(lookCenter);

  if (camera.fov !== 48) {
    camera.fov = 48;
    camera.updateProjectionMatrix();
  }

  return curTf;
}
