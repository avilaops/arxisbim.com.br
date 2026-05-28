import * as THREE from 'three';
import { collaborationManager, SharedMeasurement } from './CollaborationManager';

export class SharedMeasurementRenderer {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private root: THREE.Group;
  private objects: Map<string, THREE.Group> = new Map();
  private disposers: Array<() => void> = [];

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    this.root = new THREE.Group();
    this.root.name = 'SharedMeasurements';
    this.scene.add(this.root);

    this.syncMeasurements(collaborationManager.getMeasurements());

    const offMeasurements = collaborationManager.on('measurements', (list: SharedMeasurement[]) => {
      this.syncMeasurements(list);
    });

    const offCleared = collaborationManager.on('measurements_cleared', () => {
      this.clearAll();
    });

    this.disposers.push(offMeasurements, offCleared);
  }

  public update(): void {
    this.objects.forEach((group) => {
      const label: THREE.Sprite | undefined = group.userData.label;
      if (label) {
        label.quaternion.copy(this.camera.quaternion);
      }
    });
  }

  public dispose(): void {
    this.disposers.forEach((dispose) => {
      try {
        dispose();
      } catch (error) {
        console.error('SharedMeasurementRenderer dispose error', error);
      }
    });
    this.disposers = [];

    this.clearAll();
    this.scene.remove(this.root);
  }

  private syncMeasurements(measurements: SharedMeasurement[]): void {
    const ids = new Set(measurements.map((m) => m.id));

    // Remove medição que não existe mais
    this.objects.forEach((_group, id) => {
      if (!ids.has(id)) {
        this.removeMeasurement(id);
      }
    });

    measurements.forEach((measurement) => {
      if (this.objects.has(measurement.id)) {
        this.updateMeasurement(measurement);
      } else {
        this.createMeasurement(measurement);
      }
    });
  }

  private createMeasurement(measurement: SharedMeasurement): void {
    const group = new THREE.Group();
    group.name = `SharedMeasurement_${measurement.id}`;

    const colorHex = this.getAuthorColor(measurement.authorId);
    const color = new THREE.Color(colorHex);

    const points = measurement.points.map((p) => new THREE.Vector3(p.x, p.y, p.z));
    if (points.length < 2) {
      return;
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const lineMaterial = new THREE.LineBasicMaterial({
      color,
      linewidth: 2,
      transparent: true,
      opacity: 0.85
    });
    const line = new THREE.Line(geometry, lineMaterial);
    group.add(line);

    const markerGeometry = new THREE.SphereGeometry(0.12, 16, 16);
    const markerMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });

    points.forEach((point) => {
      const marker = new THREE.Mesh(markerGeometry, markerMaterial.clone());
      marker.position.copy(point);
      marker.renderOrder = 995;
      group.add(marker);
    });

    const label = this.createLabel(`${measurement.distance.toFixed(2)} ${measurement.unit}`, colorHex);
    const midPoint = this.getMidPoint(points);
    label.position.copy(midPoint);
    label.position.y += 0.35;
    group.add(label);
    group.userData.label = label;

    this.root.add(group);
    this.objects.set(measurement.id, group);
  }

  private updateMeasurement(measurement: SharedMeasurement): void {
    const group = this.objects.get(measurement.id);
    if (!group) {
      return;
    }

    this.removeMeasurement(measurement.id);
    this.createMeasurement(measurement);
  }

  private removeMeasurement(id: string): void {
    const group = this.objects.get(id);
    if (!group) return;

    group.traverse((child) => {
      if (child instanceof THREE.Line) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((material) => material.dispose());
        } else {
          child.material.dispose();
        }
      }
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((material) => material.dispose());
        } else {
          child.material.dispose();
        }
      }
      if (child instanceof THREE.Sprite) {
        (child.material as THREE.SpriteMaterial).map?.dispose();
        child.material.dispose();
      }
    });

    this.root.remove(group);
    this.objects.delete(id);
  }

  private clearAll(): void {
    Array.from(this.objects.keys()).forEach((id) => this.removeMeasurement(id));
  }

  private getAuthorColor(authorId: string): string {
    const user = collaborationManager.getUsers().find((u) => u.id === authorId);
    return user?.color ?? '#00d4ff';
  }

  private getMidPoint(points: THREE.Vector3[]): THREE.Vector3 {
    if (points.length === 0) {
      return new THREE.Vector3();
    }

    const start = points[0];
    const end = points[points.length - 1];
    return new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  }

  private createLabel(text: string, colorHex: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Unable to get canvas context for measurement label');
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'rgba(0, 0, 0, 0.65)';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.font = 'bold 28px "Segoe UI", sans-serif';
    context.fillStyle = '#ffffff';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(2.5, 0.7, 1);
    sprite.renderOrder = 996;

    const outline = new THREE.SpriteMaterial({
      map: texture,
      color: new THREE.Color(colorHex),
      transparent: true,
      opacity: 0.15,
      depthTest: false
    });
    const outlineSprite = new THREE.Sprite(outline);
    outlineSprite.scale.set(2.7, 0.8, 1);
    outlineSprite.renderOrder = 994;
    sprite.add(outlineSprite);

    return sprite;
  }
}
