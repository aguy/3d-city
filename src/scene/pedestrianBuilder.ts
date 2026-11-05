import * as THREE from 'three';
import { createPlotterMesh } from './plotterMaterial';

export interface AnimatedPedestrian {
  mesh: THREE.Group;
  velocityZ: number;
  minZ: number;
  maxZ: number;
}

/**
 * Creates a stylized architectural low-poly pedestrian figure (~1.76m tall)
 * with articulated head, torso, arms, and walking-stride legs.
 */
export function createPedestrianFigure(strideAngle = 0.28): THREE.Group {
  const person = new THREE.Group();

  // Head
  const headGeo = new THREE.BoxGeometry(0.24, 0.26, 0.24);
  headGeo.translate(0, 1.62, 0);
  person.add(createPlotterMesh(headGeo));

  // Torso / Coat
  const torsoGeo = new THREE.BoxGeometry(0.42, 0.62, 0.24);
  torsoGeo.translate(0, 1.15, 0);
  person.add(createPlotterMesh(torsoGeo));

  // Left & Right Legs in walking stride
  const leftLegGeo = new THREE.BoxGeometry(0.15, 0.78, 0.16);
  leftLegGeo.translate(0, -0.39, 0);
  leftLegGeo.rotateX(strideAngle);
  leftLegGeo.translate(-0.1, 0.82, 0);
  person.add(createPlotterMesh(leftLegGeo));

  const rightLegGeo = new THREE.BoxGeometry(0.15, 0.78, 0.16);
  rightLegGeo.translate(0, -0.39, 0);
  rightLegGeo.rotateX(-strideAngle);
  rightLegGeo.translate(0.1, 0.82, 0);
  person.add(createPlotterMesh(rightLegGeo));

  // Left & Right Arms counter-swinging
  const leftArmGeo = new THREE.BoxGeometry(0.12, 0.56, 0.13);
  leftArmGeo.translate(0, -0.26, 0);
  leftArmGeo.rotateX(-strideAngle * 0.85);
  leftArmGeo.translate(-0.28, 1.42, 0);
  person.add(createPlotterMesh(leftArmGeo));

  const rightArmGeo = new THREE.BoxGeometry(0.12, 0.56, 0.13);
  rightArmGeo.translate(0, -0.26, 0);
  rightArmGeo.rotateX(strideAngle * 0.85);
  rightArmGeo.translate(0.28, 1.42, 0);
  person.add(createPlotterMesh(rightArmGeo));

  return person;
}

export function buildPedestriansScene(): {
  group: THREE.Group;
  animatedPedestrians: AnimatedPedestrian[];
} {
  const group = new THREE.Group();
  group.name = 'SidewalkPedestrians';
  const animatedPedestrians: AnimatedPedestrian[] = [];

  let seed = 43;
  const nextRand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // 1. Sidewalk pedestrians along both sides of the street canyon
  for (let z = 148; z >= -210; z -= 9.5) {
    for (const side of [-1, 1] as const) {
      const r1 = nextRand();
      const r2 = nextRand();
      const x = side * (9.5 + r1 * 2.1);
      const zPos = z + (r2 - 0.5) * 4.5;
      const dir = r1 > 0.5 ? 1 : -1;
      const stride = 0.18 + r2 * 0.22;

      const ped = createPedestrianFigure(stride);
      ped.position.set(x, 0.24, zPos);
      ped.rotation.y = dir === 1 ? 0 : Math.PI;
      const scale = 0.92 + r1 * 0.16;
      ped.scale.setScalar(scale);

      group.add(ped);
      animatedPedestrians.push({
        mesh: ped,
        velocityZ: dir * (1.2 + r2 * 0.6),
        minZ: -225,
        maxZ: 155,
      });
    }
  }

  // 2. Pedestrians crossing at zebra crosswalks
  const crosswalksZ = [105, 35, -35, -105];
  for (const iz of crosswalksZ) {
    const cwZ = iz + 7.2;
    for (const xPos of [-5.2, -3.4, 1.4, 4.1]) {
      const ped = createPedestrianFigure(0.32);
      ped.position.set(xPos, 0.02, cwZ + (xPos > 0 ? 0.45 : -0.45));
      ped.rotation.y = xPos > 0 ? -Math.PI / 2 : Math.PI / 2;
      group.add(ped);
    }
  }

  return { group, animatedPedestrians };
}

export function updatePedestrians(
  pedestrians: AnimatedPedestrian[],
  dt: number
): void {
  for (const p of pedestrians) {
    p.mesh.position.z += p.velocityZ * dt;
    if (p.velocityZ < 0 && p.mesh.position.z < p.minZ) {
      p.mesh.position.z = p.maxZ;
    } else if (p.velocityZ > 0 && p.mesh.position.z > p.maxZ) {
      p.mesh.position.z = p.minZ;
    }
  }
}
