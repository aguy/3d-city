import * as THREE from 'three';
import {
  createPlotterMesh,
  createPlotterSegments,
  tagObjectDetail,
} from './plotterMaterial';

export interface AnimatedVehicle {
  mesh: THREE.Group;
  speedZ: number;
  minZ: number;
  maxZ: number;
}

function addWheel(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  radius = 0.36,
  width = 0.24
): void {
  // Base low-poly wheel tire cylinder
  const wheelGeo = new THREE.CylinderGeometry(radius, radius, width, 8);
  wheelGeo.rotateZ(Math.PI / 2);
  wheelGeo.translate(x, y, z);
  group.add(createPlotterMesh(wheelGeo, { thresholdAngle: 12 }));

  const signX = Math.sign(x) || 1;
  const outerX = x + signX * (width / 2 + 0.012);

  // Tier 1 (20%): 3D Recessed Alloy Rim Cylinder (14 radial segments) + Central Axle Hub Cap
  const tier1Group = new THREE.Group();
  const rimGeo = new THREE.CylinderGeometry(
    radius * 0.68,
    radius * 0.68,
    width * 0.35,
    14
  );
  rimGeo.rotateZ(Math.PI / 2);
  rimGeo.translate(x + signX * (width * 0.36), y, z);
  tier1Group.add(
    createPlotterMesh(rimGeo, { thresholdAngle: 1, inkWeight: 'secondary' })
  );

  const hubGeo = new THREE.CylinderGeometry(
    radius * 0.24,
    radius * 0.24,
    width * 0.22,
    8
  );
  hubGeo.rotateZ(Math.PI / 2);
  hubGeo.translate(outerX, y, z);
  tier1Group.add(
    createPlotterMesh(hubGeo, { thresholdAngle: 1, inkWeight: 'primary' })
  );
  group.add(tagObjectDetail(tier1Group, 20));

  // Tier 2 (50%): High-Density 10-Spoke Star Alloy Cage & Tire Sidewall Tread Ring
  const rInner = radius * 0.22;
  const rOuter = radius * 0.66;
  const rTread = radius * 0.86;
  const spokeLines: THREE.Vector3[] = [];
  const numSpokes = 10;
  for (let i = 0; i < numSpokes; i++) {
    const a0 = (i / numSpokes) * Math.PI * 2;
    const a1 = ((i + 1) / numSpokes) * Math.PI * 2;
    spokeLines.push(
      // Radial alloy spoke
      new THREE.Vector3(
        outerX,
        y + Math.sin(a0) * rInner,
        z + Math.cos(a0) * rInner
      ),
      new THREE.Vector3(
        outerX,
        y + Math.sin(a0) * rOuter,
        z + Math.cos(a0) * rOuter
      ),
      // Tire sidewall concentric ring segment
      new THREE.Vector3(
        outerX,
        y + Math.sin(a0) * rTread,
        z + Math.cos(a0) * rTread
      ),
      new THREE.Vector3(
        outerX,
        y + Math.sin(a1) * rTread,
        z + Math.cos(a1) * rTread
      )
    );
  }
  const spokeSegs = createPlotterSegments(spokeLines, 'secondary');
  spokeSegs.userData.alwaysVisibleInSobel = true;
  group.add(tagObjectDetail(spokeSegs, 50));
}

export function createCarModel(): THREE.Group {
  const car = new THREE.Group();

  // Base Lower Body Chassis
  const bodyGeo = new THREE.BoxGeometry(1.86, 0.64, 4.45);
  bodyGeo.translate(0, 0.56, 0);
  car.add(createPlotterMesh(bodyGeo));

  // Base Front & Rear Bumpers
  const fBumper = new THREE.BoxGeometry(1.92, 0.26, 0.25);
  fBumper.translate(0, 0.38, -2.25);
  car.add(createPlotterMesh(fBumper));

  const rBumper = new THREE.BoxGeometry(1.92, 0.26, 0.25);
  rBumper.translate(0, 0.38, 2.25);
  car.add(createPlotterMesh(rBumper));

  // Base Cabin Greenhouse
  const cabinGeo = new THREE.BoxGeometry(1.56, 0.56, 2.15);
  cabinGeo.translate(0, 1.16, 0.15);
  car.add(createPlotterMesh(cabinGeo));

  // Base Window Pillar & Door Seam Lines
  const lines: THREE.Vector3[] = [
    new THREE.Vector3(-0.94, 0.28, 0.1),
    new THREE.Vector3(-0.94, 0.88, 0.1),
    new THREE.Vector3(0.94, 0.28, 0.1),
    new THREE.Vector3(0.94, 0.88, 0.1),
    new THREE.Vector3(-0.79, 0.88, 0.1),
    new THREE.Vector3(-0.79, 1.44, 0.1),
    new THREE.Vector3(0.79, 0.88, 0.1),
    new THREE.Vector3(0.79, 1.44, 0.1),
  ];
  car.add(createPlotterSegments(lines, 'secondary'));

  // 4 Wheels
  addWheel(car, -0.88, 0.35, -1.35, 0.35, 0.24);
  addWheel(car, 0.88, 0.35, -1.35, 0.35, 0.24);
  addWheel(car, -0.88, 0.35, 1.35, 0.35, 0.24);
  addWheel(car, 0.88, 0.35, 1.35, 0.35, 0.24);

  // --- TIER 1 (15%): 3D Sculpted Hood Dome, Wheel Fender Flares, Side Mirrors & Spoiler ---
  const tier1 = new THREE.Group();
  // Raised hood power-dome cowling
  const hoodDomeGeo = new THREE.BoxGeometry(1.18, 0.08, 1.15);
  hoodDomeGeo.translate(0, 0.91, -1.52);
  tier1.add(createPlotterMesh(hoodDomeGeo, { inkWeight: 'secondary' }));

  // Rear deck trunk lip spoiler
  const spoilerGeo = new THREE.BoxGeometry(1.62, 0.09, 0.18);
  spoilerGeo.translate(0, 0.92, 2.1);
  tier1.add(createPlotterMesh(spoilerGeo));

  // 4 Flared 3D wheel-arch fender boxes
  for (const sx of [-0.94, 0.94]) {
    for (const wz of [-1.35, 1.35]) {
      const archGeo = new THREE.BoxGeometry(0.12, 0.18, 0.82);
      archGeo.translate(sx, 0.68, wz);
      tier1.add(createPlotterMesh(archGeo, { inkWeight: 'secondary' }));
    }
    // Side-view mirrors on stalks
    const mirrorGeo = new THREE.BoxGeometry(0.22, 0.13, 0.16);
    mirrorGeo.translate(sx + Math.sign(sx) * 0.08, 0.96, -0.78);
    tier1.add(createPlotterMesh(mirrorGeo));
  }
  car.add(tagObjectDetail(tier1, 15));

  // --- TIER 2 (35%): 3D Headlight/Taillight Clusters, Radiator Grille, Rocker Skirts & Exhaust ---
  const tier2 = new THREE.Group();
  // Front radiator grille 3D housing
  const grilleGeo = new THREE.BoxGeometry(0.84, 0.24, 0.08);
  grilleGeo.translate(0, 0.54, -2.24);
  tier2.add(createPlotterMesh(grilleGeo));

  // Left & Right 3D Headlight & Taillight housings
  for (const sx of [-0.66, 0.66]) {
    const hlGeo = new THREE.BoxGeometry(0.36, 0.16, 0.08);
    hlGeo.translate(sx, 0.64, -2.23);
    tier2.add(createPlotterMesh(hlGeo));

    const tlGeo = new THREE.BoxGeometry(0.42, 0.16, 0.08);
    tlGeo.translate(sx, 0.66, 2.23);
    tier2.add(createPlotterMesh(tlGeo));
  }

  // Side rocker panel skirts & twin rear exhaust pipes
  for (const sx of [-0.93, 0.93]) {
    const skirtGeo = new THREE.BoxGeometry(0.08, 0.1, 1.85);
    skirtGeo.translate(sx, 0.27, 0);
    tier2.add(createPlotterMesh(skirtGeo, { inkWeight: 'secondary' }));
  }
  for (const ex of [-0.52, 0.52]) {
    const pipeGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.28, 8);
    pipeGeo.rotateX(Math.PI / 2);
    pipeGeo.translate(ex, 0.26, 2.34);
    tier2.add(createPlotterMesh(pipeGeo, { thresholdAngle: 1 }));
  }
  car.add(tagObjectDetail(tier2, 35));

  // --- TIER 3 (60%): 3D Roof Rack Crossbars, Sloped Windshield A/C Pillars & Door Handles ---
  const tier3 = new THREE.Group();
  for (const rz of [-0.35, 0.65]) {
    const rackBarGeo = new THREE.BoxGeometry(1.42, 0.06, 0.09);
    rackBarGeo.translate(0, 1.47, rz);
    tier3.add(createPlotterMesh(rackBarGeo));
  }
  // Shark-fin roof antenna
  const finGeo = new THREE.ConeGeometry(0.06, 0.16, 4);
  finGeo.translate(0, 1.52, 0.98);
  tier3.add(createPlotterMesh(finGeo));

  // Sloped A-pillar and C-pillar wireframe struts + door handles + wiper blades
  const pillarLines: THREE.Vector3[] = [];
  for (const sx of [-0.78, 0.78]) {
    pillarLines.push(
      // Sloped front windshield A-pillar
      new THREE.Vector3(sx * 1.15, 0.88, -1.25),
      new THREE.Vector3(sx, 1.44, -0.92),
      // Sloped rear backlight C-pillar
      new THREE.Vector3(sx, 1.44, 1.22),
      new THREE.Vector3(sx * 1.15, 0.88, 1.65)
    );
  }
  // Windshield wipers & grille horizontal louvers
  for (let y = 0.44; y <= 0.62; y += 0.06) {
    pillarLines.push(
      new THREE.Vector3(-0.4, y, -2.29),
      new THREE.Vector3(0.4, y, -2.29)
    );
  }
  const pillarSegs = createPlotterSegments(pillarLines, 'primary');
  pillarSegs.userData.alwaysVisibleInSobel = true;
  tier3.add(pillarSegs);
  car.add(tagObjectDetail(tier3, 60));

  // --- TIER 4 (82%): Dense CAD Body Mesh Subdivisions & Interior Seats/Steering Wheel ---
  const tier4 = new THREE.Group();
  // Interior front bucket seats & headrests visible inside wireframe greenhouse
  for (const sx of [-0.38, 0.38]) {
    const seatGeo = new THREE.BoxGeometry(0.42, 0.48, 0.14);
    seatGeo.translate(sx, 1.05, 0.18);
    tier4.add(createPlotterMesh(seatGeo, { inkWeight: 'secondary' }));
  }
  // Dense wireframe surface flow subdivisions across hood, roof, and side doors
  const meshFlowLines: THREE.Vector3[] = [];
  for (const xOff of [-0.6, -0.3, 0, 0.3, 0.6]) {
    meshFlowLines.push(
      // Hood flow lines
      new THREE.Vector3(xOff, 0.89, -0.92),
      new THREE.Vector3(xOff, 0.89, -2.22),
      // Roof flow lines
      new THREE.Vector3(xOff, 1.45, -0.92),
      new THREE.Vector3(xOff, 1.45, 1.22),
      // Trunk deck flow lines
      new THREE.Vector3(xOff, 0.89, 1.22),
      new THREE.Vector3(xOff, 0.89, 2.22)
    );
  }
  for (const sx of [-0.94, 0.94]) {
    for (const yCrease of [0.46, 0.68]) {
      meshFlowLines.push(
        new THREE.Vector3(sx, yCrease, -2.1),
        new THREE.Vector3(sx, yCrease, 2.1)
      );
    }
  }
  const flowSegs = createPlotterSegments(meshFlowLines, 'secondary');
  flowSegs.userData.alwaysVisibleInSobel = true;
  tier4.add(flowSegs);
  car.add(tagObjectDetail(tier4, 82));

  return car;
}

export function createTruckModel(): THREE.Group {
  const truck = new THREE.Group();

  // Base Chassis Frame Rail
  const frameGeo = new THREE.BoxGeometry(1.9, 0.38, 7.8);
  frameGeo.translate(0, 0.62, 0.2);
  truck.add(createPlotterMesh(frameGeo));

  // Base Front Cab Lower + Upper
  const cabLower = new THREE.BoxGeometry(2.2, 1.15, 2.1);
  cabLower.translate(0, 1.25, -2.75);
  truck.add(createPlotterMesh(cabLower));

  const cabUpper = new THREE.BoxGeometry(2.05, 0.85, 1.65);
  cabUpper.translate(0, 2.25, -2.55);
  truck.add(createPlotterMesh(cabUpper));

  // Base Rear Cargo Box
  const cargoGeo = new THREE.BoxGeometry(2.42, 2.75, 5.55);
  cargoGeo.translate(0, 2.18, 1.35);
  truck.add(createPlotterMesh(cargoGeo));

  // Base Structural Rib Lines along Cargo Box Sides
  const ribs: THREE.Vector3[] = [];
  for (let z = -1.0; z <= 3.6; z += 1.15) {
    for (const sx of [-1.22, 1.22]) {
      ribs.push(
        new THREE.Vector3(sx, 0.82, z),
        new THREE.Vector3(sx, 3.54, z)
      );
    }
  }
  truck.add(createPlotterSegments(ribs, 'secondary'));

  // Wheels (Front Axle + Dual Rear Axles)
  for (const zAxle of [-2.75, 1.75, 3.05]) {
    addWheel(truck, -1.02, 0.48, zAxle, 0.48, 0.3);
    addWheel(truck, 1.02, 0.48, zAxle, 0.48, 0.3);
  }

  // --- TIER 1 (15%): 3D Aerodynamic Roof Fairing, Side Fuel Tanks & Underrun Guards ---
  const tier1 = new THREE.Group();
  const fairingGeo = new THREE.BoxGeometry(1.95, 0.65, 1.35);
  fairingGeo.rotateX(0.28);
  fairingGeo.translate(0, 2.92, -2.35);
  tier1.add(createPlotterMesh(fairingGeo));

  for (const sx of [-1.05, 1.05]) {
    // Cylindrical diesel saddle tank
    const tankGeo = new THREE.CylinderGeometry(0.32, 0.32, 1.45, 12);
    tankGeo.rotateX(Math.PI / 2);
    tankGeo.translate(sx, 0.65, -0.55);
    tier1.add(createPlotterMesh(tankGeo, { thresholdAngle: 1 }));

    // Side underrun protection rail
    const guardGeo = new THREE.BoxGeometry(0.08, 0.24, 1.85);
    guardGeo.translate(sx * 1.12, 0.58, 0.65);
    tier1.add(createPlotterMesh(guardGeo, { inkWeight: 'secondary' }));
  }
  truck.add(tagObjectDetail(tier1, 15));

  // --- TIER 2 (35%): Dual Exhaust Stacks, Bull-Bar Grille, Mirrors & Rear Roll-Up Door ---
  const tier2 = new THREE.Group();
  for (const sx of [-1.08, 1.08]) {
    // Vertical chrome exhaust stack cylinder
    const stackGeo = new THREE.CylinderGeometry(0.09, 0.09, 2.45, 10);
    stackGeo.translate(sx, 2.15, -1.62);
    tier2.add(createPlotterMesh(stackGeo, { thresholdAngle: 1 }));

    // Heavy-duty West Coast towing mirror loop + housing
    const mirrorGeo = new THREE.BoxGeometry(0.18, 0.52, 0.14);
    mirrorGeo.translate(sx * 1.14, 2.18, -3.15);
    tier2.add(createPlotterMesh(mirrorGeo));
  }
  // Front heavy radiator grille & bumper bull-bar
  const bullGeo = new THREE.BoxGeometry(2.26, 0.52, 0.18);
  bullGeo.translate(0, 0.85, -3.88);
  tier2.add(createPlotterMesh(bullGeo));
  truck.add(tagObjectDetail(tier2, 35));

  // --- TIER 3 (60%): 3D Cargo Refrigeration Unit with Multi-Segment Fan Shroud ---
  const tier3 = new THREE.Group();
  const reeferGeo = new THREE.BoxGeometry(1.65, 0.82, 0.42);
  reeferGeo.translate(0, 3.05, -1.62);
  tier3.add(createPlotterMesh(reeferGeo));

  const fanGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.46, 14);
  fanGeo.rotateX(Math.PI / 2);
  fanGeo.translate(0, 3.05, -1.64);
  tier3.add(createPlotterMesh(fanGeo, { thresholdAngle: 1 }));
  truck.add(tagObjectDetail(tier3, 60));

  // --- TIER 4 (80%): High-Density Cargo Corrugation Mesh & Rear Door Lock Bars ---
  const tier4Lines: THREE.Vector3[] = [];
  for (let z = -1.3; z <= 3.9; z += 0.38) {
    for (const sx of [-1.22, 1.22]) {
      tier4Lines.push(
        new THREE.Vector3(sx, 0.82, z),
        new THREE.Vector3(sx, 3.54, z)
      );
    }
    // Roof transverse ribs
    tier4Lines.push(
      new THREE.Vector3(-1.21, 3.56, z),
      new THREE.Vector3(1.21, 3.56, z)
    );
  }
  // Rear roll-up door horizontal slats & vertical lock rods
  for (let y = 0.95; y <= 3.45; y += 0.28) {
    tier4Lines.push(
      new THREE.Vector3(-1.15, y, 4.14),
      new THREE.Vector3(1.15, y, 4.14)
    );
  }
  for (const rx of [-0.38, 0.38]) {
    tier4Lines.push(
      new THREE.Vector3(rx, 0.85, 4.15),
      new THREE.Vector3(rx, 3.52, 4.15)
    );
  }
  const tier4Segs = createPlotterSegments(tier4Lines, 'secondary');
  tier4Segs.userData.alwaysVisibleInSobel = true;
  truck.add(tagObjectDetail(tier4Segs, 80));

  return truck;
}

export function createBusModel(): THREE.Group {
  const bus = new THREE.Group();

  // Base Main Coach Body
  const bodyGeo = new THREE.BoxGeometry(2.52, 2.75, 10.4);
  bodyGeo.translate(0, 1.72, 0);
  bus.add(createPlotterMesh(bodyGeo));

  // Base Roof AC Pods
  for (const zPod of [-2.4, 1.8]) {
    const podGeo = new THREE.BoxGeometry(1.6, 0.32, 2.1);
    podGeo.translate(0, 3.25, zPod);
    bus.add(createPlotterMesh(podGeo));
  }

  // Base Side Window Frame Lines
  const winLines: THREE.Vector3[] = [];
  for (const sx of [-1.27, 1.27]) {
    winLines.push(
      new THREE.Vector3(sx, 1.65, -4.8),
      new THREE.Vector3(sx, 1.65, 4.8),
      new THREE.Vector3(sx, 2.65, -4.8),
      new THREE.Vector3(sx, 2.65, 4.8)
    );
    for (let z = -4.8; z <= 4.8; z += 1.6) {
      winLines.push(
        new THREE.Vector3(sx, 1.65, z),
        new THREE.Vector3(sx, 2.65, z)
      );
    }
  }
  bus.add(createPlotterSegments(winLines, 'secondary'));

  for (const zAxle of [-3.1, 2.9]) {
    addWheel(bus, -1.12, 0.48, zAxle, 0.48, 0.32);
    addWheel(bus, 1.12, 0.48, zAxle, 0.48, 0.32);
  }

  // --- TIER 1 (15%): 3D Front Destination Sign Box, Bumpers & Transit Mirrors ---
  const tier1 = new THREE.Group();
  const signGeo = new THREE.BoxGeometry(1.95, 0.38, 0.16);
  signGeo.translate(0, 2.86, -5.22);
  tier1.add(createPlotterMesh(signGeo));

  const fBumpGeo = new THREE.BoxGeometry(2.58, 0.34, 0.22);
  fBumpGeo.translate(0, 0.52, -5.24);
  tier1.add(createPlotterMesh(fBumpGeo));

  const rBumpGeo = new THREE.BoxGeometry(2.58, 0.34, 0.22);
  rBumpGeo.translate(0, 0.52, 5.24);
  tier1.add(createPlotterMesh(rBumpGeo));

  for (const sx of [-1.36, 1.36]) {
    const mirrorArmGeo = new THREE.BoxGeometry(0.24, 0.55, 0.16);
    mirrorArmGeo.translate(sx, 2.15, -5.15);
    tier1.add(createPlotterMesh(mirrorArmGeo));
  }
  bus.add(tagObjectDetail(tier1, 15));

  // --- TIER 2 (35%): 3D Roof Cooling Fans, Wheel Arches & Folding Entry Doors ---
  const tier2 = new THREE.Group();
  for (const zFan of [-2.8, -2.0, 1.4, 2.2]) {
    const fanGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.14, 14);
    fanGeo.translate(0, 3.45, zFan);
    tier2.add(createPlotterMesh(fanGeo, { thresholdAngle: 1 }));
  }
  for (const sx of [-1.28, 1.28]) {
    for (const zAxle of [-3.1, 2.9]) {
      const archGeo = new THREE.BoxGeometry(0.1, 0.24, 1.15);
      archGeo.translate(sx, 0.88, zAxle);
      tier2.add(createPlotterMesh(archGeo, { inkWeight: 'secondary' }));
    }
  }
  bus.add(tagObjectDetail(tier2, 35));

  // --- TIER 3 (60%): 3D Interior Passenger Seat Rows Visible Through Coach Windows ---
  const tier3 = new THREE.Group();
  for (let zSeat = -3.6; zSeat <= 4.0; zSeat += 1.25) {
    for (const sx of [-0.75, 0.75]) {
      const seatBackGeo = new THREE.BoxGeometry(0.68, 0.62, 0.12);
      seatBackGeo.translate(sx, 1.65, zSeat);
      tier3.add(createPlotterMesh(seatBackGeo, { inkWeight: 'secondary' }));
    }
  }
  bus.add(tagObjectDetail(tier3, 60));

  // --- TIER 4 (80%): Dense Coach Spaceframe Structural Truss & Engine Louvers ---
  const tier4Lines: THREE.Vector3[] = [];
  for (let z = -4.8; z <= 4.8; z += 0.8) {
    for (const sx of [-1.27, 1.27]) {
      // Lower skirt panel vertical stiffeners & upper transom bars
      tier4Lines.push(
        new THREE.Vector3(sx, 0.38, z),
        new THREE.Vector3(sx, 1.65, z),
        new THREE.Vector3(sx, 2.38, z - 0.35),
        new THREE.Vector3(sx, 2.38, z + 0.35)
      );
    }
    // Roof transverse ribs
    tier4Lines.push(
      new THREE.Vector3(-1.25, 3.1, z),
      new THREE.Vector3(1.25, 3.1, z)
    );
  }
  // Rear engine louver slats
  for (let y = 0.75; y <= 1.55; y += 0.12) {
    tier4Lines.push(
      new THREE.Vector3(-0.95, y, 5.22),
      new THREE.Vector3(0.95, y, 5.22)
    );
  }
  const tier4Segs = createPlotterSegments(tier4Lines, 'secondary');
  tier4Segs.userData.alwaysVisibleInSobel = true;
  bus.add(tagObjectDetail(tier4Segs, 80));

  return bus;
}

export function buildVehiclesScene(density = 1.0): {
  group: THREE.Group;
  animatedVehicles: AnimatedVehicle[];
} {
  const group = new THREE.Group();
  group.name = 'StreetVehicles';
  const animatedVehicles: AnimatedVehicle[] = [];

  if (density <= 0) {
    return { group, animatedVehicles };
  }

  const placements: Array<{
    laneX: number;
    z: number;
    dir: 1 | -1;
    type: 'car' | 'truck' | 'bus';
    speed: number;
  }> = [
    // Northbound (-Z direction, right lanes)
    { laneX: 2.0, z: 122, dir: -1, type: 'car', speed: 12 },
    { laneX: 5.8, z: 92, dir: -1, type: 'truck', speed: 9 },
    { laneX: 2.0, z: 64, dir: -1, type: 'car', speed: 13 },
    { laneX: 5.8, z: 22, dir: -1, type: 'bus', speed: 8.5 },
    { laneX: 2.0, z: -12, dir: -1, type: 'car', speed: 12.5 },
    { laneX: 5.8, z: -56, dir: -1, type: 'car', speed: 11 },
    { laneX: 2.0, z: -88, dir: -1, type: 'truck', speed: 9.5 },
    { laneX: 5.8, z: -135, dir: -1, type: 'car', speed: 11.5 },
    { laneX: 2.0, z: -165, dir: -1, type: 'car', speed: 13 },

    // Southbound (+Z direction, left lanes)
    { laneX: -2.0, z: 130, dir: 1, type: 'car', speed: 11.5 },
    { laneX: -5.8, z: 82, dir: 1, type: 'bus', speed: 8.5 },
    { laneX: -2.0, z: 48, dir: 1, type: 'truck', speed: 9.5 },
    { laneX: -5.8, z: 14, dir: 1, type: 'car', speed: 11 },
    { laneX: -2.0, z: -24, dir: 1, type: 'car', speed: 13 },
    { laneX: -5.8, z: -68, dir: 1, type: 'truck', speed: 9 },
    { laneX: -2.0, z: -96, dir: 1, type: 'car', speed: 12 },
    { laneX: -5.8, z: -144, dir: 1, type: 'car', speed: 10.5 },
    { laneX: -2.0, z: -192, dir: 1, type: 'bus', speed: 8.5 },
  ];

  let vehicleIdx = 0;
  for (const p of placements) {
    vehicleIdx++;
    if (density < 1.0 && (vehicleIdx % 10) / 10 >= density) {
      continue;
    }

    const model =
      p.type === 'truck'
        ? createTruckModel()
        : p.type === 'bus'
          ? createBusModel()
          : createCarModel();

    model.position.set(p.laneX, 0, p.z);
    if (p.dir === 1) {
      model.rotation.y = Math.PI;
    }

    group.add(model);
    animatedVehicles.push({
      mesh: model,
      speedZ: p.dir * p.speed,
      minZ: -235,
      maxZ: 158,
    });
  }

  return { group, animatedVehicles };
}

export function updateVehicles(
  vehicles: AnimatedVehicle[],
  dt: number
): void {
  for (const v of vehicles) {
    v.mesh.position.z += v.speedZ * dt;
    if (v.speedZ < 0 && v.mesh.position.z < v.minZ) {
      v.mesh.position.z = v.maxZ;
    } else if (v.speedZ > 0 && v.mesh.position.z > v.maxZ) {
      v.mesh.position.z = v.minZ;
    }
  }
}
