import * as THREE from 'three';
import { createPlotterPoints } from './plotterMaterial';

export interface PointCloudSources {
  road?: THREE.Group;
  buildings?: THREE.Group;
  vehicles?: THREE.Group;
  pedestrians?: THREE.Group;
}

/**
 * Builds a dense, authentic 3D pen-plotter / LIDAR coordinate point cloud from the scene geometry.
 *
 * Points are sampled along:
 * 1. Structural corner vertices & subdivided architectural edges (every ~1.2m)
 * 2. Building facade surfaces, roof planes, and tree foliage volumes
 * 3. Roadway curbs, sidewalk flagstone grids, and street furniture
 *
 * Points are sorted by ascending `threshold` (0.01..0.99) so both GPU vertex culling
 * (`aThreshold > uPointsDensity`) and WebGL `geometry.setDrawRange(0, activeCount)`
 * scale point density smoothly at 60fps from 0% to 100%.
 */
export function buildCityPointCloud(sources: PointCloudSources): THREE.Points {
  const sampledPoints: { pos: THREE.Vector3; threshold: number }[] = [];
  const spatialOccupancy = new Map<string, number>();

  // Deterministic PRNG for reproducible stipple distribution
  let seed = 1234567;
  const pseudoRandom = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  const addPoint = (
    x: number,
    y: number,
    z: number,
    baseThreshold: number,
    spread = 0.25,
    maxPerCell = 3
  ) => {
    const cellSize = 0.48;
    const key = `${Math.floor(x / cellSize)},${Math.floor(y / cellSize)},${Math.floor(z / cellSize)}`;
    const count = spatialOccupancy.get(key) || 0;
    if (count >= maxPerCell) return;
    spatialOccupancy.set(key, count + 1);

    const threshold = THREE.MathUtils.clamp(
      baseThreshold + (pseudoRandom() - 0.5) * spread,
      0.01,
      0.99
    );
    sampledPoints.push({
      pos: new THREE.Vector3(x, y, z),
      threshold,
    });
  };

  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const vLerp = new THREE.Vector3();

  const groups = [
    { group: sources.buildings, weight: 'building' as const },
    { group: sources.road, weight: 'road' as const },
    { group: sources.vehicles, weight: 'vehicle' as const },
    { group: sources.pedestrians, weight: 'pedestrian' as const },
  ];

  for (const { group, weight } of groups) {
    if (!group) continue;
    group.updateMatrixWorld(true);

    group.traverse((obj) => {
      // 1. Sample vertices & subdivided edge intervals from LineSegments
      if (obj instanceof THREE.LineSegments && obj.geometry) {
        const posAttr = obj.geometry.attributes.position;
        if (!posAttr) return;

        const count = posAttr.count;
        const stride = count > 2400 ? 2 : 1;

        for (let i = 0; i + 1 < count; i += 2 * stride) {
          vA.fromBufferAttribute(posAttr, i).applyMatrix4(obj.matrixWorld);
          vB.fromBufferAttribute(posAttr, i + 1).applyMatrix4(obj.matrixWorld);

          let baseThreshold = 0.25;
          if (weight === 'building') {
            baseThreshold = vA.y > 24 ? 0.1 : vA.y > 8 ? 0.24 : 0.35;
          } else if (weight === 'road') {
            baseThreshold = 0.16;
          } else if (weight === 'vehicle') {
            baseThreshold = 0.28;
          }

          // Corner endpoints appear early
          addPoint(vA.x, vA.y, vA.z, baseThreshold * 0.7, 0.16);
          addPoint(vB.x, vB.y, vB.z, baseThreshold * 0.7, 0.16);

          // Subdivide long edges so points form continuous plotter stipple lines along structures
          const segLen = vA.distanceTo(vB);
          if (segLen > 1.1) {
            const steps = Math.min(18, Math.floor(segLen / 1.1));
            for (let s = 1; s < steps; s++) {
              const t = s / steps;
              vLerp.lerpVectors(vA, vB, t);
              // Slight deterministic jitter along edge for natural stipple feel
              const subThresh = THREE.MathUtils.lerp(0.22, 0.88, (s % 4) / 3.5);
              addPoint(vLerp.x, vLerp.y, vLerp.z, subThresh, 0.22);
            }
          }
        }
      }

      // 2. Sample 3D surface stipple points across occluder Meshes (facades, roofs, tree crowns)
      if (
        obj instanceof THREE.Mesh &&
        obj.userData.isOccluder &&
        obj.geometry
      ) {
        const posAttr = obj.geometry.attributes.position;
        const indexAttr = obj.geometry.index;
        if (!posAttr) return;

        const triCount = indexAttr
          ? Math.floor(indexAttr.count / 3)
          : Math.floor(posAttr.count / 3);

        for (let t = 0; t < triCount; t++) {
          const i0 = indexAttr ? indexAttr.getX(t * 3) : t * 3;
          const i1 = indexAttr ? indexAttr.getX(t * 3 + 1) : t * 3 + 1;
          const i2 = indexAttr ? indexAttr.getX(t * 3 + 2) : t * 3 + 2;

          vA.fromBufferAttribute(posAttr, i0).applyMatrix4(obj.matrixWorld);
          vB.fromBufferAttribute(posAttr, i1).applyMatrix4(obj.matrixWorld);
          vC.fromBufferAttribute(posAttr, i2).applyMatrix4(obj.matrixWorld);

          // Compute triangle area via cross product
          const edge1 = new THREE.Vector3().subVectors(vB, vA);
          const edge2 = new THREE.Vector3().subVectors(vC, vA);
          const cross = new THREE.Vector3().crossVectors(edge1, edge2);
          const area = 0.5 * cross.length();

          if (area < 0.4) continue;

          // Offset slightly along face normal so surface stipples sit proud of the occluder face
          const normal = cross.normalize();
          const numSamples =
            weight === 'road'
              ? Math.min(18, Math.floor(area / 45))
              : Math.min(28, Math.floor(area / 6.5));

          for (let s = 0; s < numSamples; s++) {
            let r1 = pseudoRandom();
            let r2 = pseudoRandom();
            if (r1 + r2 > 1) {
              r1 = 1 - r1;
              r2 = 1 - r2;
            }
            const r3 = 1 - r1 - r2;

            const px = vA.x * r1 + vB.x * r2 + vC.x * r3 + normal.x * 0.08;
            const py = vA.y * r1 + vB.y * r2 + vC.y * r3 + normal.y * 0.08;
            const pz = vA.z * r1 + vB.z * r2 + vC.z * r3 + normal.z * 0.08;

            const surfThreshold = 0.35 + pseudoRandom() * 0.62;
            addPoint(px, py, pz, surfThreshold, 0.15, 2);
          }
        }
      }
    });
  }

  // 3. Add dense street-level architectural survey grid & sidewalk stipple coordinates
  const roadZStart = 165;
  const roadZEnd = -245;
  for (let z = roadZStart; z >= roadZEnd; z -= 2.0) {
    // Sidewalk paving stipple rows
    for (const side of [-1, 1] as const) {
      addPoint(side * 8.2, 0.3, z, 0.12, 0.12);
      addPoint(side * 9.5, 0.25, z, 0.28, 0.18);
      addPoint(side * 10.8, 0.25, z, 0.46, 0.22);
      addPoint(side * 11.8, 0.25, z, 0.68, 0.22);
    }
    // Roadway lane & centerline coordinate stipples
    addPoint(0, 0.14, z, 0.2, 0.15);
    addPoint(-3.8, 0.14, z, 0.48, 0.25);
    addPoint(3.8, 0.14, z, 0.48, 0.25);
    addPoint(-7.4, 0.14, z, 0.34, 0.2);
    addPoint(7.4, 0.14, z, 0.34, 0.2);
  }

  // Sort points by ascending threshold so geometry.setDrawRange(0, count) reveals points progressively
  sampledPoints.sort((a, b) => a.threshold - b.threshold);

  const totalPoints = sampledPoints.length;
  const positions = new Float32Array(totalPoints * 3);
  const thresholds = new Float32Array(totalPoints);

  for (let i = 0; i < totalPoints; i++) {
    const pt = sampledPoints[i];
    positions[i * 3 + 0] = pt.pos.x;
    positions[i * 3 + 1] = pt.pos.y;
    positions[i * 3 + 2] = pt.pos.z;
    thresholds[i] = pt.threshold;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aThreshold', new THREE.BufferAttribute(thresholds, 1));

  return createPlotterPoints(geometry);
}

/**
 * Updates the active draw range and visibility of the 3D city point cloud
 * according to `pointsDensity` (0..100%).
 */
export function updatePointCloudDensity(
  points: THREE.Points,
  pointsDensity: number
): void {
  const posAttr = points.geometry.attributes.position;
  if (!posAttr) return;
  const clamped = THREE.MathUtils.clamp(pointsDensity, 0, 100);
  const activeCount = Math.floor((clamped / 100) * posAttr.count);
  points.geometry.setDrawRange(0, activeCount);
  points.visible = activeCount > 0;
}
