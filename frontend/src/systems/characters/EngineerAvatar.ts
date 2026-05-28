import * as THREE from 'three';
import { createHumanoid, disposeCharacter } from './CharacterFactory';

export interface EngineerAvatarOptions {
  name?: string;
  height?: number;
  helmetColor?: number;
  vestColor?: number;
  toolColor?: number;
}

const DEFAULT_HELMET = 0xffc107;
const DEFAULT_VEST = 0xff7043;
const DEFAULT_TOOL = 0x607d8b;

export class EngineerAvatar {
  public readonly mesh: THREE.Group;
  private readonly toolkit: THREE.Group;

  constructor(options: EngineerAvatarOptions = {}) {
    const {
      name = 'Engineer',
      height = 1.78,
      helmetColor = DEFAULT_HELMET,
      vestColor = DEFAULT_VEST,
      toolColor = DEFAULT_TOOL
    } = options;

    this.mesh = createHumanoid({
      name,
      height,
      topColor: 0xf1f2f6,
      bottomColor: 0x2f3640,
      bodyColor: vestColor,
      accessoryType: 'helmet',
      helmetColor
    });

    this.toolkit = this.createToolkit(toolColor);
    this.mesh.add(this.toolkit);

    this.addSafetyVestDetails();
    this.addEngineerAccessories();
  }

  private createToolkit(color: number): THREE.Group {
    const toolkit = new THREE.Group();
    toolkit.name = `${this.mesh.name}_Toolkit`;

    const beltGeometry = new THREE.BoxGeometry(0.7, 0.12, 0.2);
    const beltMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.25 });
    const belt = new THREE.Mesh(beltGeometry, beltMaterial);
    belt.position.set(0, 0.82, 0);
    belt.castShadow = true;
    belt.receiveShadow = true;
    belt.scale.setScalar(this.mesh.scale.x);

    const beltPocketGeometry = new THREE.BoxGeometry(0.18, 0.22, 0.1);
    const pocketMaterial = new THREE.MeshStandardMaterial({ color: 0x455a64, roughness: 0.9 });

    const pocketLeft = new THREE.Mesh(beltPocketGeometry, pocketMaterial);
    pocketLeft.position.set(-0.24, 0.78, 0.14);
    pocketLeft.castShadow = true;

    const pocketRight = pocketLeft.clone();
    pocketRight.position.x = 0.24;

    const hammerHandle = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 10);
    const hammerHead = new THREE.BoxGeometry(0.22, 0.08, 0.12);

    const handleMaterial = new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.8 });
    const metalMaterial = new THREE.MeshStandardMaterial({ color: 0xb0bec5, roughness: 0.45, metalness: 0.6 });

    const hammerHandleMesh = new THREE.Mesh(hammerHandle, handleMaterial);
    hammerHandleMesh.position.set(-0.24, 0.95, 0.2);
    hammerHandleMesh.rotation.z = Math.PI / 4;

    const hammerHeadMesh = new THREE.Mesh(hammerHead, metalMaterial);
    hammerHeadMesh.position.set(-0.32, 1.07, 0.22);
    hammerHeadMesh.rotation.z = Math.PI / 12;

    const tabletGeometry = new THREE.BoxGeometry(0.3, 0.45, 0.02);
    const tabletMaterial = new THREE.MeshStandardMaterial({ color: 0x90a4ae, roughness: 0.3, metalness: 0.2 });
    const tablet = new THREE.Mesh(tabletGeometry, tabletMaterial);
    tablet.position.set(0.32, 0.75, 0.18);
    tablet.rotation.y = -Math.PI / 6;

    [belt, pocketLeft, pocketRight, hammerHandleMesh, hammerHeadMesh, tablet].forEach((mesh) => {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.scale.setScalar(this.mesh.scale.x);
    });

    toolkit.add(belt, pocketLeft, pocketRight, hammerHandleMesh, hammerHeadMesh, tablet);

    return toolkit;
  }

  private addSafetyVestDetails(): void {
    const vestMesh = this.mesh.getObjectByName(`${this.mesh.name}_Torso`) as THREE.Mesh | null;
    if (!vestMesh) {
      return;
    }

    const vestGroup = new THREE.Group();
    vestGroup.name = `${this.mesh.name}_VestDetails`;

    const stripMaterial = new THREE.MeshStandardMaterial({ color: 0xfff9c4, emissive: 0xfff176, emissiveIntensity: 0.2 });
    const stripGeometry = new THREE.BoxGeometry(0.54, 0.05, 0.02);

    const stripFrontTop = new THREE.Mesh(stripGeometry, stripMaterial);
    stripFrontTop.position.set(0, 0.18, 0.17);

    const stripFrontBottom = stripFrontTop.clone();
    stripFrontBottom.position.y = -0.1;

    const stripBackTop = stripFrontTop.clone();
    stripBackTop.position.z = -0.17;

    const stripBackBottom = stripFrontBottom.clone();
    stripBackBottom.position.z = -0.17;

    const stripSideGeometry = new THREE.BoxGeometry(0.05, 0.3, 0.02);
    const stripSideLeft = new THREE.Mesh(stripSideGeometry, stripMaterial);
    stripSideLeft.position.set(-0.27, 0.02, 0);

    const stripSideRight = stripSideLeft.clone();
    stripSideRight.position.x = 0.27;

    [stripFrontTop, stripFrontBottom, stripBackTop, stripBackBottom, stripSideLeft, stripSideRight].forEach((strip) => {
      strip.castShadow = true;
      strip.receiveShadow = true;
      strip.scale.setScalar(this.mesh.scale.x);
    });

    vestGroup.add(stripFrontTop, stripFrontBottom, stripBackTop, stripBackBottom, stripSideLeft, stripSideRight);

    vestMesh.add(vestGroup);
  }

  private addEngineerAccessories(): void {
    const head = this.mesh.getObjectByName(`${this.mesh.name}_Helmet`) as THREE.Mesh | null;
    if (!head) {
      return;
    }

    const badgeGeometry = new THREE.CircleGeometry(0.08, 16);
    const badgeMaterial = new THREE.MeshStandardMaterial({ color: 0x1e88e5, emissive: 0x1565c0, emissiveIntensity: 0.15 });
    const badge = new THREE.Mesh(badgeGeometry, badgeMaterial);
    badge.position.set(0, -0.12, 0.22);
    badge.scale.setScalar(this.mesh.scale.x);
    badge.castShadow = true;

    head.add(badge);
  }

  public dispose(): void {
    disposeCharacter(this.mesh);
  }
}
