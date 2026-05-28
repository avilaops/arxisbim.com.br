import * as THREE from 'three';
import { EngineerAvatar } from './EngineerAvatar';
import { createHumanoid, CharacterOptions, disposeCharacter } from './CharacterFactory';

export interface FamilyMemberOptions extends CharacterOptions {
  role: 'partner' | 'child' | 'engineer';
  position?: THREE.Vector3;
  rotationY?: number;
}

export interface FamilySystemOptions {
  origin?: THREE.Vector3;
  spacing?: number;
  childHeightRange?: [number, number];
  animate?: boolean;
}

const DEFAULT_ORIGIN = new THREE.Vector3(0, 0, 0);
const DEFAULT_SPACING = 1.2;
const DEFAULT_CHILD_HEIGHT: [number, number] = [1.1, 1.4];

export class FamilySystem {
  public readonly group: THREE.Group;
  private readonly members: Map<string, THREE.Group> = new Map();
  private mixer?: THREE.AnimationMixer;
  private animations: THREE.AnimationClip[] = [];
  private engineerAvatar: EngineerAvatar;
  private partnerAvatar: THREE.Group;
  private childAvatars: THREE.Group[] = [];

  constructor(options: FamilySystemOptions = {}) {
    const {
      origin = DEFAULT_ORIGIN,
      spacing = DEFAULT_SPACING,
      childHeightRange = DEFAULT_CHILD_HEIGHT,
      animate = true
    } = options;

    this.group = new THREE.Group();
    this.group.name = 'FamilySystem';
    this.group.position.copy(origin);

    this.engineerAvatar = new EngineerAvatar({ name: 'Engineer' });
    this.engineerAvatar.mesh.position.set(-spacing, 0, 0);
    this.group.add(this.engineerAvatar.mesh);
    this.members.set('engineer', this.engineerAvatar.mesh);

    this.partnerAvatar = createHumanoid({
      name: 'Partner',
      topColor: 0x8e44ad,
      bottomColor: 0x2f3640,
      bodyColor: 0xe84393,
      accessoryType: 'none',
      height: 1.7
    });
    this.partnerAvatar.position.set(0, 0, 0);
    this.group.add(this.partnerAvatar);
    this.members.set('partner', this.partnerAvatar);

    const [minHeight, maxHeight] = childHeightRange;
    const childHeights = [minHeight, (minHeight + maxHeight) / 2, maxHeight];

    childHeights.forEach((height, index) => {
      const child = createHumanoid({
        name: `Child_${index + 1}`,
        topColor: 0x74b9ff - index * 0x050505,
        bottomColor: 0x636e72,
        bodyColor: 0xffd86b - index * 0x030303,
        height
      });

      child.position.set(spacing + index * (spacing * 0.8), 0, (index % 2 === 0 ? 1 : -1) * 0.6);
      this.group.add(child);
      this.members.set(`child_${index + 1}`, child);
      this.childAvatars.push(child);
    });

    if (animate) {
      this.setupIdleAnimations();
    }
  }

  private setupIdleAnimations(): void {
    this.mixer = new THREE.AnimationMixer(this.group);

    const idleTracks: THREE.NumberKeyframeTrack[] = [];

    this.members.forEach((mesh, key) => {
      const swayAmplitude = key === 'engineer' ? 0.02 : 0.03;
      const swayDuration = key.startsWith('child') ? 3 + Math.random() : 4;
      const phaseOffset = Math.random() * Math.PI;
      const times = [0, swayDuration / 2, swayDuration];
      const values = times.map((time) => {
        const normalized = time / swayDuration;
        const angle = normalized * Math.PI * 2 + phaseOffset;
        return Math.sin(angle) * swayAmplitude;
      });

      idleTracks.push(new THREE.NumberKeyframeTrack(`${mesh.uuid}.rotation[y]`, times, values));
    });

    const idleClip = new THREE.AnimationClip('FamilyIdle', -1, idleTracks);
    this.animations.push(idleClip);
    this.mixer.clipAction(idleClip).play();
  }

  public update(delta: number): void {
    this.mixer?.update(delta);
  }

  public getMember(role: string): THREE.Group | undefined {
    return this.members.get(role);
  }

  public dispose(): void {
    this.mixer?.stopAllAction();
    this.animations = [];

    disposeCharacter(this.partnerAvatar);
    this.childAvatars.forEach((child) => disposeCharacter(child));
    this.engineerAvatar.dispose();

    this.group.clear();
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}
