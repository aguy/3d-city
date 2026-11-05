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

  // Diagonal support strut & lantern cage (micro-detail)
  const strutLines: THREE.Vector3[] = [
    new THREE.Vector3(poleX, 5.1, z),
    new THREE.Vector3(poleX - side * 1.35, 6.44, z),
    new THREE.Vector3(poleX, 5.5, z),
    new THREE.Vector3(poleX - side * 0.9, 6.44, z),
    // Lantern drop cage
    new THREE.Vector3(poleX - side * armLength - 0.22, 6.34, z - 0.12),
    new THREE.Vector3(poleX - side * armLength, 6.02, z),
    new THREE.Vector3(poleX - side * armLength + 0.22, 6.34, z - 0.12),
    new THREE.Vector3(poleX - side * armLength, 6.02, z),
    new THREE.Vector3(poleX - side * armLength - 0.22, 6.34, z + 0.12),
    new THREE.Vector3(poleX - side * armLength, 6.02, z),
    new THREE.Vector3(poleX - side * armLength + 0.22, 6.34, z + 0.12),
    new THREE.Vector3(poleX - side * armLength, 6.02, z),
  ];
  const strutSegs = createPlotterSegments(strutLines, 'secondary');
  strutSegs.userData.pointsThreshold = 30;
  strutSegs.userData.alwaysVisibleInSobel = true;
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

  // Tree pit sidewalk grate & inner branch arbor (micro-detail)
  const grateR = 0.85 * scale;
  const wy = 0.245;
  const treeDetailLines: THREE.Vector3[] = [
    new THREE.Vector3(x - grateR, wy, z - grateR),
    new THREE.Vector3(x + grateR, wy, z - grateR),
    new THREE.Vector3(x + grateR, wy, z - grateR),
    new THREE.Vector3(x + grateR, wy, z + grateR),
    new THREE.Vector3(x + grateR, wy, z + grateR),
    new THREE.Vector3(x - grateR, wy, z + grateR),
    new THREE.Vector3(x - grateR, wy, z + grateR),
    new THREE.Vector3(x - grateR, wy, z - grateR),
    new THREE.Vector3(x - grateR, wy, z),
    new THREE.Vector3(x + grateR, wy, z),
    new THREE.Vector3(x, wy, z - grateR),
    new THREE.Vector3(x, wy, z + grateR),
    // Inner branches radiating into canopy
    new THREE.Vector3(x, 2.2 * scale, z),
    new THREE.Vector3(x - 1.1 * scale, 3.9 * scale, z - 0.8 * scale),
    new THREE.Vector3(x, 2.2 * scale, z),
    new THREE.Vector3(x + 1.1 * scale, 3.9 * scale, z + 0.8 * scale),
    new THREE.Vector3(x, 2.4 * scale, z),
    new THREE.Vector3(x + 0.9 * scale, 4.2 * scale, z - 0.9 * scale),
    new THREE.Vector3(x, 2.4 * scale, z),
    new THREE.Vector3(x - 0.9 * scale, 4.2 * scale, z + 0.9 * scale),
  ];
  const treeDetailSegs = createPlotterSegments(treeDetailLines, 'secondary');
  treeDetailSegs.userData.pointsThreshold = 35;
  treeDetailSegs.userData.alwaysVisibleInSobel = true;
  tree.add(treeDetailSegs);

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

    // Micro-detail: Sidewalk flagstone paving cuts & curb block joints
    const flagstoneLines: THREE.Vector3[] = [];
    for (let z = Z_START; z >= Z_END; z -= 2.2) {
      for (const side of [-1, 1] as const) {
        const swMinX = side * halfStreetW;
        const swMaxX = side * (halfStreetW + sidewalkW);
        flagstoneLines.push(
          new THREE.Vector3(swMinX, 0.245, z),
          new THREE.Vector3(swMaxX, 0.245, z),
          // Curb riser joint
          new THREE.Vector3(side * (halfStreetW + 0.12), 0.12, z),
          new THREE.Vector3(side * (halfStreetW + 0.12), 0.35, z)
        );
      }
    }
    for (const side of [-1, 1] as const) {
      for (const frac of [0.33, 0.67]) {
        const swMidX = side * (halfStreetW + sidewalkW * frac);
        flagstoneLines.push(
          new THREE.Vector3(swMidX, 0.245, Z_START),
          new THREE.Vector3(swMidX, 0.245, Z_END)
        );
      }
    }
    const flagstoneSegs = createPlotterSegments(flagstoneLines, 'secondary');
    flagstoneSegs.userData.pointsThreshold = 22;
    flagstoneSegs.userData.alwaysVisibleInSobel = true;
    roadGroup.add(flagstoneSegs);

    // Micro-detail: Crosswalk zebra crossings & stop bars at intersections
    if (!isNarrowAlley) {
      const crosswalkLines: THREE.Vector3[] = [];
      for (const iz of INTERSECTION_Z) {
        // Longitudinal zebra bars across the street
        for (let x = -halfStreetW + 0.8; x <= halfStreetW - 0.8; x += 0.9) {
          crosswalkLines.push(
            new THREE.Vector3(x - 0.2, 0.14, iz - 2.6),
            new THREE.Vector3(x - 0.2, 0.14, iz + 2.6),
            new THREE.Vector3(x + 0.2, 0.14, iz - 2.6),
            new THREE.Vector3(x + 0.2, 0.14, iz + 2.6),
            new THREE.Vector3(x - 0.2, 0.14, iz - 2.6),
            new THREE.Vector3(x + 0.2, 0.14, iz - 2.6),
            new THREE.Vector3(x - 0.2, 0.14, iz + 2.6),
            new THREE.Vector3(x + 0.2, 0.14, iz + 2.6)
          );
        }
        // Stop bars before & after crosswalk
        crosswalkLines.push(
          new THREE.Vector3(-halfStreetW + 0.5, 0.14, iz - 3.4),
          new THREE.Vector3(halfStreetW - 0.5, 0.14, iz - 3.4),
          new THREE.Vector3(-halfStreetW + 0.5, 0.14, iz + 3.4),
          new THREE.Vector3(halfStreetW - 0.5, 0.14, iz + 3.4)
        );
      }
      const crosswalkSegs = createPlotterSegments(crosswalkLines, 'primary');
      crosswalkSegs.userData.pointsThreshold = 15;
      crosswalkSegs.userData.alwaysVisibleInSobel = true;
      roadGroup.add(crosswalkSegs);

      // Micro-detail: Dashed intermediate lane dividers & utility manholes
      const laneAndManholeLines: THREE.Vector3[] = [];
      const laneX = halfStreetW * 0.48;
      for (let z = Z_START - 4; z >= Z_END + 4; z -= 6.5) {
        for (const side of [-1, 1] as const) {
          laneAndManholeLines.push(
            new THREE.Vector3(side * laneX, 0.14, z),
            new THREE.Vector3(side * laneX, 0.14, z - 3.2)
          );
        }
      }
      for (let z = Z_START - 15; z >= Z_END + 15; z -= 20) {
        // Roadway utility manhole octagon + inner grid
        const mr = 0.65;
        const mx = (z % 40 === 0 ? 1 : -1) * 1.9;
        laneAndManholeLines.push(
          new THREE.Vector3(mx - mr, 0.14, z - mr),
          new THREE.Vector3(mx + mr, 0.14, z - mr),
          new THREE.Vector3(mx + mr, 0.14, z - mr),
          new THREE.Vector3(mx + mr, 0.14, z + mr),
          new THREE.Vector3(mx + mr, 0.14, z + mr),
          new THREE.Vector3(mx - mr, 0.14, z + mr),
          new THREE.Vector3(mx - mr, 0.14, z + mr),
          new THREE.Vector3(mx - mr, 0.14, z - mr),
          new THREE.Vector3(mx - mr, 0.14, z),
          new THREE.Vector3(mx + mr, 0.14, z),
          new THREE.Vector3(mx, 0.14, z - mr),
          new THREE.Vector3(mx, 0.14, z + mr)
        );
        for (const side of [-1, 1] as const) {
          const gx = side * (halfStreetW - 0.55);
          const gz = z;
          laneAndManholeLines.push(
            new THREE.Vector3(gx - 0.35, 0.14, gz - 0.65),
            new THREE.Vector3(gx + 0.35, 0.14, gz - 0.65),
            new THREE.Vector3(gx + 0.35, 0.14, gz - 0.65),
            new THREE.Vector3(gx + 0.35, 0.14, gz + 0.65),
            new THREE.Vector3(gx + 0.35, 0.14, gz + 0.65),
            new THREE.Vector3(gx - 0.35, 0.14, gz + 0.65),
            new THREE.Vector3(gx - 0.35, 0.14, gz + 0.65),
            new THREE.Vector3(gx - 0.35, 0.14, gz - 0.65)
          );
          for (let b = -0.35; b <= 0.35; b += 0.22) {
            laneAndManholeLines.push(
              new THREE.Vector3(gx - 0.3, 0.14, gz + b),
              new THREE.Vector3(gx + 0.3, 0.14, gz + b)
            );
          }
        }
      }
      const drainSegs = createPlotterSegments(laneAndManholeLines, 'secondary');
      drainSegs.userData.pointsThreshold = 38;
      drainSegs.userData.alwaysVisibleInSobel = true;
      roadGroup.add(drainSegs);

      // Micro-detail: Corner bollards & overhead intersection traffic signal gantries
      const bollardAndGantryLines: THREE.Vector3[] = [];
      for (const iz of INTERSECTION_Z) {
        // Overhead traffic signal truss gantry spanning the street at intersection
        const gY1 = 5.8;
        const gY2 = 6.35;
        const gX = halfStreetW + 0.45;
        const gz = iz - 4.2;
        bollardAndGantryLines.push(
          // Left & right support columns
          new THREE.Vector3(-gX, 0.24, gz),
          new THREE.Vector3(-gX, gY2, gz),
          new THREE.Vector3(gX, 0.24, gz),
          new THREE.Vector3(gX, gY2, gz),
          // Top and bottom gantry chords
          new THREE.Vector3(-gX, gY1, gz),
          new THREE.Vector3(gX, gY1, gz),
          new THREE.Vector3(-gX, gY2, gz),
          new THREE.Vector3(gX, gY2, gz)
        );
        // Truss diagonals & hanging signal heads
        for (let x = -gX; x < gX; x += 2.0) {
          const nextX = Math.min(gX, x + 2.0);
          bollardAndGantryLines.push(
            new THREE.Vector3(x, gY1, gz),
            new THREE.Vector3(nextX, gY2, gz),
            new THREE.Vector3(x, gY2, gz),
            new THREE.Vector3(nextX, gY1, gz)
          );
        }
        for (const sigX of [-halfStreetW * 0.45, 0, halfStreetW * 0.45]) {
          bollardAndGantryLines.push(
            new THREE.Vector3(sigX - 0.25, gY1 - 0.85, gz),
            new THREE.Vector3(sigX + 0.25, gY1 - 0.85, gz),
            new THREE.Vector3(sigX + 0.25, gY1 - 0.85, gz),
            new THREE.Vector3(sigX + 0.25, gY1, gz),
            new THREE.Vector3(sigX + 0.25, gY1, gz),
            new THREE.Vector3(sigX - 0.25, gY1, gz),
            new THREE.Vector3(sigX - 0.25, gY1, gz),
            new THREE.Vector3(sigX - 0.25, gY1 - 0.85, gz)
          );
        }

        for (const side of [-1, 1] as const) {
          for (const zOffset of [-4.5, -3.2, 3.2, 4.5]) {
            const bx = side * (halfStreetW + 0.35);
            const bz = iz + zOffset;
            bollardAndGantryLines.push(
              new THREE.Vector3(bx - 0.09, 0.24, bz - 0.09),
              new THREE.Vector3(bx - 0.09, 1.1, bz - 0.09),
              new THREE.Vector3(bx + 0.09, 0.24, bz - 0.09),
              new THREE.Vector3(bx + 0.09, 1.1, bz - 0.09),
              new THREE.Vector3(bx + 0.09, 0.24, bz + 0.09),
              new THREE.Vector3(bx + 0.09, 1.1, bz + 0.09),
              new THREE.Vector3(bx - 0.09, 0.24, bz + 0.09),
              new THREE.Vector3(bx - 0.09, 1.1, bz + 0.09),
              new THREE.Vector3(bx - 0.09, 1.1, bz - 0.09),
              new THREE.Vector3(bx + 0.09, 1.1, bz - 0.09),
              new THREE.Vector3(bx + 0.09, 1.1, bz + 0.09),
              new THREE.Vector3(bx - 0.09, 1.1, bz + 0.09)
            );
          }
        }
      }
      const bollardSegs = createPlotterSegments(bollardAndGantryLines, 'primary');
      bollardSegs.userData.pointsThreshold = 55;
      bollardSegs.userData.alwaysVisibleInSobel = true;
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
