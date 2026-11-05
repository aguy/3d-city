import * as THREE from 'three';
import { createPlotterMesh, createPlotterSegments } from './plotterMaterial';
import { SceneDescriptor } from '../types/scenePromptTypes';

const Z_START = 170;
const Z_END = -250;
const ROAD_LENGTH = Z_START - Z_END;
const ROAD_CENTER_Z = (Z_START + Z_END) / 2;
const INTERSECTION_Z = [105, 35, -35, -105, -175];

function createStreetLamp(side: -1 | 1, z: number, offsetDist = 8.4): THREE.Group {
  const lamp = new THREE.Group();
  const poleX = side * offsetDist;

  const baseGeo = new THREE.BoxGeometry(0.36, 0.7, 0.36);
  baseGeo.translate(poleX, 0.35, z);
  lamp.add(createPlotterMesh(baseGeo, { inkWeight: 'secondary' }));

  const mastGeo = new THREE.BoxGeometry(0.14, 6.2, 0.14);
  mastGeo.translate(poleX, 3.45, z);
  lamp.add(createPlotterMesh(mastGeo, { inkWeight: 'secondary' }));

  const armLength = 2.1;
  const armGeo = new THREE.BoxGeometry(armLength, 0.12, 0.12);
  armGeo.translate(poleX - side * (armLength / 2), 6.5, z);
  lamp.add(createPlotterMesh(armGeo, { inkWeight: 'secondary' }));

  const headGeo = new THREE.BoxGeometry(0.65, 0.16, 0.34);
  headGeo.translate(poleX - side * armLength, 6.42, z);
  lamp.add(createPlotterMesh(headGeo, { inkWeight: 'primary' }));

  // Diagonal support strut (micro-detail)
  const strutLines: THREE.Vector3[] = [
    new THREE.Vector3(poleX, 5.2, z),
    new THREE.Vector3(poleX - side * 1.2, 6.42, z),
  ];
  const strutSegs = createPlotterSegments(strutLines, 'secondary');
  strutSegs.userData.pointsThreshold = 30;
  lamp.add(strutSegs);

  return lamp;
}

function createStreetTree(x: number, z: number, scale = 1.0): THREE.Group {
  const tree = new THREE.Group();

  const trunkGeo = new THREE.CylinderGeometry(0.18 * scale, 0.28 * scale, 3.2 * scale, 6);
  trunkGeo.translate(x, 1.6 * scale, z);
  tree.add(createPlotterMesh(trunkGeo, { inkWeight: 'secondary' }));

  const foliageGeo1 = new THREE.IcosahedronGeometry(1.65 * scale, 0);
  foliageGeo1.translate(x, 4.0 * scale, z);
  tree.add(createPlotterMesh(foliageGeo1, { inkWeight: 'primary' }));

  const foliageGeo2 = new THREE.IcosahedronGeometry(1.2 * scale, 0);
  foliageGeo2.translate(x, 5.2 * scale, z);
  tree.add(createPlotterMesh(foliageGeo2, { inkWeight: 'secondary' }));

  return tree;
}

function createCanalArchedBridge(z: number, canalWidth: number): THREE.Group {
  const bridge = new THREE.Group();
  const span = canalWidth + 2.5;
  const archH = 2.2;
  const deckW = 3.6;

  // Deck slab
  const deckGeo = new THREE.BoxGeometry(span, 0.35, deckW);
  deckGeo.translate(0, archH, z);
  bridge.add(createPlotterMesh(deckGeo, { inkWeight: 'primary' }));

  // Parapets
  for (const dir of [-1, 1] as const) {
    const railGeo = new THREE.BoxGeometry(span, 0.8, 0.2);
    railGeo.translate(0, archH + 0.45, z + dir * (deckW / 2 - 0.1));
    bridge.add(createPlotterMesh(railGeo, { inkWeight: 'secondary' }));
  }

  // Stone abutments on both sides
  for (const side of [-1, 1] as const) {
    const abutGeo = new THREE.BoxGeometry(2.0, archH + 0.5, deckW + 0.4);
    abutGeo.translate(side * (span / 2), (archH + 0.5) / 2, z);
    bridge.add(createPlotterMesh(abutGeo, { inkWeight: 'primary' }));
  }

  return bridge;
}

function createMonorailTrack(length: number, centerZ: number): THREE.Group {
  const monorail = new THREE.Group();
  const trackY = 10.5;

  // Dual continuous running beams
  for (const xOffset of [-1.8, 1.8]) {
    const beamGeo = new THREE.BoxGeometry(0.8, 1.2, length);
    beamGeo.translate(xOffset, trackY, centerZ);
    monorail.add(createPlotterMesh(beamGeo, { inkWeight: 'primary' }));

    // Safety side rail
    const railGeo = new THREE.BoxGeometry(0.15, 0.4, length);
    railGeo.translate(xOffset, trackY + 0.75, centerZ);
    monorail.add(createPlotterMesh(railGeo, { inkWeight: 'secondary' }));
  }

  // Heavy concrete Y-pylons every 35m
  for (let z = Z_START - 10; z >= Z_END + 10; z -= 35) {
    const pylonGeo = new THREE.BoxGeometry(1.4, trackY - 0.5, 1.4);
    pylonGeo.translate(0, (trackY - 0.5) / 2, z);
    monorail.add(createPlotterMesh(pylonGeo, { inkWeight: 'primary' }));

    // Cantilever crossarm
    const armGeo = new THREE.BoxGeometry(5.6, 0.9, 1.8);
    armGeo.translate(0, trackY - 0.8, z);
    monorail.add(createPlotterMesh(armGeo, { inkWeight: 'primary' }));
  }

  return monorail;
}

export function buildRoadScene(descriptor?: SceneDescriptor): THREE.Group {
  const roadGroup = new THREE.Group();
  roadGroup.name = 'road-scene-group';

  const isCanal = descriptor?.groundType === 'canal-water';
  const isMonorail = descriptor?.groundType === 'monorail-highway' || !!descriptor?.hasMonorailTrack;
  const isBoulevard = descriptor?.groundType === 'boulevard';
  const isNarrowAlley = descriptor?.groundType === 'cobblestone-alley';

  const streetW = descriptor?.streetWidth ?? 16.0;
  const halfStreetW = streetW / 2;
  const sidewalkW = descriptor?.sidewalkWidth ?? 4.2;

  // 1. Primary Ground / Water Plane
  if (isCanal) {
    // Water basin (sunken slightly)
    const waterGeo = new THREE.BoxGeometry(streetW, 0.4, ROAD_LENGTH);
    waterGeo.translate(0, -0.2, ROAD_CENTER_Z);
    roadGroup.add(createPlotterMesh(waterGeo, { surfaceType: 'road' }));

    // Stone quayside embankments on both banks
    for (const side of [-1, 1] as const) {
      const quayX = side * (halfStreetW + sidewalkW / 2);
      const quayGeo = new THREE.BoxGeometry(sidewalkW, 0.6, ROAD_LENGTH);
      quayGeo.translate(quayX, 0.3, ROAD_CENTER_Z);
      roadGroup.add(createPlotterMesh(quayGeo));

      // Quay safety curb
      const curbGeo = new THREE.BoxGeometry(0.3, 0.25, ROAD_LENGTH);
      curbGeo.translate(side * (halfStreetW + 0.15), 0.72, ROAD_CENTER_Z);
      roadGroup.add(createPlotterMesh(curbGeo, { inkWeight: 'primary' }));
    }

    // Arched stone footbridges across the canal
    const bridgeZ = descriptor?.hasCanalBridges ? [80, 0, -80, -160] : [35, -105];
    for (const bz of bridgeZ) {
      roadGroup.add(createCanalArchedBridge(bz, streetW));
    }
  } else {
    // Standard asphalt road, boulevard or cobblestone alley
    const roadGeo = new THREE.BoxGeometry(streetW, 0.1, ROAD_LENGTH);
    roadGeo.translate(0, 0.05, ROAD_CENTER_Z);
    roadGroup.add(createPlotterMesh(roadGeo, { surfaceType: 'road' }));

    // Sidewalks
    for (const side of [-1, 1] as const) {
      const swX = side * (halfStreetW + sidewalkW / 2);
      const swGeo = new THREE.BoxGeometry(sidewalkW, 0.22, ROAD_LENGTH);
      swGeo.translate(swX, 0.11, ROAD_CENTER_Z);
      roadGroup.add(createPlotterMesh(swGeo));

      // Raised street curb
      const curbGeo = new THREE.BoxGeometry(0.25, 0.12, ROAD_LENGTH);
      curbGeo.translate(side * (halfStreetW + 0.12), 0.28, ROAD_CENTER_Z);
      roadGroup.add(createPlotterMesh(curbGeo, { inkWeight: 'primary' }));
    }

    // Road Markings (lines, dashes) if not a pedestrian cobblestone alley
    if (!isNarrowAlley) {
      const primaryMarkings: THREE.Vector3[] = [];
      const yMark = 0.11;

      // Double yellow centerline
      primaryMarkings.push(
        new THREE.Vector3(-0.14, yMark, Z_START),
        new THREE.Vector3(-0.14, yMark, Z_END),
        new THREE.Vector3(0.14, yMark, Z_START),
        new THREE.Vector3(0.14, yMark, Z_END)
      );

      // Outer lane edge solid markings
      const edgeDist = halfStreetW - 0.4;
      primaryMarkings.push(
        new THREE.Vector3(-edgeDist, yMark, Z_START),
        new THREE.Vector3(-edgeDist, yMark, Z_END),
        new THREE.Vector3(edgeDist, yMark, Z_START),
        new THREE.Vector3(edgeDist, yMark, Z_END)
      );

      roadGroup.add(createPlotterSegments(primaryMarkings, 'primary'));
    }

    // Micro-detail: Sidewalk flagstone paving cuts
    const flagstoneLines: THREE.Vector3[] = [];
    for (let z = Z_START; z >= Z_END; z -= 2.5) {
      for (const side of [-1, 1] as const) {
        const swMinX = side * halfStreetW;
        const swMaxX = side * (halfStreetW + sidewalkW);
        flagstoneLines.push(
          new THREE.Vector3(swMinX, 0.23, z),
          new THREE.Vector3(swMaxX, 0.23, z)
        );
      }
    }
    for (const side of [-1, 1] as const) {
      const swMidX = side * (halfStreetW + sidewalkW * 0.5);
      flagstoneLines.push(
        new THREE.Vector3(swMidX, 0.23, Z_START),
        new THREE.Vector3(swMidX, 0.23, Z_END)
      );
    }
    const flagstoneSegs = createPlotterSegments(flagstoneLines, 'secondary');
    flagstoneSegs.userData.pointsThreshold = 25;
    roadGroup.add(flagstoneSegs);

    // Micro-detail: Crosswalk zebra crossings at intersections
    if (!isNarrowAlley) {
      const crosswalkLines: THREE.Vector3[] = [];
      for (const iz of INTERSECTION_Z) {
        for (let offset = -2.4; offset <= 2.4; offset += 0.8) {
          crosswalkLines.push(
            new THREE.Vector3(-halfStreetW + 0.5, 0.115, iz + offset),
            new THREE.Vector3(halfStreetW - 0.5, 0.115, iz + offset)
          );
        }
      }
      const crosswalkSegs = createPlotterSegments(crosswalkLines, 'secondary');
      crosswalkSegs.userData.pointsThreshold = 20;
      roadGroup.add(crosswalkSegs);

      // Micro-detail: Storm drain inlet grates along curb gutters
      const drainLines: THREE.Vector3[] = [];
      for (let z = Z_START - 15; z >= Z_END + 15; z -= 22) {
        for (const side of [-1, 1] as const) {
          const gx = side * (halfStreetW - 0.5);
          const gz = z;
          drainLines.push(
            new THREE.Vector3(gx - 0.35, 0.112, gz - 0.6),
            new THREE.Vector3(gx + 0.35, 0.112, gz - 0.6),
            new THREE.Vector3(gx + 0.35, 0.112, gz - 0.6),
            new THREE.Vector3(gx + 0.35, 0.112, gz + 0.6),
            new THREE.Vector3(gx + 0.35, 0.112, gz + 0.6),
            new THREE.Vector3(gx - 0.35, 0.112, gz + 0.6),
            new THREE.Vector3(gx - 0.35, 0.112, gz + 0.6),
            new THREE.Vector3(gx - 0.35, 0.112, gz - 0.6)
          );
          for (let b = -0.3; b <= 0.3; b += 0.25) {
            drainLines.push(
              new THREE.Vector3(gx - 0.3, 0.112, gz + b),
              new THREE.Vector3(gx + 0.3, 0.112, gz + b)
            );
          }
        }
      }
      const drainSegs = createPlotterSegments(drainLines, 'secondary');
      drainSegs.userData.pointsThreshold = 35;
      roadGroup.add(drainSegs);

      // Micro-detail: Corner bollards protecting sidewalk corners at intersections
      const bollardLines: THREE.Vector3[] = [];
      for (const iz of INTERSECTION_Z) {
        for (const side of [-1, 1] as const) {
          for (const zOffset of [-4.5, 4.5]) {
            const bx = side * (halfStreetW + 0.35);
            const bz = iz + zOffset;
            bollardLines.push(
              new THREE.Vector3(bx - 0.08, 0.23, bz - 0.08),
              new THREE.Vector3(bx - 0.08, 1.05, bz - 0.08),
              new THREE.Vector3(bx + 0.08, 0.23, bz - 0.08),
              new THREE.Vector3(bx + 0.08, 1.05, bz - 0.08),
              new THREE.Vector3(bx + 0.08, 0.23, bz + 0.08),
              new THREE.Vector3(bx + 0.08, 1.05, bz + 0.08),
              new THREE.Vector3(bx - 0.08, 0.23, bz + 0.08),
              new THREE.Vector3(bx - 0.08, 1.05, bz + 0.08),
              // Cap
              new THREE.Vector3(bx - 0.08, 1.05, bz - 0.08),
              new THREE.Vector3(bx + 0.08, 1.05, bz - 0.08),
              new THREE.Vector3(bx + 0.08, 1.05, bz + 0.08),
              new THREE.Vector3(bx - 0.08, 1.05, bz + 0.08)
            );
          }
        }
      }
      const bollardSegs = createPlotterSegments(bollardLines, 'primary');
      bollardSegs.userData.pointsThreshold = 50;
      roadGroup.add(bollardSegs);
    }
  }

  // 2. Elevated Monorail Structure
  if (isMonorail) {
    roadGroup.add(createMonorailTrack(ROAD_LENGTH, ROAD_CENTER_Z));
  }

  // 3. Street Furniture (Lamps, Trees)
  const allowLamps = (descriptor?.propDensity?.lamps ?? 1.0) > 0;
  if (allowLamps) {
    const lampDist = halfStreetW + 0.6;
    const lampStep = isNarrowAlley ? 16 : isBoulevard ? 20 : 28;
    for (let z = Z_START - 10; z > Z_END + 10; z -= lampStep) {
      const inIntersection = INTERSECTION_Z.some((iz) => Math.abs(z - iz) < 8);
      if (inIntersection && !isCanal) continue;
      roadGroup.add(createStreetLamp(-1, z, lampDist));
      roadGroup.add(createStreetLamp(1, z, lampDist));
    }
  }

  const allowTrees =
    descriptor?.hasTrees !== false &&
    (descriptor?.propDensity?.trees ?? 1.0) > 0 &&
    (descriptor?.hasTrees === true ||
      isBoulevard ||
      (!isCanal && !isNarrowAlley && descriptor?.archetype !== 'open-road'));

  if (allowTrees) {
    const treeDist = halfStreetW + sidewalkW - 1.2;
    for (let z = Z_START - 18; z > Z_END + 14; z -= isBoulevard ? 18 : 28) {
      const inIntersection = INTERSECTION_Z.some((iz) => Math.abs(z - iz) < 9);
      if (inIntersection && !isCanal) continue;
      roadGroup.add(createStreetTree(-treeDist, z, isBoulevard ? 1.25 : 0.95));
      roadGroup.add(createStreetTree(treeDist, z - 5, isBoulevard ? 1.25 : 1.05));
    }
  }

  return roadGroup;
}
