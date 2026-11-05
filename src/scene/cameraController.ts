import * as THREE from 'three';
import {
  CameraParameters,
  DEFAULT_STREET_BOUNDS,
  StreetBounds,
} from '../types/cameraTypes';

export interface ComputedCameraTransform {
  position: THREE.Vector3;
  target: THREE.Vector3;
  pitchRad: number;
  turnRad: number;
  fov: number;
}

/**
 * Computes the world-space camera position, look-ahead target vector,
 * and radian rotation offsets from the 7 UI slider parameters.
 */
export function computeCameraTransform(
  params: CameraParameters,
  bounds: StreetBounds = DEFAULT_STREET_BOUNDS
): ComputedCameraTransform {
  // Map Camera side % (-100..100) perpendicular to the street axis (X axis)
  const baseX = (params.cameraSide / 100) * bounds.halfWidthX;

  // Map Camera height m directly to Y position
  const baseY = params.cameraHeight;

  // Map Camera along % (0..100) along the street axis (Z axis)
  const streetLength = bounds.startZ - bounds.endZ;
  const baseZ = bounds.startZ - (params.cameraAlong / 100) * streetLength;

  const position = new THREE.Vector3(baseX, baseY, baseZ);

  // Calculate target vector based on base position plus Look ahead m distance along the street (-Z)
  const target = new THREE.Vector3(
    baseX,
    bounds.targetElevation,
    baseZ - Math.max(1, params.lookAhead)
  );

  // Convert Pitch ° and Turn ° from degrees to radians
  const pitchRad = THREE.MathUtils.degToRad(params.pitch);
  const turnRad = THREE.MathUtils.degToRad(params.turn);

  return {
    position,
    target,
    pitchRad,
    turnRad,
    fov: params.fov,
  };
}

/**
 * Applies the 7 slider parameters to a Three.js PerspectiveCamera within the animation loop.
 */
export function applyCameraParameters(
  camera: THREE.PerspectiveCamera,
  params: CameraParameters,
  bounds: StreetBounds = DEFAULT_STREET_BOUNDS
): ComputedCameraTransform {
  const transform = computeCameraTransform(params, bounds);

  // 1. Position
  camera.position.copy(transform.position);

  // 2. Targeting (base sightline looking at the point Look ahead m down the street)
  camera.up.set(0, 1, 0);
  camera.lookAt(transform.target);

  // 3. Rotation: apply Pitch (X rotation) and Turn (Y rotation) in radians
  const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
  euler.x = THREE.MathUtils.clamp(
    euler.x + transform.pitchRad,
    -Math.PI / 2 + 0.01,
    Math.PI / 2 - 0.01
  );
  euler.y -= transform.turnRad;
  camera.rotation.copy(euler);

  // 4. Field of View & Perspective-to-Orthographic Axonometric Blend
  const orthoBlend = THREE.MathUtils.clamp(
    (params.orthoBlend ?? 0) / 100,
    0,
    1
  );
  const prevOrtho = (camera.userData.lastOrthoBlend as number | undefined) ?? 0;

  if (
    camera.fov !== transform.fov ||
    prevOrtho !== orthoBlend ||
    orthoBlend > 0
  ) {
    camera.fov = transform.fov;
    camera.updateProjectionMatrix();
    camera.userData.lastOrthoBlend = orthoBlend;

    if (orthoBlend > 0) {
      const focalDist = Math.max(10, params.lookAhead);
      const halfH =
        focalDist * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
      const halfW = halfH * (camera.aspect || 1.5);
      const orthoMatrix = new THREE.Matrix4().makeOrthographic(
        -halfW,
        halfW,
        halfH,
        -halfH,
        camera.near,
        camera.far
      );

      const perspEl = camera.projectionMatrix.elements;
      const orthoEl = orthoMatrix.elements;
      for (let i = 0; i < 16; i++) {
        perspEl[i] = perspEl[i] * (1 - orthoBlend) + orthoEl[i] * orthoBlend;
      }
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    }
  }

  return transform;
}
