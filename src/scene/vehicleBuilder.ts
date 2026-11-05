import * as THREE from 'three';
import { createPlotterMesh, createPlotterSegments } from './plotterMaterial';

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
  const wheelGeo = new THREE.CylinderGeometry(radius, radius, width, 8);
  wheelGeo.rotateZ(Math.PI / 2);
  wheelGeo.translate(x, y, z);
  group.add(createPlotterMesh(wheelGeo, { thresholdAngle: 12 }));
}

export function createCarModel(): THREE.Group {
  const car = new THREE.Group();

  // Lower body chassis
  const bodyGeo = new THREE.BoxGeometry(1.86, 0.64, 4.45);
  bodyGeo.translate(0, 0.56, 0);
  car.add(createPlotterMesh(bodyGeo));

  // Front & rear bumpers
  const fBumper = new THREE.BoxGeometry(1.9, 0.26, 0.25);
  fBumper.translate(0, 0.38, -2.25);
  car.add(createPlotterMesh(fBumper));

  const rBumper = new THREE.BoxGeometry(1.9, 0.26, 0.25);
  rBumper.translate(0, 0.38, 2.25);
  car.add(createPlotterMesh(rBumper));

  // Cabin greenhouse
  const cabinGeo = new THREE.BoxGeometry(1.56, 0.56, 2.15);
  cabinGeo.translate(0, 1.16, 0.15);
  car.add(createPlotterMesh(cabinGeo));

  // Window pillar & door seam lines
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

  // 4 wheels
  addWheel(car, -0.88, 0.35, -1.35, 0.35, 0.24);
  addWheel(car, 0.88, 0.35, -1.35, 0.35, 0.24);
  addWheel(car, -0.88, 0.35, 1.35, 0.35, 0.24);
  addWheel(car, 0.88, 0.35, 1.35, 0.35, 0.24);

  return car;
}

export function createTruckModel(): THREE.Group {
  const truck = new THREE.Group();

  // Chassis frame rail
  const frameGeo = new THREE.BoxGeometry(1.9, 0.38, 7.8);
  frameGeo.translate(0, 0.62, 0.2);
  truck.add(createPlotterMesh(frameGeo));

  // Front cab lower + upper
  const cabLower = new THREE.BoxGeometry(2.2, 1.15, 2.1);
  cabLower.translate(0, 1.25, -2.75);
  truck.add(createPlotterMesh(cabLower));

  const cabUpper = new THREE.BoxGeometry(2.05, 0.85, 1.65);
  cabUpper.translate(0, 2.25, -2.55);
  truck.add(createPlotterMesh(cabUpper));

  // Rear cargo box
  const cargoGeo = new THREE.BoxGeometry(2.42, 2.75, 5.55);
  cargoGeo.translate(0, 2.18, 1.35);
  truck.add(createPlotterMesh(cargoGeo));

  // Structural rib lines along cargo box sides
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

  // Wheels (front axle + dual rear axles)
  for (const zAxle of [-2.75, 1.75, 3.05]) {
    addWheel(truck, -1.02, 0.48, zAxle, 0.48, 0.3);
    addWheel(truck, 1.02, 0.48, zAxle, 0.48, 0.3);
  }

  return truck;
}

export function createBusModel(): THREE.Group {
  const bus = new THREE.Group();

  // Main coach body
  const bodyGeo = new THREE.BoxGeometry(2.52, 2.75, 10.4);
  bodyGeo.translate(0, 1.72, 0);
  bus.add(createPlotterMesh(bodyGeo));

  // Roof AC pods
  for (const zPod of [-2.4, 1.8]) {
    const podGeo = new THREE.BoxGeometry(1.6, 0.32, 2.1);
    podGeo.translate(0, 3.25, zPod);
    bus.add(createPlotterMesh(podGeo));
  }

  // Side window frame lines
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

  // 4 lanes:
  // X = -5.8 (outer southbound, facing +Z)
  // X = -2.0 (inner southbound, facing +Z)
  // X = +2.0 (inner northbound, facing -Z)
  // X = +5.8 (outer northbound, facing -Z)
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
