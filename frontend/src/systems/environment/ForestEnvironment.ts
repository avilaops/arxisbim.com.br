import * as THREE from 'three';

export interface ForestEnvironmentOptions {
  groundSize?: number;
  treeRingRadius?: number;
  treeCount?: number;
}

/**
 * ForestEnvironment - cria um cenário campestre simples com gramado, árvores e céu panorâmico.
 * Gera todas as texturas proceduralmente para evitar dependências externas.
 */
export class ForestEnvironment {
  private scene: THREE.Scene;
  private ground: THREE.Mesh | null = null;
  private skyDome: THREE.Mesh | null = null;
  private trees: THREE.Object3D[] = [];
  private fog: THREE.Fog | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public setup(options: ForestEnvironmentOptions = {}): void {
    const {
      groundSize = 600,
      treeRingRadius = 220,
      treeCount = 42
    } = options;

    this.dispose();

    this.scene.background = new THREE.Color(0xb6d6ff);

    this.hideGridHelpers();

    this.fog = new THREE.Fog(0xb6d6ff, Math.max(treeRingRadius * 0.8, 120), groundSize * 1.5);
    this.scene.fog = this.fog;

    this.createGround(groundSize);
    this.createTreeRing(treeCount, treeRingRadius, groundSize * 0.45);
    this.createSkyDome(groundSize * 1.3);
  }

  public dispose(): void {
    if (this.ground) {
      this.scene.remove(this.ground);
      this.ground.geometry.dispose();
      if (this.ground.material instanceof THREE.Material) {
        this.disposeMaterial(this.ground.material);
      }
      this.ground = null;
    }

    if (this.skyDome) {
      this.scene.remove(this.skyDome);
      this.skyDome.geometry.dispose();
      if (this.skyDome.material instanceof THREE.Material) {
        this.disposeMaterial(this.skyDome.material);
      }
      this.skyDome = null;
    }

    this.trees.forEach((tree) => {
      this.scene.remove(tree);
      tree.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => this.disposeMaterial(mat));
          } else if (child.material) {
            this.disposeMaterial(child.material);
          }
        }
      });
    });
    this.trees = [];
  }

  private createGround(size: number): void {
    const geometry = new THREE.PlaneGeometry(size, size, 1, 1);
    const texture = this.createGrassTexture();
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(size / 40, size / 40);

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 1,
      metalness: 0,
      color: 0xffffff
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    mesh.name = 'ForestGround';

    this.scene.add(mesh);
    this.ground = mesh;
  }

  private createTreeRing(treeCount: number, radius: number, innerRadius: number): void {
    for (let i = 0; i < treeCount; i++) {
      const tree = this.createTree();
      const angle = (i / treeCount) * Math.PI * 2 + Math.random() * 0.2;
      const randomRadius = THREE.MathUtils.lerp(innerRadius, radius, Math.random());
      tree.position.set(
        Math.cos(angle) * randomRadius,
        0,
        Math.sin(angle) * randomRadius
      );
      tree.lookAt(0, tree.position.y, 0);
      this.scene.add(tree);
      this.trees.push(tree);
    }
  }

  private createTree(): THREE.Group {
    const group = new THREE.Group();

    const trunkHeight = THREE.MathUtils.randFloat(4, 6.5);
    const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, trunkHeight, 6);
    const trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b5a2b,
      roughness: 0.8,
      metalness: 0.1
    });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.castShadow = true;
    trunk.position.y = trunkHeight / 2;
    group.add(trunk);

    const canopyHeight = trunkHeight * THREE.MathUtils.randFloat(1.6, 2.2);
    const canopyRadius = trunkHeight * THREE.MathUtils.randFloat(0.7, 0.9);
    const canopyGeometry = new THREE.ConeGeometry(canopyRadius, canopyHeight, 12, 1);
    const canopyMaterial = new THREE.MeshStandardMaterial({
      color: 0x1f5e2e,
      roughness: 0.7,
      metalness: 0.05
    });
    const canopy = new THREE.Mesh(canopyGeometry, canopyMaterial);
    canopy.castShadow = true;
    canopy.position.y = trunkHeight + canopyHeight / 2 - 0.5;
    group.add(canopy);

    const sway = (Math.random() - 0.5) * 0.1;
    group.rotation.y = sway;

    return group;
  }

  private createSkyDome(radius: number): void {
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const texture = this.createSkyTexture();
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.repeat.set(2, 1);

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      depthWrite: false
    });

    const dome = new THREE.Mesh(geometry, material);
    dome.name = 'ForestSkyDome';
    this.scene.add(dome);
    this.skyDome = dome;
  }

  private hideGridHelpers(): void {
    this.scene.traverse((object) => {
      if (object instanceof THREE.GridHelper) {
        object.visible = false;
      }
    });
  }

  private createGrassTexture(): THREE.CanvasTexture {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context unavailable');
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, size);
    gradient.addColorStop(0, '#6f9258');
    gradient.addColorStop(1, '#3f5e34');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 1600; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const length = 8 + Math.random() * 14;
      const angle = Math.random() * Math.PI * 2;
      ctx.strokeStyle = `rgba(255,255,255,${Math.random() * 0.08})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
      ctx.stroke();
    }

    for (let i = 0; i < 1200; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)';
      const x = Math.random() * size;
      const y = Math.random() * size;
      ctx.fillRect(x, y, 1, 1 + Math.random() * 3);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 4;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private createSkyTexture(): THREE.CanvasTexture {
    const width = 1024;
    const height = 512;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context unavailable');
    }

    const skyGradient = ctx.createLinearGradient(0, 0, 0, height);
    skyGradient.addColorStop(0, '#b6d6ff');
    skyGradient.addColorStop(0.55, '#8fc1ff');
    skyGradient.addColorStop(0.85, '#3a5f3b');
    skyGradient.addColorStop(1, '#234027');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, width, height);

    const treeSilhouetteHeight = height * 0.25;
    const baseY = height - treeSilhouetteHeight;

    ctx.fillStyle = '#1d3120';
    ctx.fillRect(0, baseY, width, treeSilhouetteHeight);

    const silhouetteCount = 18;
    for (let i = 0; i < silhouetteCount; i++) {
      const treeWidth = 60 + Math.random() * 120;
      const treeHeight = treeSilhouetteHeight * (0.6 + Math.random() * 0.35);
      const x = (i / silhouetteCount) * width + Math.random() * 30;
      const trunkWidth = treeWidth * 0.12;
      const trunkHeight = treeHeight * 0.25;

      ctx.fillStyle = '#2b3d23';
      ctx.fillRect(x, baseY + treeSilhouetteHeight - trunkHeight, trunkWidth, trunkHeight);

      ctx.fillStyle = '#1f3b1f';
      ctx.beginPath();
      ctx.moveTo(x + trunkWidth / 2, baseY + treeSilhouetteHeight - treeHeight);
      ctx.lineTo(x - treeWidth / 2, baseY + treeSilhouetteHeight);
      ctx.lineTo(x + treeWidth / 2 + trunkWidth, baseY + treeSilhouetteHeight);
      ctx.closePath();
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return texture;
  }

  private disposeMaterial(material: THREE.Material): void {
    const anyMaterial = material as THREE.Material & { map?: THREE.Texture };

    if (anyMaterial.map) {
      anyMaterial.map.dispose();
    }
    if ((material as any).lightMap) {
      (material as any).lightMap.dispose();
    }
    if ((material as any).aoMap) {
      (material as any).aoMap.dispose();
    }
    material.dispose();
  }
}
