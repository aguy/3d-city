import * as THREE from 'three';
import { createPlotterPoints } from './plotterMaterial';

export interface PointCloudSources {
  road?: THREE.Group;
  buildings?: THREE.Group;
  vehicles?: THREE.Group;
  pedestrians?: THREE.Group;
}

/**
 * Builds an authentic 3D pen-plotter coordinate point cloud from the scene geometry.
 *
 * Points represent structural nodes, corner vertices, and surface stipple coordinates.
 * Each point has an `aThreshold` value (0.0..1.0). The custom points shader
 * discards vertices with `aThreshold > uPointsDensity`, enabling real-time 60fps
 * density scaling via the `Object & points %` slider without rebuilding geometry.
 */
export function buildCityPointCloud(sources: PointCloudSources): THREE.Points {
  const sampledPoints: { pos: THREE.Vector3; threshold: number }[] = [];
  const spatialOccupancy = new Map<string, number>();

  // Deterministic PRNG for reproducible threshold distribution
  let seed = 1234567;
  const pseudoRandom = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  const addPoint = (pos: THREE.Vector3, baseThreshold: number, spread = 0.25) => {
    // Spatial grid downsampling to prevent duplicate vertex clusters at line intersections
    const cellSize = 0.55;
    const key = `${Math.floor(pos.x / cellSize)},${Math.floor(pos.y / cellSize)},${Math.floor(pos.z / cellSize)}`;
    const count = spatialOccupancy.get(key) || 0;
    if (count >= 2) return;
    spatialOccupancy.set(key, count + 1);

    const threshold = THREE.MathUtils.clamp(
      baseThreshold + (pseudoRandom() - 0.5) * spread,
      0.01,
      0.99
    );
    sampledPoints.push({ pos: pos.clone(), threshold });
  };

  const tempV = new THREE.Vector3();

  // 1. Extract vertices from scene groups
  const groups = [
    { group: sources.buildings, weight: 'building' },
    { group: sources.road, weight: 'road' },
    { group: sources.vehicles, weight: 'vehicle' },
    { group: sources.pedestrians, weight: 'pedestrian' },
  ];

  for (const { group, weight } of groups) {
    if (!group) continue;
    group.updateMatrixWorld(true);

    group.traverse((obj) => {
      // Sample vertices from LineSegments (edges, architectural frames)
      if (obj instanceof THREE.LineSegments && obj.geometry) {
        const posAttr = obj.geometry.attributes.position;
        if (!posAttr) return;

        const count = posAttr.count;
        const stride = count > 1200 ? 2 : 1;

        for (let i = 0; i < count; i += 2 * stride) {
          tempV.fromBufferAttribute(posAttr, i);
          tempV.applyMatrix4(obj.matrixWorld);

          let baseThreshold = 0.35;
          if (weight === 'building') {
            // Skyline roof tops appear early
            if (tempV.y > 28) {
              baseThreshold = 0.12;
            } else if (tempV.y > 10) {
              baseThreshold = 0.32;
            } else {
              baseThreshold = 0.5;
            }
          } else if (weight === 'road') {
            baseThreshold = 0.22;
          } else if (weight === 'vehicle') {
            baseThreshold = 0.42;
          }

          addPoint(tempV, baseThreshold, 0.2);

          // Add midpoint for long segments to increase density in higher ranges
          if (i + 1 < count) {
            const tempV2 = new THREE.Vector3().fromBufferAttribute(posAttr, i + 1);
            tempV2.applyMatrix4(obj.matrixWorld);
            if (tempV.distanceTo(tempV2) > 2.2) {
              const mid = new THREE.Vector3().lerpVectors(tempV, tempV2, 0.5);
              addPoint(mid, baseThreshold + 0.3, 0.15);
            }
          }
        }
      }
    });
  }

  // 2. Add ground coordinate ticks along road & sidewalk surfaces
  const roadZStart = 160;
  const roadZEnd = -240;
  for (let z = roadZStart; z >= roadZEnd; z -= 3.5) {
    // Sidewalk coordinate markers
    addPoint(new THREE.Vector3(-9.2, 0.24, z), 0.18, 0.1);
    addPoint(new THREE.Vector3(9.2, 0.24, z), 0.18, 0.1);
    // Curb coordinate markers
    addPoint(new THREE.Vector3(-8.1, 0.29, z), 0.28, 0.15);
    addPoint(new THREE.Vector3(8.1, 0.29, z), 0.28, 0.15);
    // Centerline coordinate dots
    if (Math.abs(z % 7) < 0.1) {
      addPoint(new THREE.Vector3(0, 0.12, z), 0.35, 0.2);
    }
  }

  // 3. Construct Float32BufferAttributes for Points geometry
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
