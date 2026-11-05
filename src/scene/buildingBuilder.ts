import * as THREE from 'three';
import { createPlotterMesh, createPlotterSegments } from './plotterMaterial';
import { SceneDescriptor } from '../types/scenePromptTypes';

interface BuildingSpec {
  side: -1 | 1;
  zCenter: number;
  widthZ: number;
  depthX: number;
  height: number;
  style: 'setback-tower' | 'grid-office' | 'cornice-midrise' | 'brutalist-slab';
  row: 1 | 2;
  seedOffset: number;
}

export interface BuildingDetailParams {
  buildingDetail: number; // 0..100
  windowDensity: number; // 0..100
  balconyDensity: number; // 0..100
  pointsDensity?: number; // 0..100
}

function tagWindowGroup(obj: THREE.Object3D, threshold: number): THREE.Object3D {
  obj.userData.windowThreshold = threshold;
  return obj;
}

function tagBalconyGroup(
  obj: THREE.Object3D,
  threshold: number
): THREE.Object3D {
  obj.userData.balconyThreshold = threshold;
  return obj;
}

function tagDetailGroup(obj: THREE.Object3D, threshold: number): THREE.Object3D {
  obj.userData.detailThreshold = threshold;
  return obj;
}

/**
 * Creates a richly detailed 3D architectural balcony with:
 * - Cantilevered floor slab
 * - Underside corbel support brackets
 * - 3D top handrail and corner posts
 * - Vertical baluster pickets (front & sides)
 * - French double-door frame on the facade wall behind the balcony
 */
function createDetailedBalcony(
  wallX: number,
  floorY: number,
  zCenter: number,
  widthZ: number,
  outwardDir: -1 | 1,
  threshold: number
): THREE.Group {
  const balcony = new THREE.Group();
  const depthX = 1.35;
  const slabH = 0.22;
  const railH = 0.96;
  const xCenter = wallX + outwardDir * (depthX / 2);
  const outerX = wallX + outwardDir * depthX;
  const halfZ = widthZ / 2;

  // 1. Balcony deck slab
  const slabGeo = new THREE.BoxGeometry(depthX, slabH, widthZ);
  slabGeo.translate(xCenter, floorY, zCenter);
  balcony.add(createPlotterMesh(slabGeo));

  // 2. Underside support brackets (corbels)
  for (const zBrk of [zCenter - halfZ + 0.28, zCenter + halfZ - 0.28]) {
    const brkGeo = new THREE.BoxGeometry(depthX * 0.78, 0.34, 0.16);
    brkGeo.translate(
      wallX + outwardDir * (depthX * 0.39),
      floorY - slabH / 2 - 0.17,
      zBrk
    );
    balcony.add(createPlotterMesh(brkGeo, { inkWeight: 'secondary' }));
  }

  // 3. 3D Top handrail & corner posts
  const railTopY = floorY + slabH / 2 + railH;
  const frontRailGeo = new THREE.BoxGeometry(0.1, 0.1, widthZ + 0.08);
  frontRailGeo.translate(outerX - outwardDir * 0.05, railTopY, zCenter);
  balcony.add(createPlotterMesh(frontRailGeo));

  for (const zSide of [zCenter - halfZ, zCenter + halfZ]) {
    const sideRailGeo = new THREE.BoxGeometry(depthX, 0.09, 0.09);
    sideRailGeo.translate(xCenter, railTopY, zSide);
    balcony.add(createPlotterMesh(sideRailGeo));

    const postGeo = new THREE.BoxGeometry(0.13, railH, 0.13);
    postGeo.translate(
      outerX - outwardDir * 0.06,
      floorY + slabH / 2 + railH / 2,
      zSide
    );
    balcony.add(createPlotterMesh(postGeo));
  }

  // 4. Vertical wrought-iron baluster pickets & French door frame on wall
  const lines: THREE.Vector3[] = [];
  const yBot = floorY + slabH / 2;
  const yMidRail = yBot + railH * 0.82;
  const frontRailX = outerX - outwardDir * 0.05;

  // Decorative inner horizontal rail
  lines.push(
    new THREE.Vector3(frontRailX, yMidRail, zCenter - halfZ),
    new THREE.Vector3(frontRailX, yMidRail, zCenter + halfZ),
    new THREE.Vector3(wallX, yMidRail, zCenter - halfZ),
    new THREE.Vector3(frontRailX, yMidRail, zCenter - halfZ),
    new THREE.Vector3(wallX, yMidRail, zCenter + halfZ),
    new THREE.Vector3(frontRailX, yMidRail, zCenter + halfZ)
  );

  // Front vertical balusters every 0.32m
  const picketStep = 0.32;
  for (let z = zCenter - halfZ + picketStep; z < zCenter + halfZ - 0.1; z += picketStep) {
    lines.push(
      new THREE.Vector3(frontRailX, yBot, z),
      new THREE.Vector3(frontRailX, railTopY - 0.05, z)
    );
  }

  // Side return balusters
  for (const zSide of [zCenter - halfZ, zCenter + halfZ]) {
    for (let d = 0.32; d < depthX - 0.15; d += 0.34) {
      const px = wallX + outwardDir * d;
      lines.push(
        new THREE.Vector3(px, yBot, zSide),
        new THREE.Vector3(px, railTopY - 0.05, zSide)
      );
    }
  }

  // French double-door frame on the facade wall behind the balcony
  const doorW = Math.min(widthZ * 0.58, 1.8);
  const doorH = 2.35;
  const doorX = wallX + outwardDir * 0.03;
  const dz1 = zCenter - doorW / 2;
  const dz2 = zCenter + doorW / 2;
  lines.push(
    new THREE.Vector3(doorX, yBot, dz1),
    new THREE.Vector3(doorX, yBot + doorH, dz1),
    new THREE.Vector3(doorX, yBot + doorH, dz1),
    new THREE.Vector3(doorX, yBot + doorH, dz2),
    new THREE.Vector3(doorX, yBot + doorH, dz2),
    new THREE.Vector3(doorX, yBot, dz2),
    // Center French door leaf divider & transom
    new THREE.Vector3(doorX, yBot, zCenter),
    new THREE.Vector3(doorX, yBot + doorH, zCenter),
    new THREE.Vector3(doorX, yBot + doorH * 0.78, dz1),
    new THREE.Vector3(doorX, yBot + doorH * 0.78, dz2)
  );

  balcony.add(createPlotterSegments(lines, 'primary'));
  tagBalconyGroup(balcony, threshold);
  return balcony;
}

/**
 * Creates a Cross-Street Side Balcony (on ±Z building faces overlooking intersections)
 */
function createSideWallBalcony(
  xCenter: number,
  floorY: number,
  wallZ: number,
  widthX: number,
  outwardZDir: -1 | 1,
  threshold: number
): THREE.Group {
  const balcony = createDetailedBalcony(
    0,
    floorY,
    0,
    widthX,
    1,
    threshold
  );
  // Rotate from +X outward to ±Z outward
  balcony.rotation.y = outwardZDir === 1 ? -Math.PI / 2 : Math.PI / 2;
  balcony.position.set(xCenter, 0, wallZ);
  return balcony;
}

/**
 * Creates an exterior zig-zag iron fire escape with landings and diagonal stairs
 */
function createFireEscape(
  wallX: number,
  outwardDir: -1 | 1,
  zCenter: number,
  startY: number,
  endY: number,
  floorHeight: number,
  threshold: number
): THREE.Group {
  const feGroup = new THREE.Group();
  const depthX = 1.1;
  const widthZ = 2.8;
  const xMid = wallX + outwardDir * (depthX / 2);
  const outerX = wallX + outwardDir * depthX;
  const stairLines: THREE.Vector3[] = [];

  let flip = 1;
  for (let y = startY; y < endY - floorHeight; y += floorHeight) {
    // Platform landing box
    const platGeo = new THREE.BoxGeometry(depthX, 0.14, widthZ);
    platGeo.translate(xMid, y, zCenter);
    feGroup.add(createPlotterMesh(platGeo, { inkWeight: 'secondary' }));

    // Landing railing lines
    const rTop = y + 0.85;
    const z1 = zCenter - widthZ / 2;
    const z2 = zCenter + widthZ / 2;
    stairLines.push(
      new THREE.Vector3(outerX, y, z1),
      new THREE.Vector3(outerX, rTop, z1),
      new THREE.Vector3(outerX, y, z2),
      new THREE.Vector3(outerX, rTop, z2),
      new THREE.Vector3(outerX, rTop, z1),
      new THREE.Vector3(outerX, rTop, z2),
      new THREE.Vector3(wallX, rTop, z1),
      new THREE.Vector3(outerX, rTop, z1),
      new THREE.Vector3(wallX, rTop, z2),
      new THREE.Vector3(outerX, rTop, z2)
    );

    // Diagonal stair stringer & handrail to next floor
    const nextY = y + floorHeight;
    const szStart = flip === 1 ? z1 + 0.25 : z2 - 0.25;
    const szEnd = flip === 1 ? z2 - 0.25 : z1 + 0.25;
    const sx = wallX + outwardDir * (depthX * 0.68);
    stairLines.push(
      new THREE.Vector3(sx, y, szStart),
      new THREE.Vector3(sx, nextY, szEnd),
      new THREE.Vector3(sx, y + 0.75, szStart),
      new THREE.Vector3(sx, nextY + 0.75, szEnd)
    );
    flip *= -1;
  }

  feGroup.add(createPlotterSegments(stairLines, 'secondary'));
  tagDetailGroup(feGroup, threshold);
  return feGroup;
}

/**
 * Creates a classic rooftop wooden water tower on a 4-legged steel trestle frame
 */
function createWaterTower(
  x: number,
  roofY: number,
  z: number,
  threshold: number
): THREE.Group {
  const tower = new THREE.Group();

  // Trestle legs & cross-bracing
  const legH = 2.6;
  const spread = 1.1;
  const braceLines: THREE.Vector3[] = [];
  const corners = [
    [-spread, -spread],
    [spread, -spread],
    [spread, spread],
    [-spread, spread],
  ];

  for (let i = 0; i < 4; i++) {
    const [cx, cz] = corners[i];
    const [nx, nz] = corners[(i + 1) % 4];
    braceLines.push(
      new THREE.Vector3(x + cx, roofY, z + cz),
      new THREE.Vector3(x + cx * 0.75, roofY + legH, z + cz * 0.75),
      // X-brace between legs
      new THREE.Vector3(x + cx, roofY + 0.3, z + cz),
      new THREE.Vector3(x + nx * 0.75, roofY + legH - 0.2, z + nz * 0.75),
      new THREE.Vector3(x + nx, roofY + 0.3, z + nz),
      new THREE.Vector3(x + cx * 0.75, roofY + legH - 0.2, z + cz * 0.75)
    );
  }
  tower.add(createPlotterSegments(braceLines, 'secondary'));

  // Cylindrical tank body
  const tankH = 2.9;
  const tankGeo = new THREE.CylinderGeometry(1.35, 1.35, tankH, 10);
  tankGeo.translate(x, roofY + legH + tankH / 2, z);
  tower.add(createPlotterMesh(tankGeo, { thresholdAngle: 12 }));

  // Conical pitched roof
  const capH = 1.25;
  const capGeo = new THREE.ConeGeometry(1.52, capH, 10);
  capGeo.translate(x, roofY + legH + tankH + capH / 2, z);
  tower.add(createPlotterMesh(capGeo, { thresholdAngle: 12 }));

  tagDetailGroup(tower, threshold);
  return tower;
}

/**
 * Populates a building with multi-tier windows (casements, 3D sills/lintels, sash crossbars,
 * side-wall windows) and 3D balconies controlled by windowThreshold and balconyThreshold.
 */
function addWindowsAndBalconies(
  building: THREE.Group,
  xCenter: number,
  zCenter: number,
  depthX: number,
  height: number,
  widthZ: number,
  side: -1 | 1,
  floorHeight: number,
  seedOffset: number
): void {
  const streetWallX = xCenter - side * (depthX / 2);
  const outwardDir = (-side) as -1 | 1;
  const halfZ = widthZ / 2;
  const podiumY = Math.min(4.6, height * 0.22);

  // --- A. GROUND-FLOOR STOREFRONTS & AWNINGS ---
  const storefrontPoints: THREE.Vector3[] = [];
  const sfX = streetWallX + outwardDir * 0.03;

  // Double cornice band above ground floor
  storefrontPoints.push(
    new THREE.Vector3(sfX, podiumY, zCenter - halfZ),
    new THREE.Vector3(sfX, podiumY, zCenter + halfZ),
    new THREE.Vector3(sfX, podiumY + 0.28, zCenter - halfZ),
    new THREE.Vector3(sfX, podiumY + 0.28, zCenter + halfZ)
  );

  const baySpacing = 3.4;
  const numBays = Math.max(3, Math.floor((widthZ - 1.6) / baySpacing));
  const usableZ = widthZ - 2.0;
  const actualBayW = usableZ / numBays;

  for (let b = 0; b < numBays; b++) {
    const bzCenter = zCenter - usableZ / 2 + (b + 0.5) * actualBayW;
    const wHalf = actualBayW * 0.38;
    const z1 = bzCenter - wHalf;
    const z2 = bzCenter + wHalf;

    // Storefront display window frame + transom bar
    storefrontPoints.push(
      new THREE.Vector3(sfX, 0.25, z1),
      new THREE.Vector3(sfX, podiumY - 0.35, z1),
      new THREE.Vector3(sfX, podiumY - 0.35, z1),
      new THREE.Vector3(sfX, podiumY - 0.35, z2),
      new THREE.Vector3(sfX, podiumY - 0.35, z2),
      new THREE.Vector3(sfX, 0.25, z2),
      new THREE.Vector3(sfX, 0.25, z2),
      new THREE.Vector3(sfX, 0.25, z1),
      // Transom bar & vertical center divider
      new THREE.Vector3(sfX, podiumY - 1.05, z1),
      new THREE.Vector3(sfX, podiumY - 1.05, z2),
      new THREE.Vector3(sfX, 0.25, bzCenter),
      new THREE.Vector3(sfX, podiumY - 1.05, bzCenter)
    );

    // 3D Storefront Awning on alternating bays
    if ((b + seedOffset) % 2 === 0) {
      const awningGroup = new THREE.Group();
      const awnGeo = new THREE.BoxGeometry(1.15, 0.28, actualBayW * 0.82);
      awnGeo.rotateZ(outwardDir * -0.22);
      awnGeo.translate(
        streetWallX + outwardDir * 0.58,
        podiumY - 0.55,
        bzCenter
      );
      awningGroup.add(createPlotterMesh(awnGeo));
      const awnThreshold = 20 + ((b * 19 + seedOffset * 11) % 65);
      building.add(tagDetailGroup(awningGroup, awnThreshold));
    }
  }
  building.add(
    tagWindowGroup(createPlotterSegments(storefrontPoints, 'primary'), 10)
  );

  // --- B. UPPER-FLOOR WINDOWS (4 PROGRESSIVE DENSITY TIERS) & 3D SILLS/LINTELS ---
  const tier1Casements: THREE.Vector3[] = []; // Threshold 15%
  const tier2Casements: THREE.Vector3[] = []; // Threshold 35%
  const tier3SashBars: THREE.Vector3[] = []; // Threshold 60%
  const tier4FinePanes: THREE.Vector3[] = []; // Threshold 82%

  const sillMeshesTier1 = new THREE.Group(); // Threshold 45%
  const sillMeshesTier2 = new THREE.Group(); // Threshold 75%

  const floors: number[] = [];
  for (let y = podiumY + 0.9; y + 2.4 < height - 1.0; y += floorHeight) {
    floors.push(y);
  }

  floors.forEach((yBot, floorIdx) => {
    const winH = Math.min(2.15, floorHeight * 0.62);
    const yTop = yBot + winH;
    const yMid = yBot + winH * 0.52;
    const yTransom = yBot + winH * 0.78;

    for (let b = 0; b < numBays; b++) {
      const bzCenter = zCenter - usableZ / 2 + (b + 0.5) * actualBayW;
      const winHalfW = Math.min(0.88, actualBayW * 0.34);
      const z1 = bzCenter - winHalfW;
      const z2 = bzCenter + winHalfW;

      const targetCasement =
        (floorIdx + b) % 2 === 0 ? tier1Casements : tier2Casements;

      // Outer window casement rectangle
      targetCasement.push(
        new THREE.Vector3(sfX, yBot, z1),
        new THREE.Vector3(sfX, yTop, z1),
        new THREE.Vector3(sfX, yTop, z1),
        new THREE.Vector3(sfX, yTop, z2),
        new THREE.Vector3(sfX, yTop, z2),
        new THREE.Vector3(sfX, yBot, z2),
        new THREE.Vector3(sfX, yBot, z2),
        new THREE.Vector3(sfX, yBot, z1)
      );

      // Inner recessed window frame rectangle
      const inset = 0.14;
      tier2Casements.push(
        new THREE.Vector3(sfX, yBot + inset, z1 + inset),
        new THREE.Vector3(sfX, yTop - inset, z1 + inset),
        new THREE.Vector3(sfX, yTop - inset, z1 + inset),
        new THREE.Vector3(sfX, yTop - inset, z2 - inset),
        new THREE.Vector3(sfX, yTop - inset, z2 - inset),
        new THREE.Vector3(sfX, yBot + inset, z2 - inset),
        new THREE.Vector3(sfX, yBot + inset, z2 - inset),
        new THREE.Vector3(sfX, yBot + inset, z1 + inset)
      );

      // Double-hung sash horizontal bar + vertical center mullion
      tier3SashBars.push(
        new THREE.Vector3(sfX, yMid, z1 + inset),
        new THREE.Vector3(sfX, yMid, z2 - inset),
        new THREE.Vector3(sfX, yBot + inset, bzCenter),
        new THREE.Vector3(sfX, yTop - inset, bzCenter)
      );

      // Fine upper transom bar & quarter-pane muntins
      tier4FinePanes.push(
        new THREE.Vector3(sfX, yTransom, z1 + inset),
        new THREE.Vector3(sfX, yTransom, z2 - inset),
        new THREE.Vector3(sfX, yBot + inset, bzCenter - winHalfW * 0.48),
        new THREE.Vector3(sfX, yMid, bzCenter - winHalfW * 0.48),
        new THREE.Vector3(sfX, yBot + inset, bzCenter + winHalfW * 0.48),
        new THREE.Vector3(sfX, yMid, bzCenter + winHalfW * 0.48)
      );

      // 3D Projecting Window Sill & Lintel Box
      if (floorIdx % 2 === 0 || b % 2 === 0) {
        const sillGeo = new THREE.BoxGeometry(0.28, 0.16, winHalfW * 2 + 0.26);
        sillGeo.translate(
          streetWallX + outwardDir * 0.14,
          yBot - 0.08,
          bzCenter
        );
        const sillMesh = createPlotterMesh(sillGeo, { inkWeight: 'secondary' });

        // Top lintel header
        const lintelGeo = new THREE.BoxGeometry(
          0.24,
          0.22,
          winHalfW * 2 + 0.32
        );
        lintelGeo.translate(
          streetWallX + outwardDir * 0.12,
          yTop + 0.11,
          bzCenter
        );
        const lintelMesh = createPlotterMesh(lintelGeo, {
          inkWeight: 'secondary',
        });

        const destGroup =
          (floorIdx + b) % 2 === 0 ? sillMeshesTier1 : sillMeshesTier2;
        destGroup.add(sillMesh);
        destGroup.add(lintelMesh);
      }
    }
  });

  // --- C. SIDE-WALL WINDOWS (ON ±Z FACES VISIBLE DOWN THE CANYON) ---
  const sideWinTier2: THREE.Vector3[] = [];
  const sideWinTier3: THREE.Vector3[] = [];
  const sideBays = Math.max(2, Math.floor((depthX - 2.4) / 3.2));
  const usableX = depthX - 2.4;
  const sideBayW = usableX / sideBays;

  for (const zDir of [-1, 1] as const) {
    const zFace = zCenter + zDir * (halfZ + 0.03);
    floors.forEach((yBot, floorIdx) => {
      const winH = Math.min(2.1, floorHeight * 0.6);
      const yTop = yBot + winH;
      const yMid = yBot + winH * 0.5;

      for (let sb = 0; sb < sideBays; sb++) {
        const bxCenter = xCenter - usableX / 2 + (sb + 0.5) * sideBayW;
        const wHalf = Math.min(0.8, sideBayW * 0.33);
        const x1 = bxCenter - wHalf;
        const x2 = bxCenter + wHalf;

        const targetArr = floorIdx % 2 === 0 ? sideWinTier2 : sideWinTier3;
        targetArr.push(
          new THREE.Vector3(x1, yBot, zFace),
          new THREE.Vector3(x1, yTop, zFace),
          new THREE.Vector3(x1, yTop, zFace),
          new THREE.Vector3(x2, yTop, zFace),
          new THREE.Vector3(x2, yTop, zFace),
          new THREE.Vector3(x2, yBot, zFace),
          new THREE.Vector3(x2, yBot, zFace),
          new THREE.Vector3(x1, yBot, zFace)
        );

        sideWinTier3.push(
          new THREE.Vector3(x1, yMid, zFace),
          new THREE.Vector3(x2, yMid, zFace),
          new THREE.Vector3(bxCenter, yBot, zFace),
          new THREE.Vector3(bxCenter, yTop, zFace)
        );
      }
    });
  }

  building.add(
    tagWindowGroup(createPlotterSegments(tier1Casements, 'primary'), 15)
  );
  building.add(
    tagWindowGroup(
      createPlotterSegments([...tier2Casements, ...sideWinTier2], 'primary'),
      35
    )
  );
  building.add(tagWindowGroup(sillMeshesTier1, 48));
  building.add(
    tagWindowGroup(
      createPlotterSegments([...tier3SashBars, ...sideWinTier3], 'secondary'),
      62
    )
  );
  building.add(tagWindowGroup(sillMeshesTier2, 76));
  building.add(
    tagWindowGroup(createPlotterSegments(tier4FinePanes, 'secondary'), 88)
  );

  // --- D. 3D BALCONIES (FRONT STREET FACADE & SIDE INTERSECTION FACADES) ---
  floors.forEach((yBot, floorIdx) => {
    // Skip very first upper floor if awning is directly underneath
    if (floorIdx === 0) return;

    for (let b = 0; b < numBays; b++) {
      // Create rich architectural balcony rhythm across bays and floors
      const patternVal = (floorIdx * 7 + b * 13 + seedOffset * 5) % 10;
      if (patternVal >= 6) continue; // ~60% of candidate bays have balconies at 100% density

      const bzCenter = zCenter - usableZ / 2 + (b + 0.5) * actualBayW;
      const balcWidth = Math.min(3.2, actualBayW * 0.88);

      // Spread thresholds evenly from 8% to 98% so the Balconies % slider smoothly adds/removes them
      const threshold = 8 + ((floorIdx * 23 + b * 37 + seedOffset * 17) % 90);

      building.add(
        createDetailedBalcony(
          streetWallX,
          yBot - 0.1,
          bzCenter,
          balcWidth,
          outwardDir,
          threshold
        )
      );
    }

    // Add side-wall balconies on every 2nd floor facing cross-streets
    if (floorIdx % 2 === 1) {
      for (const zDir of [-1, 1] as const) {
        const zWall = zCenter + zDir * halfZ;
        const bx = xCenter - side * (depthX * 0.18);
        const sideThreshold =
          22 + ((floorIdx * 31 + (zDir === 1 ? 19 : 7) + seedOffset * 13) % 76);
        building.add(
          createSideWallBalcony(
            bx,
            yBot - 0.1,
            zWall,
            2.9,
            zDir,
            sideThreshold
          )
        );
      }
    }
  });

  // --- E. PROGRESSIVE OBJECT MICRO-DETAILS TIED TO OBJECT & POINTS % SLIDER ---
  // Tier 1 (20%): Horizontal floor belt stringcourses across front and side facades
  const stringcourseLines: THREE.Vector3[] = [];
  // Tier 2 (38%): Vertical structural bay piers & pilasters between window bays
  const verticalPierLines: THREE.Vector3[] = [];
  // Tier 3 (55%): Spandrel panel frames & roofline cornice dentil ticks
  const spandrelLines: THREE.Vector3[] = [];
  // Tier 4 (72%): Structural cross-bracing & rooftop lattice parapet frames
  const bracingLines: THREE.Vector3[] = [];
  // Tier 5 (88%): Fine stone ashlar coursing & corner quoin ticks
  const ashlarLines: THREE.Vector3[] = [];

  floors.forEach((yBot, floorIdx) => {
    const winH = Math.min(2.15, floorHeight * 0.62);
    const yTop = yBot + winH;

    // Tier 1: Stringcourses
    stringcourseLines.push(
      new THREE.Vector3(sfX, yBot - 0.22, zCenter - halfZ),
      new THREE.Vector3(sfX, yBot - 0.22, zCenter + halfZ)
    );
    for (const zDir of [-1, 1] as const) {
      stringcourseLines.push(
        new THREE.Vector3(sfX, yBot - 0.22, zCenter + zDir * halfZ),
        new THREE.Vector3(
          sfX - outwardDir * depthX * 0.9,
          yBot - 0.22,
          zCenter + zDir * halfZ
        )
      );
    }

    // Tier 3: Spandrel band top lines & corner quoins
    spandrelLines.push(
      new THREE.Vector3(sfX, yTop + 0.24, zCenter - halfZ),
      new THREE.Vector3(sfX, yTop + 0.24, zCenter + halfZ)
    );

    // Tier 5: Intermediate ashlar stone coursing lines + corner quoin ticks
    const yMidCourse = yBot + winH * 0.5;
    ashlarLines.push(
      new THREE.Vector3(sfX, yMidCourse, zCenter - halfZ),
      new THREE.Vector3(sfX, yMidCourse, zCenter - halfZ + 1.1),
      new THREE.Vector3(sfX, yMidCourse, zCenter + halfZ - 1.1),
      new THREE.Vector3(sfX, yMidCourse, zCenter + halfZ)
    );

    // Tier 4: Spandrel X-bracing under windows on alternating bays
    for (let b = 0; b < numBays; b++) {
      if ((b + floorIdx) % 2 !== 0) continue;
      const bzCenter = zCenter - usableZ / 2 + (b + 0.5) * actualBayW;
      const wHalf = Math.min(0.88, actualBayW * 0.34);
      const spBot = yBot - 0.85;
      const spTop = yBot - 0.22;
      if (spBot > podiumY) {
        bracingLines.push(
          new THREE.Vector3(sfX, spBot, bzCenter - wHalf),
          new THREE.Vector3(sfX, spTop, bzCenter + wHalf),
          new THREE.Vector3(sfX, spBot, bzCenter + wHalf),
          new THREE.Vector3(sfX, spTop, bzCenter - wHalf)
        );
      }
    }
  });

  // Tier 2: Vertical bay divider piers from podium to roof
  for (let b = 0; b <= numBays; b++) {
    const pierZ = zCenter - usableZ / 2 + b * actualBayW;
    verticalPierLines.push(
      new THREE.Vector3(sfX, podiumY, pierZ),
      new THREE.Vector3(sfX, height - 0.4, pierZ)
    );
  }
  for (const zDir of [-1, 1] as const) {
    const zFace = zCenter + zDir * (halfZ + 0.03);
    for (let sb = 1; sb < sideBays; sb++) {
      const pierX = xCenter - usableX / 2 + sb * sideBayW;
      verticalPierLines.push(
        new THREE.Vector3(pierX, podiumY, zFace),
        new THREE.Vector3(pierX, height - 0.4, zFace)
      );
    }
  }

  // Tier 3: Roofline cornice dentil ticks & roof parapet rail
  for (let z = zCenter - halfZ + 0.5; z <= zCenter + halfZ - 0.5; z += 0.9) {
    spandrelLines.push(
      new THREE.Vector3(sfX, height - 0.55, z),
      new THREE.Vector3(sfX, height - 0.05, z)
    );
  }

  const addPointsTier = (pts: THREE.Vector3[], threshold: number, weight: 'primary' | 'secondary' = 'secondary') => {
    if (pts.length === 0) return;
    const segs = createPlotterSegments(pts, weight);
    segs.userData.pointsThreshold = threshold;
    segs.userData.alwaysVisibleInSobel = true;
    building.add(segs);
  };

  addPointsTier(stringcourseLines, 20, 'secondary');
  addPointsTier(verticalPierLines, 38, 'secondary');
  addPointsTier(spandrelLines, 55, 'secondary');
  addPointsTier(bracingLines, 72, 'secondary');
  addPointsTier(ashlarLines, 88, 'secondary');
}

function createBuildingFromSpec(
  spec: BuildingSpec,
  descriptor?: SceneDescriptor
): THREE.Group {
  const building = new THREE.Group();
  const streetW = descriptor?.streetWidth ?? 16.0;
  const sidewalkW = descriptor?.sidewalkWidth ?? 4.2;
  const setback = streetW / 2 + sidewalkW;

  const baseOffset = spec.row === 1 ? setback : setback + 19.0;
  const xCenter = spec.side * (baseOffset + spec.depthX / 2);
  const streetWallX = xCenter - spec.side * (spec.depthX / 2);
  const outwardDir = (-spec.side) as -1 | 1;

  if (spec.style === 'setback-tower') {
    // Tier 1: Podium + Lower shaft (58% of total height)
    const h1 = spec.height * 0.58;
    const g1 = new THREE.BoxGeometry(spec.depthX, h1, spec.widthZ);
    g1.translate(xCenter, h1 / 2, spec.zCenter);
    building.add(createPlotterMesh(g1));

    // Setback terrace balustrade around Tier 2 base
    const h2 = spec.height * 0.26;
    const d2 = spec.depthX * 0.78;
    const w2 = spec.widthZ * 0.8;
    const g2 = new THREE.BoxGeometry(d2, h2, w2);
    g2.translate(xCenter + spec.side * 0.6, h1 + h2 / 2, spec.zCenter);
    building.add(createPlotterMesh(g2));

    // Tier 3: Crown & mechanical penthouse (16% height)
    const h3 = spec.height * 0.16;
    const d3 = spec.depthX * 0.54;
    const w3 = spec.widthZ * 0.56;
    const g3 = new THREE.BoxGeometry(d3, h3, w3);
    g3.translate(xCenter + spec.side * 1.0, h1 + h2 + h3 / 2, spec.zCenter);
    building.add(createPlotterMesh(g3));

    // Rooftop antenna mast (tagged as detail)
    const spireH = 9.0;
    const spireGeo = new THREE.BoxGeometry(0.28, spireH, 0.28);
    spireGeo.translate(
      xCenter + spec.side * 1.0,
      spec.height + spireH / 2,
      spec.zCenter
    );
    building.add(tagDetailGroup(createPlotterMesh(spireGeo), 30));

    if (spec.row === 1) {
      addWindowsAndBalconies(
        building,
        xCenter,
        spec.zCenter,
        spec.depthX,
        h1,
        spec.widthZ,
        spec.side,
        3.6,
        spec.seedOffset
      );

      // Upper tier windows on Tier 2 setback shaft
      addWindowsAndBalconies(
        building,
        xCenter + spec.side * 0.6,
        spec.zCenter,
        d2,
        h1 + h2 - 1.0,
        w2,
        spec.side,
        3.6,
        spec.seedOffset + 3
      );
    }
  } else if (spec.style === 'grid-office') {
    const mainGeo = new THREE.BoxGeometry(spec.depthX, spec.height, spec.widthZ);
    mainGeo.translate(xCenter, spec.height / 2, spec.zCenter);
    building.add(createPlotterMesh(mainGeo));

    // Projecting cornice parapet at roofline
    const corniceGeo = new THREE.BoxGeometry(
      spec.depthX + 0.85,
      0.9,
      spec.widthZ + 0.85
    );
    corniceGeo.translate(xCenter, spec.height - 0.45, spec.zCenter);
    building.add(tagDetailGroup(createPlotterMesh(corniceGeo), 20));

    // Rooftop HVAC & water tower
    const hvacGeo = new THREE.BoxGeometry(
      spec.depthX * 0.4,
      3.0,
      spec.widthZ * 0.35
    );
    hvacGeo.translate(xCenter, spec.height + 1.5, spec.zCenter - 2.2);
    building.add(tagDetailGroup(createPlotterMesh(hvacGeo), 40));

    if (spec.row === 1) {
      building.add(
        createWaterTower(
          xCenter - spec.side * 2.2,
          spec.height,
          spec.zCenter + spec.widthZ * 0.26,
          65
        )
      );

      // Fire escape on facade
      building.add(
        createFireEscape(
          streetWallX,
          outwardDir,
          spec.zCenter - spec.widthZ * 0.28,
          4.8,
          spec.height - 2.0,
          3.5,
          55
        )
      );

      addWindowsAndBalconies(
        building,
        xCenter,
        spec.zCenter,
        spec.depthX,
        spec.height,
        spec.widthZ,
        spec.side,
        3.5,
        spec.seedOffset
      );
    }
  } else if (spec.style === 'cornice-midrise') {
    const mainGeo = new THREE.BoxGeometry(spec.depthX, spec.height, spec.widthZ);
    mainGeo.translate(xCenter, spec.height / 2, spec.zCenter);
    building.add(createPlotterMesh(mainGeo));

    // Pitched / mansard crown
    const roofH = 3.8;
    const roofGeo = new THREE.ConeGeometry(
      Math.min(spec.depthX, spec.widthZ) * 0.62,
      roofH,
      4
    );
    roofGeo.rotateY(Math.PI / 4);
    roofGeo.scale(1, 1, spec.widthZ / spec.depthX);
    roofGeo.translate(xCenter, spec.height + roofH / 2, spec.zCenter);
    building.add(
      tagDetailGroup(createPlotterMesh(roofGeo, { thresholdAngle: 10 }), 25)
    );

    // Intermediate belt-course ledges every 2 floors
    const beltGroup = new THREE.Group();
    for (let y = 11.4; y < spec.height - 2; y += 6.8) {
      const ledgeGeo = new THREE.BoxGeometry(
        spec.depthX + 0.45,
        0.32,
        spec.widthZ + 0.45
      );
      ledgeGeo.translate(xCenter, y, spec.zCenter);
      beltGroup.add(createPlotterMesh(ledgeGeo, { inkWeight: 'secondary' }));
    }
    building.add(tagDetailGroup(beltGroup, 45));

    if (spec.row === 1) {
      building.add(
        createWaterTower(
          xCenter + spec.side * 1.5,
          spec.height,
          spec.zCenter - spec.widthZ * 0.25,
          75
        )
      );

      addWindowsAndBalconies(
        building,
        xCenter,
        spec.zCenter,
        spec.depthX,
        spec.height,
        spec.widthZ,
        spec.side,
        3.4,
        spec.seedOffset
      );
    }
  } else {
    // Brutalist / vertical fin slab tower
    const mainGeo = new THREE.BoxGeometry(spec.depthX, spec.height, spec.widthZ);
    mainGeo.translate(xCenter, spec.height / 2, spec.zCenter);
    building.add(createPlotterMesh(mainGeo));

    if (spec.row === 1) {
      const pilasterGroup = new THREE.Group();
      const pilasterX = streetWallX + outwardDir * 0.25;
      const count = 4;
      for (let i = 0; i <= count; i++) {
        const pz =
          spec.zCenter -
          spec.widthZ / 2 +
          0.7 +
          (i / count) * (spec.widthZ - 1.4);
        const pilGeo = new THREE.BoxGeometry(0.5, spec.height, 0.52);
        pilGeo.translate(pilasterX, spec.height / 2, pz);
        pilasterGroup.add(createPlotterMesh(pilGeo));
      }
      building.add(tagDetailGroup(pilasterGroup, 35));

      building.add(
        createFireEscape(
          streetWallX,
          outwardDir,
          spec.zCenter + spec.widthZ * 0.26,
          5.0,
          spec.height - 3.0,
          3.8,
          70
        )
      );

      addWindowsAndBalconies(
        building,
        xCenter,
        spec.zCenter,
        spec.depthX,
        spec.height,
        spec.widthZ,
        spec.side,
        3.8,
        spec.seedOffset
      );
    }
  }

  // Add second-row high-rise window grids so skyline towers also respond to Windows %
  if (spec.row === 2) {
    const skyWinPoints: THREE.Vector3[] = [];
    const faceX = streetWallX + outwardDir * 0.04;
    const halfW = spec.widthZ / 2;
    for (let y = 10; y < spec.height - 2; y += 4.2) {
      skyWinPoints.push(
        new THREE.Vector3(faceX, y, spec.zCenter - halfW + 1.2),
        new THREE.Vector3(faceX, y, spec.zCenter + halfW - 1.2)
      );
    }
    for (
      let z = spec.zCenter - halfW + 2.0;
      z <= spec.zCenter + halfW - 2.0;
      z += 3.0
    ) {
      skyWinPoints.push(
        new THREE.Vector3(faceX, 10, z),
        new THREE.Vector3(faceX, spec.height - 2, z)
      );
    }
    building.add(
      tagWindowGroup(createPlotterSegments(skyWinPoints, 'secondary'), 30)
    );
  }

  return building;
}

export function buildBuildingsScene(descriptor?: SceneDescriptor): THREE.Group {
  const group = new THREE.Group();
  group.name = 'UrbanStreetWalls';

  // If user explicitly requested no buildings or buildingDensity is 0, return empty group!
  if (descriptor?.hasBuildings === false || descriptor?.buildingDensity === 0) {
    return group;
  }

  // Street canyon spans Z from +165 to -245, interrupted by cross-streets at [105, 35, -35, -105, -175]
  const blocks: Array<{ zStart: number; zEnd: number }> = [
    { zStart: 164, zEnd: 112 },
    { zStart: 98, zEnd: 42 },
    { zStart: 28, zEnd: -28 },
    { zStart: -42, zEnd: -98 },
    { zStart: -112, zEnd: -168 },
    { zStart: -182, zEnd: -242 },
  ];

  const styles: BuildingSpec['style'][] = [
    'grid-office',
    'setback-tower',
    'cornice-midrise',
    'brutalist-slab',
  ];

  let seed = 17;
  const nextRand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  let buildingCounter = 0;

  const minH = descriptor?.buildingHeights.min ?? 20;
  const maxH = descriptor?.buildingHeights.max ?? 75;
  const hRange = Math.max(8, maxH - minH);
  const density = descriptor?.buildingDensity ?? 1.0;

  blocks.forEach((block, blockIdx) => {
    for (const side of [-1, 1] as const) {
      // Subdivide each city block into 3 packed front-row buildings
      const totalBlockZ = block.zStart - block.zEnd;
      const proportions = [0.34, 0.31, 0.35];
      let cursorZ = block.zStart;

      proportions.forEach((prop, subIdx) => {
        const lotZ = totalBlockZ * prop;
        const widthZ = lotZ - 0.5;
        const zCenter = cursorZ - lotZ / 2;
        cursorZ -= lotZ;

        // Sparse building support: randomly skip lots if density < 1
        if (density < 1.0 && nextRand() > density) {
          return;
        }

        const r1 = nextRand();
        const r2 = nextRand();
        const style =
          styles[(blockIdx * 3 + subIdx + (side === 1 ? 2 : 0)) % styles.length];

        const baseHeight = minH + r1 * hRange * (style === 'setback-tower' ? 1.0 : 0.75);
        const depthX = 14 + r2 * 4.5;
        buildingCounter++;

        group.add(
          createBuildingFromSpec(
            {
              side,
              zCenter,
              widthZ,
              depthX,
              height: baseHeight,
              style,
              row: 1,
              seedOffset: buildingCounter,
            },
            descriptor
          )
        );
      });

      // Second row of taller skyline towers behind the street wall
      if (descriptor?.hasSkylineTowers !== false && (density >= 0.7 || nextRand() < density)) {
        const backMidZ = (block.zStart + block.zEnd) / 2;
        const backHeight = minH * 1.4 + nextRand() * hRange * 1.2;
        buildingCounter++;
        group.add(
          createBuildingFromSpec(
            {
              side,
              zCenter: backMidZ + (side === 1 ? 6 : -6),
              widthZ: totalBlockZ * 0.55,
              depthX: 18,
              height: backHeight,
              style: blockIdx % 2 === 0 ? 'setback-tower' : 'brutalist-slab',
              row: 2,
              seedOffset: buildingCounter,
            },
            descriptor
          )
        );
      }
    }
  });

  // Optional Skybridges connecting buildings across the street
  if (descriptor?.hasSkybridges) {
    const bridgeZ = [70, -3, -70, -140];
    const streetW = descriptor?.streetWidth ?? 16.0;
    const sidewalkW = descriptor?.sidewalkWidth ?? 4.2;
    const bridgeSpan = streetW + sidewalkW * 2 + 10;

    for (const bz of bridgeZ) {
      const bridgeY = 28 + (Math.abs(bz) % 20);
      const bridgeGeo = new THREE.BoxGeometry(bridgeSpan, 3.2, 4.0);
      bridgeGeo.translate(0, bridgeY, bz);
      group.add(createPlotterMesh(bridgeGeo));

      // Side glass wire windows
      for (const dir of [-1, 1] as const) {
        const railGeo = new THREE.BoxGeometry(bridgeSpan, 0.4, 0.2);
        railGeo.translate(0, bridgeY + 1.4, bz + dir * 1.9);
        group.add(createPlotterMesh(railGeo, { inkWeight: 'secondary' }));
      }
    }
  }

  // Distant focal landmark tower on the far horizon axis (Z = -278m)
  if (descriptor?.hasLandmarkTower !== false) {
    const landmarkGroup = new THREE.Group();
    const baseGeo = new THREE.BoxGeometry(22, 68, 22);
    baseGeo.translate(0, 34, -278);
    landmarkGroup.add(createPlotterMesh(baseGeo));

    const midGeo = new THREE.BoxGeometry(15, 36, 15);
    midGeo.translate(0, 86, -278);
    landmarkGroup.add(createPlotterMesh(midGeo));

    const topGeo = new THREE.BoxGeometry(9, 22, 9);
    topGeo.translate(0, 115, -278);
    landmarkGroup.add(createPlotterMesh(topGeo));

    const spireGeo = new THREE.ConeGeometry(2.8, 24, 4);
    spireGeo.rotateY(Math.PI / 4);
    spireGeo.translate(0, 138, -278);
    landmarkGroup.add(createPlotterMesh(spireGeo));

    group.add(landmarkGroup);
  }

  return group;
}

/**
 * Dynamically toggles windows, balconies, and architectural details across all buildings
 * based on the current slider parameters (0% to 100%).
 */
export function applyBuildingDetailLevel(
  buildingsGroup: THREE.Group,
  params: BuildingDetailParams
): void {
  buildingsGroup.traverse((obj) => {
    if (typeof obj.userData.windowThreshold === 'number') {
      const vis =
        params.windowDensity > 0 &&
        obj.userData.windowThreshold <= params.windowDensity;
      obj.visible = vis;
      obj.userData.hiddenByDetail = !vis;
    } else if (typeof obj.userData.balconyThreshold === 'number') {
      const vis =
        params.balconyDensity > 0 &&
        obj.userData.balconyThreshold <= params.balconyDensity;
      obj.visible = vis;
      obj.userData.hiddenByDetail = !vis;
    } else if (typeof obj.userData.detailThreshold === 'number') {
      const vis =
        params.buildingDetail > 0 &&
        obj.userData.detailThreshold <= params.buildingDetail;
      obj.visible = vis;
      obj.userData.hiddenByDetail = !vis;
    } else if (typeof obj.userData.pointsThreshold === 'number') {
      const pd =
        typeof params.pointsDensity === 'number' ? params.pointsDensity : 25;
      const vis = pd > 0 && obj.userData.pointsThreshold <= pd;
      obj.visible = vis;
      obj.userData.hiddenByDetail = !vis;
    }
  });
}
