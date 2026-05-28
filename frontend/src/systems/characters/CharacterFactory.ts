import * as THREE from 'three';

const characterMaterials = new WeakMap<THREE.Object3D, THREE.Material[]>();

export interface CharacterOptions {
  name?: string;
  height?: number;
  bodyColor?: number;
  topColor?: number;
  bottomColor?: number;
  skinColor?: number;
  accessoryColor?: number;
  hasHelmet?: boolean;
  helmetColor?: number;
  accessoryType?: 'helmet' | 'cap' | 'none';
  hairColor?: number;
}

const DEFAULT_SKIN = 0xf1c27d;
const DEFAULT_BODY = 0x2f80ed;
const DEFAULT_TOP = 0xf5f5f5;
const DEFAULT_BOTTOM = 0x2d3436;
const DEFAULT_HELMET = 0xffd54f;
const DEFAULT_HAIR = 0x4a3f35;

export function createHumanoid(options: CharacterOptions = {}): THREE.Group {
  const {
    name = 'Character',
    height = 1.75,
    bodyColor = DEFAULT_BODY,
    topColor = DEFAULT_TOP,
    bottomColor = DEFAULT_BOTTOM,
    skinColor = DEFAULT_SKIN,
    accessoryColor = DEFAULT_HELMET,
    helmetColor = DEFAULT_HELMET,
    accessoryType = 'none',
    hairColor = DEFAULT_HAIR
  } = options;

  const character = new THREE.Group();
  character.name = name;

  const scale = height / 1.75;

  const materials = {
    skin: new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.6 }),
    top: new THREE.MeshStandardMaterial({ color: topColor, roughness: 0.7 }),
    bottom: new THREE.MeshStandardMaterial({ color: bottomColor, roughness: 0.8 }),
    body: new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.7 }),
    accessory: new THREE.MeshStandardMaterial({ color: accessoryColor, roughness: 0.4, metalness: 0.2 }),
    helmet: new THREE.MeshStandardMaterial({ color: helmetColor, roughness: 0.45, metalness: 0.12 }),
    hair: new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.9 })
  };

  const torsoHeight = 0.6 * scale;
  const torsoGeometry = new THREE.BoxGeometry(0.6 * scale, torsoHeight, 0.3 * scale, 1, 1, 1);
  const torso = new THREE.Mesh(torsoGeometry, materials.top);
  torso.castShadow = true;
  torso.receiveShadow = true;
  torso.position.y = 0.9 * scale;
  torso.name = `${name}_Torso`;
  character.add(torso);

  const legHeight = 0.7 * scale;
  const legGeometry = new THREE.BoxGeometry(0.18 * scale, legHeight, 0.22 * scale);
  const legLeft = new THREE.Mesh(legGeometry, materials.bottom);
  legLeft.position.set(-0.12 * scale, legHeight / 2, 0);
  legLeft.castShadow = true;
  legLeft.receiveShadow = true;
  legLeft.name = `${name}_LeftLeg`;

  const legRight = legLeft.clone();
  legRight.position.x = 0.12 * scale;
  legRight.name = `${name}_RightLeg`;

  character.add(legLeft, legRight);

  const armHeight = 0.5 * scale;
  const armGeometry = new THREE.CylinderGeometry(0.09 * scale, 0.09 * scale, armHeight, 8);
  const armMaterial = materials.body;

  const armLeft = new THREE.Mesh(armGeometry, armMaterial);
  armLeft.castShadow = true;
  armLeft.receiveShadow = true;
  armLeft.rotation.z = Math.PI / 12;
  armLeft.position.set(-0.42 * scale, torso.position.y + 0.1 * scale, 0);
  armLeft.name = `${name}_LeftArm`;

  const armRight = armLeft.clone();
  armRight.rotation.z = -Math.PI / 12;
  armRight.position.x = 0.42 * scale;
  armRight.name = `${name}_RightArm`;

  character.add(armLeft, armRight);

  const shoulderGeometry = new THREE.SphereGeometry(0.12 * scale, 12, 12);
  const shoulderMaterial = materials.top;
  const shoulderLeft = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
  shoulderLeft.position.set(-0.42 * scale, torso.position.y + torsoHeight / 2 - 0.05 * scale, 0);
  shoulderLeft.castShadow = true;
  shoulderLeft.name = `${name}_LeftShoulder`;

  const shoulderRight = shoulderLeft.clone();
  shoulderRight.position.x = 0.42 * scale;
  shoulderRight.name = `${name}_RightShoulder`;

  character.add(shoulderLeft, shoulderRight);

  const headGeometry = new THREE.SphereGeometry(0.22 * scale, 16, 16);
  const head = new THREE.Mesh(headGeometry, materials.skin);
  head.castShadow = true;
  head.receiveShadow = true;
  head.position.y = torso.position.y + torsoHeight / 2 + 0.3 * scale;
  head.name = `${name}_Head`;
  character.add(head);

  if (accessoryType === 'helmet') {
    const helmetGeometry = new THREE.SphereGeometry(0.25 * scale, 18, 18, 0, Math.PI * 2, 0, Math.PI * 0.65);
    const helmet = new THREE.Mesh(helmetGeometry, materials.helmet);
    helmet.rotation.x = Math.PI;
    helmet.position.copy(head.position).add(new THREE.Vector3(0, 0.05 * scale, 0));
    helmet.castShadow = true;
    helmet.name = `${name}_Helmet`;
    character.add(helmet);

    const brimGeometry = new THREE.CylinderGeometry(0.27 * scale, 0.27 * scale, 0.05 * scale, 24, 1, true);
    const brim = new THREE.Mesh(brimGeometry, materials.helmet);
    brim.position.copy(head.position).add(new THREE.Vector3(0, -0.08 * scale, 0));
    brim.castShadow = true;
    brim.receiveShadow = true;
    brim.name = `${name}_HelmetBrim`;
    character.add(brim);
  } else if (accessoryType === 'cap') {
    const capGeometry = new THREE.SphereGeometry(0.24 * scale, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const cap = new THREE.Mesh(capGeometry, materials.accessory);
    cap.rotation.x = Math.PI;
    cap.position.copy(head.position).add(new THREE.Vector3(0, 0.03 * scale, 0));
    cap.castShadow = true;
    cap.name = `${name}_Cap`;
    character.add(cap);
  } else {
    const hairGeometry = new THREE.SphereGeometry(0.24 * scale, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const hair = new THREE.Mesh(hairGeometry, materials.hair);
    hair.rotation.x = Math.PI;
    hair.position.copy(head.position).add(new THREE.Vector3(0, 0.04 * scale, 0));
    hair.castShadow = true;
    hair.name = `${name}_Hair`;
    character.add(hair);
  }

  const handGeometry = new THREE.SphereGeometry(0.09 * scale, 12, 12);
  const handLeft = new THREE.Mesh(handGeometry, materials.skin);
  handLeft.position.copy(armLeft.position).add(new THREE.Vector3(0, -armHeight / 2, 0));
  handLeft.castShadow = true;
  handLeft.name = `${name}_LeftHand`;

  const handRight = handLeft.clone();
  handRight.position.copy(armRight.position).add(new THREE.Vector3(0, -armHeight / 2, 0));
  handRight.name = `${name}_RightHand`;

  character.add(handLeft, handRight);

  const footGeometry = new THREE.BoxGeometry(0.2 * scale, 0.08 * scale, 0.32 * scale);
  const footMaterial = materials.bottom.clone();
  footMaterial.color.offsetHSL(0, 0, -0.1);
  const footLeft = new THREE.Mesh(footGeometry, footMaterial);
  footLeft.position.set(-0.12 * scale, 0.04 * scale, 0.1 * scale);
  footLeft.castShadow = true;
  footLeft.receiveShadow = true;
  footLeft.name = `${name}_LeftFoot`;

  const footRight = footLeft.clone();
  footRight.position.x = 0.12 * scale;
  footRight.name = `${name}_RightFoot`;

  character.add(footLeft, footRight);

  character.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  character.position.y = 0;

  characterMaterials.set(character, Object.values(materials));

  return character;
}

export function disposeCharacter(character: THREE.Group): void {
  character.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.geometry.dispose();
      if (Array.isArray(object.material)) {
        object.material.forEach((mat) => mat.dispose());
      } else {
        object.material.dispose();
      }
    }
  });

  const storedMaterials = characterMaterials.get(character);
  storedMaterials?.forEach((mat) => mat.dispose());
  characterMaterials.delete(character);
}
