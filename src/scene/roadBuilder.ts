import * as THREE from 'three';
import {
  createPlotterMesh,
  createPlotterSegments,
  tagObjectDetail,
} from './plotterMaterial';
import { SceneDescriptor } from '../types/scenePromptTypes';

const Z_START = 170;
const Z_END = -250;
const ROAD_LENGTH = Z_START - Z_END;
const ROAD_CENTER_Z = (Z_START + Z_END) / 2;
const INTERSECTION_Z = [105, 35, -35, -105, -175];

function createStreetLamp(
  side: -1 | 1,
  z: number,
  offsetDist = 8.4
): THREE.Group {
  const lamp = new THREE.Group();
  const poleX = side * offsetDist;

  // Base low-poly pedestal, mast, arm, and luminaire head
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

  // --- TIER 1 (18%): 3D Octagonal Cast-Iron Plinth, Finial Spire, Scroll Strut & Hexagonal Lantern ---
  const tier1 = new THREE.Group();
  const plinthGeo = new THREE.CylinderGeometry(0.24, 0.34, 0.85, 8);
  plinthGeo.translate(poleX, 0.42, z);
  tier1.add(
    createPlotterMesh(plinthGeo, { thresholdAngle: 1, inkWeight: 'secondary' })
  );

  const finialGeo = new THREE.ConeGeometry(0.14, 0.48, 8);
  finialGeo.translate(poleX, 6.8, z);
  tier1.add(createPlotterMesh(finialGeo, { thresholdAngle: 1 }));

  const lanternGeo = new THREE.CylinderGeometry(0.26, 0.16, 0.44, 6);
  lanternGeo.translate(poleX - side * armLength, 6.12, z);
  tier1.add(createPlotterMesh(lanternGeo, { thresholdAngle: 1 }));

  const strutLines: THREE.Vector3[] = [
    new THREE.Vector3(poleX, 5.1, z),
    new THREE.Vector3(poleX - side * 1.4, 6.46, z),
    new THREE.Vector3(poleX, 5.55, z),
    new THREE.Vector3(poleX - side * 0.9, 6.46, z),
  ];
  const strutSegs = createPlotterSegments(strutLines, 'secondary');
  strutSegs.userData.alwaysVisibleInSobel = true;
  tier1.add(strutSegs);
  lamp.add(tagObjectDetail(tier1, 18));

  // --- TIER 2 (48%): 3D Mounted Street Banner Frame & Mid-Mast Collar Moldings ---
  const tier2 = new THREE.Group();
  const collarGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.18, 8);
  collarGeo.translate(poleX, 3.2, z);
  tier2.add(createPlotterMesh(collarGeo, { thresholdAngle: 1 }));

  const bannerGeo = new THREE.BoxGeometry(0.58, 1.35, 0.04);
  bannerGeo.translate(poleX + side * 0.38, 4.45, z);
  tier2.add(createPlotterMesh(bannerGeo, { inkWeight: 'secondary' }));
  lamp.add(tagObjectDetail(tier2, 48));

  return lamp;
}

function createStreetTree(x: number, z: number, scale = 1.0): THREE.Group {
  const tree = new THREE.Group();

  // Base Low-Poly Trunk & 2 Icosahedron Level-0 Blobs
  const trunkGeo = new THREE.CylinderGeometry(
    0.18 * scale,
    0.28 * scale,
    3.2 * scale,
    6
  );
  trunkGeo.translate(x, 1.6 * scale, z);
  tree.add(createPlotterMesh(trunkGeo, { inkWeight: 'secondary' }));

  const foliageGeo1 = new THREE.IcosahedronGeometry(1.65 * scale, 0);
  foliageGeo1.translate(x, 4.0 * scale, z);
  tree.add(createPlotterMesh(foliageGeo1, { inkWeight: 'primary' }));

  const foliageGeo2 = new THREE.IcosahedronGeometry(1.2 * scale, 0);
  foliageGeo2.translate(x, 5.2 * scale, z);
  tree.add(createPlotterMesh(foliageGeo2, { inkWeight: 'secondary' }));

  // --- TIER 1 (20%): 3D Cast-Iron Tree Pit Guard Cage & 3D Angled Wooden Boughs ---
  const tier1 = new THREE.Group();
  const curbGuardGeo = new THREE.BoxGeometry(1.5 * scale, 0.22, 1.5 * scale);
  curbGuardGeo.translate(x, 0.32, z);
  tier1.add(createPlotterMesh(curbGuardGeo, { inkWeight: 'secondary' }));

  // 4 Angled 3D primary wooden boughs branching out from upper trunk
  for (const [dx, dz, rotZ, rotX] of [
    [-0.55, -0.45, 0.52, -0.42],
    [0.55, 0.45, -0.52, 0.42],
    [0.55, -0.45, -0.52, -0.42],
    [-0.55, 0.45, 0.52, 0.42],
  ] as const) {
    const boughGeo = new THREE.CylinderGeometry(
      0.07 * scale,
      0.13 * scale,
      1.45 * scale,
      6
    );
    boughGeo.rotateZ(rotZ);
    boughGeo.rotateX(rotX);
    boughGeo.translate(x + dx * scale, 2.85 * scale, z + dz * scale);
    tier1.add(createPlotterMesh(boughGeo, { thresholdAngle: 1 }));
  }
  tree.add(tagObjectDetail(tier1, 20));

  // --- TIER 2 (45%): Multi-Cluster High-Tessellation Geodesic Canopy Lobes (Subdivision 1) ---
  const tier2 = new THREE.Group();
  for (const [lx, ly, lz, rad] of [
    [-0.95, 3.65, -0.65, 1.05],
    [0.95, 3.75, 0.65, 1.05],
    [0.65, 4.65, -0.85, 0.92],
    [-0.65, 4.75, 0.85, 0.92],
  ] as const) {
    const lobeGeo = new THREE.IcosahedronGeometry(rad * scale, 1);
    lobeGeo.translate(x + lx * scale, ly * scale, z + lz * scale);
    tier2.add(
      createPlotterMesh(lobeGeo, { thresholdAngle: 1, inkWeight: 'secondary' })
    );
  }
  tree.add(tagObjectDetail(tier2, 45));

  // --- TIER 3 (75%): Ultra-Dense Geodesic Wireframe Crown Mesh (Subdivision 2) & Tree Grate ---
  const tier3 = new THREE.Group();
  const denseCrownGeo = new THREE.IcosahedronGeometry(1.74 * scale, 2);
  denseCrownGeo.translate(x, 4.15 * scale, z);
  tier3.add(
    createPlotterMesh(denseCrownGeo, {
      thresholdAngle: 1,
      inkWeight: 'secondary',
    })
  );

  const grateR = 0.72 * scale;
  const wy = 0.44;
  const grateLines: THREE.Vector3[] = [];
  for (let o = -grateR; o <= grateR; o += 0.24 * scale) {
    grateLines.push(
      new THREE.Vector3(x - grateR, wy, z + o),
      new THREE.Vector3(x + grateR, wy, z + o),
      new THREE.Vector3(x + o, wy, z - grateR),
      new THREE.Vector3(x + o, wy, z + grateR)
    );
  }
  const grateSegs = createPlotterSegments(grateLines, 'secondary');
  grateSegs.userData.alwaysVisibleInSobel = true;
  tier3.add(grateSegs);
  tree.add(tagObjectDetail(tier3, 75));

  return tree;
}

/**
 * Creates a detailed 3D slatted park bench, 3D fire hydrant, and 3D wire-mesh trash receptacle
 * placed along the sidewalk when Object & Mesh Detail is >= 38%.
 */
function createSidewalkFurnitureCluster(
  side: -1 | 1,
  z: number,
  halfStreetW: number,
  sidewalkW: number
): THREE.Group {
  const cluster = new THREE.Group();
  const benchX = side * (halfStreetW + sidewalkW * 0.58);
  const faceDir = -side;

  // 1. 3D Slatted Park Bench (cast-iron end frames + individual 3D seat & back slats)
  for (const dz of [-0.85, 0.85]) {
    const legGeo = new THREE.BoxGeometry(0.55, 0.46, 0.08);
    legGeo.translate(benchX, 0.45, z + dz);
    cluster.add(createPlotterMesh(legGeo));

    const armGeo = new THREE.BoxGeometry(0.58, 0.26, 0.08);
    armGeo.translate(benchX - faceDir * 0.18, 0.78, z + dz);
    cluster.add(createPlotterMesh(armGeo));
  }
  // 3D Wooden seat & backrest slats
  for (const dx of [-0.18, 0, 0.18]) {
    const slatGeo = new THREE.BoxGeometry(0.12, 0.06, 1.86);
    slatGeo.translate(benchX + dx, 0.68, z);
    cluster.add(createPlotterMesh(slatGeo, { inkWeight: 'secondary' }));
  }
  for (const dy of [0.82, 0.98, 1.14]) {
    const backSlatGeo = new THREE.BoxGeometry(0.06, 0.12, 1.86);
    backSlatGeo.translate(benchX - faceDir * 0.25, dy, z);
    cluster.add(createPlotterMesh(backSlatGeo, { inkWeight: 'secondary' }));
  }

  // 2. 3D Cast-Iron Fire Hydrant near curb (fluted barrel + bonnet dome + side nozzles)
  const hydX = side * (halfStreetW + 0.55);
  const hydZ = z + 2.4;
  const barrelGeo = new THREE.CylinderGeometry(0.16, 0.19, 0.68, 10);
  barrelGeo.translate(hydX, 0.56, hydZ);
  cluster.add(createPlotterMesh(barrelGeo, { thresholdAngle: 1 }));

  const bonnetGeo = new THREE.ConeGeometry(0.18, 0.24, 10);
  bonnetGeo.translate(hydX, 1.02, hydZ);
  cluster.add(createPlotterMesh(bonnetGeo, { thresholdAngle: 1 }));

  const nozzleGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.42, 8);
  nozzleGeo.rotateZ(Math.PI / 2);
  nozzleGeo.translate(hydX, 0.72, hydZ);
  cluster.add(createPlotterMesh(nozzleGeo, { thresholdAngle: 1 }));

  // 3. 3D Cylindrical Wire-Stave Trash Receptacle
  const binX = side * (halfStreetW + 0.65);
  const binZ = z - 1.8;
  const binGeo = new THREE.CylinderGeometry(0.28, 0.24, 0.88, 12);
  binGeo.translate(binX, 0.66, binZ);
  cluster.add(
    createPlotterMesh(binGeo, { thresholdAngle: 1, inkWeight: 'secondary' })
  );

  return cluster;
}

/**
 * Creates a full 3D Overhead Box-Truss Traffic Signal & Directional Sign Gantry
 * spanning the street at intersections when Object & Mesh Detail is >= 60%.
 */
function createTrafficSignalGantry(z: number, halfStreetW: number): THREE.Group {
  const gantry = new THREE.Group();
  const gX = halfStreetW + 0.48;
  const gY = 6.2;

  // Left & Right 3D Vertical Support Columns
  for (const side of [-1, 1] as const) {
    const colGeo = new THREE.CylinderGeometry(0.18, 0.22, gY + 0.3, 10);
    colGeo.translate(side * gX, (gY + 0.3) / 2 + 0.22, z);
    gantry.add(createPlotterMesh(colGeo, { thresholdAngle: 1 }));
  }

  // Upper & Lower 3D Horizontal Truss Chords
  const chordSpan = gX * 2 + 0.4;
  const lowerChordGeo = new THREE.BoxGeometry(chordSpan, 0.16, 0.28);
  lowerChordGeo.translate(0, gY - 0.32, z);
  gantry.add(createPlotterMesh(lowerChordGeo));

  const upperChordGeo = new THREE.BoxGeometry(chordSpan, 0.16, 0.28);
  upperChordGeo.translate(0, gY + 0.32, z);
  gantry.add(createPlotterMesh(upperChordGeo));

  // 3D Highway Directional Signboard & 3-Aspect Traffic Signal Housings
  const signBoardGeo = new THREE.BoxGeometry(4.6, 1.15, 0.12);
  signBoardGeo.translate(0, gY + 0.1, z - 0.22);
  gantry.add(createPlotterMesh(signBoardGeo));

  for (const sigX of [-halfStreetW * 0.55, halfStreetW * 0.55]) {
    const sigBoxGeo = new THREE.BoxGeometry(0.42, 1.05, 0.28);
    sigBoxGeo.translate(sigX, gY - 0.55, z - 0.18);
    gantry.add(createPlotterMesh(sigBoxGeo));
  }

  // Spaceframe diagonal truss web members
  const trussLines: THREE.Vector3[] = [];
  for (let x = -gX; x < gX; x += 1.6) {
    const nx = Math.min(gX, x + 1.6);
    trussLines.push(
      new THREE.Vector3(x, gY - 0.32, z),
      new THREE.Vector3(nx, gY + 0.32, z),
      new THREE.Vector3(x, gY + 0.32, z),
      new THREE.Vector3(nx, gY - 0.32, z)
    );
  }
  const trussSegs = createPlotterSegments(trussLines, 'secondary');
  trussSegs.userData.alwaysVisibleInSobel = true;
  gantry.add(trussSegs);

  return gantry;
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
  const isMonorail =
    descriptor?.groundType === 'monorail-highway' ||
    !!descriptor?.hasMonorailTrack;
  const isBoulevard = descriptor?.groundType === 'boulevard';
  const isNarrowAlley = descriptor?.groundType === 'cobblestone-alley';

  const streetW = descriptor?.streetWidth ?? 16.0;
  const halfStreetW = streetW / 2;
  const sidewalkW = descriptor?.sidewalkWidth ?? 4.2;

  // 1. Primary Ground / Water Plane
  if (isCanal) {
    const waterGeo = new THREE.BoxGeometry(streetW, 0.4, ROAD_LENGTH);
    waterGeo.translate(0, -0.2, ROAD_CENTER_Z);
    roadGroup.add(createPlotterMesh(waterGeo, { surfaceType: 'road' }));

    for (const side of [-1, 1] as const) {
      const quayX = side * (halfStreetW + sidewalkW / 2);
      const quayGeo = new THREE.BoxGeometry(sidewalkW, 0.6, ROAD_LENGTH);
      quayGeo.translate(quayX, 0.3, ROAD_CENTER_Z);
      roadGroup.add(createPlotterMesh(quayGeo));

      const curbGeo = new THREE.BoxGeometry(0.3, 0.25, ROAD_LENGTH);
      curbGeo.translate(side * (halfStreetW + 0.15), 0.72, ROAD_CENTER_Z);
      roadGroup.add(createPlotterMesh(curbGeo, { inkWeight: 'primary' }));
    }

    const bridgeZ = descriptor?.hasCanalBridges
      ? [80, 0, -80, -160]
      : [35, -105];
    for (const bz of bridgeZ) {
      roadGroup.add(createCanalArchedBridge(bz, streetW));
    }
  } else {
    const roadGeo = new THREE.BoxGeometry(streetW, 0.1, ROAD_LENGTH);
    roadGeo.translate(0, 0.05, ROAD_CENTER_Z);
    roadGroup.add(createPlotterMesh(roadGeo, { surfaceType: 'road' }));

    for (const side of [-1, 1] as const) {
      const swX = side * (halfStreetW + sidewalkW / 2);
      const swGeo = new THREE.BoxGeometry(sidewalkW, 0.22, ROAD_LENGTH);
      swGeo.translate(swX, 0.11, ROAD_CENTER_Z);
      roadGroup.add(createPlotterMesh(swGeo));

      const curbGeo = new THREE.BoxGeometry(0.25, 0.12, ROAD_LENGTH);
      curbGeo.translate(side * (halfStreetW + 0.12), 0.28, ROAD_CENTER_Z);
      roadGroup.add(createPlotterMesh(curbGeo, { inkWeight: 'primary' }));
    }

    if (!isNarrowAlley) {
      const primaryMarkings: THREE.Vector3[] = [];
      const yMark = 0.11;

      primaryMarkings.push(
        new THREE.Vector3(-0.14, yMark, Z_START),
        new THREE.Vector3(-0.14, yMark, Z_END),
        new THREE.Vector3(0.14, yMark, Z_START),
        new THREE.Vector3(0.14, yMark, Z_END)
      );

      const edgeDist = halfStreetW - 0.4;
      primaryMarkings.push(
        new THREE.Vector3(-edgeDist, yMark, Z_START),
        new THREE.Vector3(-edgeDist, yMark, Z_END),
        new THREE.Vector3(edgeDist, yMark, Z_START),
        new THREE.Vector3(edgeDist, yMark, Z_END)
      );

      roadGroup.add(createPlotterSegments(primaryMarkings, 'primary'));
    }

    // Tier 1 (22%): Sidewalk flagstone paving cuts & curb block joints
    const flagstoneLines: THREE.Vector3[] = [];
    for (let z = Z_START; z >= Z_END; z -= 2.2) {
      for (const side of [-1, 1] as const) {
        const swMinX = side * halfStreetW;
        const swMaxX = side * (halfStreetW + sidewalkW);
        flagstoneLines.push(
          new THREE.Vector3(swMinX, 0.245, z),
          new THREE.Vector3(swMaxX, 0.245, z),
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
    flagstoneSegs.userData.alwaysVisibleInSobel = true;
    roadGroup.add(tagObjectDetail(flagstoneSegs, 22));

    if (!isNarrowAlley) {
      // Tier 1 (15%): Crosswalk zebra crossings & stop bars at intersections
      const crosswalkLines: THREE.Vector3[] = [];
      for (const iz of INTERSECTION_Z) {
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
        crosswalkLines.push(
          new THREE.Vector3(-halfStreetW + 0.5, 0.14, iz - 3.4),
          new THREE.Vector3(halfStreetW - 0.5, 0.14, iz - 3.4),
          new THREE.Vector3(-halfStreetW + 0.5, 0.14, iz + 3.4),
          new THREE.Vector3(halfStreetW - 0.5, 0.14, iz + 3.4)
        );
      }
      const crosswalkSegs = createPlotterSegments(crosswalkLines, 'primary');
      crosswalkSegs.userData.alwaysVisibleInSobel = true;
      roadGroup.add(tagObjectDetail(crosswalkSegs, 15));

      // Tier 2 (38%): 3D Park Benches, 3D Fire Hydrants, 3D Trash Bins & Dashed Lanes
      const furnitureTier = new THREE.Group();
      for (let z = Z_START - 24; z >= Z_END + 24; z -= 35) {
        const inIntersection = INTERSECTION_Z.some(
          (iz) => Math.abs(z - iz) < 10
        );
        if (inIntersection) continue;
        furnitureTier.add(
          createSidewalkFurnitureCluster(-1, z, halfStreetW, sidewalkW)
        );
        furnitureTier.add(
          createSidewalkFurnitureCluster(1, z - 8, halfStreetW, sidewalkW)
        );
      }

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
      const drainSegs = createPlotterSegments(laneAndManholeLines, 'secondary');
      drainSegs.userData.alwaysVisibleInSobel = true;
      furnitureTier.add(drainSegs);
      roadGroup.add(tagObjectDetail(furnitureTier, 38));

      // Tier 3 (60%): 3D Overhead Traffic Signal & Sign Gantries + 3D Corner Bollards
      const gantryTier = new THREE.Group();
      for (const iz of INTERSECTION_Z) {
        gantryTier.add(createTrafficSignalGantry(iz - 4.2, halfStreetW));
        for (const side of [-1, 1] as const) {
          for (const zOffset of [-4.5, -3.2, 3.2, 4.5]) {
            const bollardGeo = new THREE.CylinderGeometry(0.11, 0.13, 0.92, 8);
            bollardGeo.translate(
              side * (halfStreetW + 0.38),
              0.68,
              iz + zOffset
            );
            gantryTier.add(
              createPlotterMesh(bollardGeo, { thresholdAngle: 1 })
            );
          }
        }
      }
      roadGroup.add(tagObjectDetail(gantryTier, 60));
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
      roadGroup.add(
        createStreetTree(treeDist, z - 5, isBoulevard ? 1.25 : 1.05)
      );
    }
  }

  return roadGroup;
}
