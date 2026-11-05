import * as THREE from 'three';
import { createPlotterMesh, createPlotterSegments } from './plotterMaterial';

const Z_START = 170;
const Z_END = -250;
const ROAD_LENGTH = Z_START - Z_END;
const ROAD_CENTER_Z = (Z_START + Z_END) / 2;
const INTERSECTION_Z = [105, 35, -35, -105, -175];

function createStreetLamp(side: -1 | 1, z: number): THREE.Group {
  const lamp = new THREE.Group();
  const poleX = side * 8.4;

  // Pole base & vertical mast
  const baseGeo = new THREE.BoxGeometry(0.36, 0.7, 0.36);
  baseGeo.translate(poleX, 0.35, z);
  lamp.add(createPlotterMesh(baseGeo, { inkWeight: 'secondary' }));

  const mastGeo = new THREE.BoxGeometry(0.14, 6.2, 0.14);
  mastGeo.translate(poleX, 3.45, z);
  lamp.add(createPlotterMesh(mastGeo, { inkWeight: 'secondary' }));

  // Cantilever arm reaching over the roadway
  const armLength = 2.1;
  const armGeo = new THREE.BoxGeometry(armLength, 0.12, 0.12);
  armGeo.translate(poleX - side * (armLength / 2), 6.5, z);
  lamp.add(createPlotterMesh(armGeo, { inkWeight: 'secondary' }));

  // Luminaire head
  const headGeo = new THREE.BoxGeometry(0.65, 0.16, 0.34);
  headGeo.translate(poleX - side * armLength, 6.42, z);
  lamp.add(createPlotterMesh(headGeo, { inkWeight: 'primary' }));

  return lamp;
}

function createTrafficSignalGantry(z: number): THREE.Group {
  const gantry = new THREE.Group();
  const height = 6.8;
  const span = 17.2;

  for (const side of [-1, 1] as const) {
    const postGeo = new THREE.BoxGeometry(0.26, height, 0.26);
    postGeo.translate(side * (span / 2), height / 2, z);
    gantry.add(createPlotterMesh(postGeo, { inkWeight: 'primary' }));
  }

  // Horizontal overhead truss beam
  const beamGeo = new THREE.BoxGeometry(span + 0.3, 0.28, 0.28);
  beamGeo.translate(0, height - 0.2, z);
  gantry.add(createPlotterMesh(beamGeo, { inkWeight: 'primary' }));

  // Signal heads over lanes
  for (const laneX of [-5.5, -2.0, 2.0, 5.5]) {
    const boxGeo = new THREE.BoxGeometry(0.42, 1.15, 0.28);
    boxGeo.translate(laneX, height - 0.65, z);
    gantry.add(createPlotterMesh(boxGeo, { inkWeight: 'primary' }));
  }

  return gantry;
}

function createStreetTree(x: number, z: number, scale = 1): THREE.Group {
  const tree = new THREE.Group();

  // Planter curb box
  const planterGeo = new THREE.BoxGeometry(1.3, 0.25, 1.3);
  planterGeo.translate(x, 0.32, z);
  tree.add(createPlotterMesh(planterGeo, { inkWeight: 'secondary' }));

  // Trunk
  const trunkH = 2.4 * scale;
  const trunkGeo = new THREE.BoxGeometry(0.22, trunkH, 0.22);
  trunkGeo.translate(x, 0.22 + trunkH / 2, z);
  tree.add(createPlotterMesh(trunkGeo, { inkWeight: 'secondary' }));

  // Low-poly architectural tiered canopy
  const lowerCanopy = new THREE.OctahedronGeometry(1.35 * scale, 0);
  lowerCanopy.scale(1, 1.25, 1);
  lowerCanopy.translate(x, 0.22 + trunkH + 1.0 * scale, z);
  tree.add(
    createPlotterMesh(lowerCanopy, {
      thresholdAngle: 8,
      inkWeight: 'secondary',
    })
  );

  const upperCanopy = new THREE.OctahedronGeometry(0.95 * scale, 0);
  upperCanopy.scale(1, 1.2, 1);
  upperCanopy.translate(x, 0.22 + trunkH + 2.1 * scale, z);
  tree.add(
    createPlotterMesh(upperCanopy, {
      thresholdAngle: 8,
      inkWeight: 'secondary',
    })
  );

  return tree;
}

export function buildRoadScene(): THREE.Group {
  const roadGroup = new THREE.Group();
  roadGroup.name = 'RoadAndSidewalks';

  // 1. Main roadway surface (X: -8m to +8m)
  const roadGeo = new THREE.BoxGeometry(16, 0.12, ROAD_LENGTH);
  roadGeo.translate(0, -0.06, ROAD_CENTER_Z);
  roadGroup.add(
    createPlotterMesh(roadGeo, {
      surfaceType: 'road',
      inkWeight: 'primary',
    })
  );

  // 2. Raised sidewalks on both sides (X: -12.2..-8 and +8..+12.2) with intersection gaps
  const zStops = [Z_START, ...INTERSECTION_Z, Z_END];
  for (let i = 0; i < zStops.length - 1; i++) {
    const segStart = zStops[i] - (i === 0 ? 0 : 6);
    const segEnd = zStops[i + 1] + (i === zStops.length - 2 ? 0 : 6);
    const segLen = segStart - segEnd;
    const segMidZ = (segStart + segEnd) / 2;

    if (segLen <= 2) continue;

    for (const side of [-1, 1] as const) {
      const swGeo = new THREE.BoxGeometry(4.2, 0.24, segLen);
      swGeo.translate(side * 10.1, 0.12, segMidZ);
      roadGroup.add(
        createPlotterMesh(swGeo, {
          surfaceType: 'road',
          inkWeight: 'primary',
        })
      );
    }
  }

  // 3. Road markings, lane dividers, sidewalk paving grid, and zebra crosswalks
  const primaryMarkings: THREE.Vector3[] = [];
  const secondaryMarkings: THREE.Vector3[] = [];
  const yMark = 0.025;

  // Double center line (interrupted at intersections)
  for (let z = Z_START - 2; z > Z_END + 2; z -= 2) {
    const inIntersection = INTERSECTION_Z.some((iz) => Math.abs(z - iz) < 7);
    if (!inIntersection) {
      for (const offset of [-0.14, 0.14]) {
        primaryMarkings.push(
          new THREE.Vector3(offset, yMark, z),
          new THREE.Vector3(offset, yMark, z - 2)
        );
      }
    }
  }

  // Dashed lane lines at X = -4m and X = +4m + Rectangular dashed lane boxes
  for (let z = Z_START - 4; z > Z_END + 4; z -= 8) {
    const inIntersection = INTERSECTION_Z.some((iz) => Math.abs(z - iz) < 8);
    if (inIntersection) continue;

    for (const laneX of [-4, 4]) {
      const dashLen = 3.8;
      const halfW = 0.08;
      primaryMarkings.push(
        new THREE.Vector3(laneX - halfW, yMark, z),
        new THREE.Vector3(laneX + halfW, yMark, z),
        new THREE.Vector3(laneX + halfW, yMark, z),
        new THREE.Vector3(laneX + halfW, yMark, z - dashLen),
        new THREE.Vector3(laneX + halfW, yMark, z - dashLen),
        new THREE.Vector3(laneX - halfW, yMark, z - dashLen),
        new THREE.Vector3(laneX - halfW, yMark, z - dashLen),
        new THREE.Vector3(laneX - halfW, yMark, z)
      );
    }
  }

  // Sidewalk expansion joints every 5m
  for (let z = Z_START; z >= Z_END; z -= 5) {
    const inIntersection = INTERSECTION_Z.some((iz) => Math.abs(z - iz) < 6);
    if (inIntersection) continue;
    for (const side of [-1, 1] as const) {
      secondaryMarkings.push(
        new THREE.Vector3(side * 8.0, 0.25, z),
        new THREE.Vector3(side * 12.2, 0.25, z)
      );
    }
  }

  // Zebra crosswalks & stop bars at every intersection
  for (const iz of INTERSECTION_Z) {
    for (const dir of [-1, 1] as const) {
      const cwZ = iz + dir * 7.2;
      const stopZ = iz + dir * 9.2;

      // Stop bar across approaching lanes
      const stopStartX = dir === 1 ? -7.8 : 0.3;
      const stopEndX = dir === 1 ? -0.3 : 7.8;
      primaryMarkings.push(
        new THREE.Vector3(stopStartX, yMark, stopZ),
        new THREE.Vector3(stopEndX, yMark, stopZ),
        new THREE.Vector3(stopStartX, yMark, stopZ + 0.35),
        new THREE.Vector3(stopEndX, yMark, stopZ + 0.35)
      );

      // Zebra stripes across X (-7.4 to +7.4)
      for (let x = -7.2; x <= 7.2; x += 1.1) {
        const w = 0.48;
        const l = 2.4;
        primaryMarkings.push(
          new THREE.Vector3(x - w / 2, yMark, cwZ - l / 2),
          new THREE.Vector3(x + w / 2, yMark, cwZ - l / 2),
          new THREE.Vector3(x + w / 2, yMark, cwZ - l / 2),
          new THREE.Vector3(x + w / 2, yMark, cwZ + l / 2),
          new THREE.Vector3(x + w / 2, yMark, cwZ + l / 2),
          new THREE.Vector3(x - w / 2, yMark, cwZ + l / 2),
          new THREE.Vector3(x - w / 2, yMark, cwZ + l / 2),
          new THREE.Vector3(x - w / 2, yMark, cwZ - l / 2)
        );
      }
    }

    // Traffic signal gantry at major intersections
    roadGroup.add(createTrafficSignalGantry(iz - 6.5));
  }

  roadGroup.add(createPlotterSegments(primaryMarkings, 'primary'));
  roadGroup.add(createPlotterSegments(secondaryMarkings, 'secondary'));

  // 4. Streetlamps and street trees along both sidewalks
  for (let z = Z_START - 12; z > Z_END + 12; z -= 24) {
    const inIntersection = INTERSECTION_Z.some((iz) => Math.abs(z - iz) < 9);
    if (inIntersection) continue;
    roadGroup.add(createStreetLamp(-1, z));
    roadGroup.add(createStreetLamp(1, z));
  }

  for (let z = Z_START - 22; z > Z_END + 16; z -= 28) {
    const inIntersection = INTERSECTION_Z.some((iz) => Math.abs(z - iz) < 10);
    if (inIntersection) continue;
    roadGroup.add(createStreetTree(-9.2, z, 0.95));
    roadGroup.add(createStreetTree(9.2, z - 6, 1.05));
  }

  return roadGroup;
}
