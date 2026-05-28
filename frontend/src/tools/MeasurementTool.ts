import * as THREE from 'three';
import { BaseTool } from './Tool';
import { eventBus, EventType, ToolType } from '../core';

/**
 * MeasurementTool - Ferramenta de medição precisa
 * Permite medir distâncias entre pontos no modelo 3D
 */
export class MeasurementTool extends BaseTool {
  public readonly name = 'Measurement Tool';
  public readonly type = ToolType.MEASUREMENT;

  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private mouse: THREE.Vector2;
  
  // Pontos de medição
  private measurePoints: THREE.Vector3[] = [];
  private measurementLine: THREE.Line | null = null;
  private pointMarkers: THREE.Mesh[] = [];
  
  // Geometrias e materiais
  private markerGeometry: THREE.SphereGeometry;
  private markerMaterial: THREE.MeshBasicMaterial;
  private lineMaterial: THREE.LineBasicMaterial;
  
  // Labels HTML
  private measurementLabels: HTMLElement[] = [];

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    super();
    this.scene = scene;
    this.camera = camera;
    this.mouse = new THREE.Vector2();

    // Geometria dos marcadores (esferas)
    this.markerGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    this.markerMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      depthTest: false,
      transparent: true,
      opacity: 0.9
    });

    // Material da linha
    this.lineMaterial = new THREE.LineBasicMaterial({
      color: 0xff0000,
      linewidth: 2,
      depthTest: false,
      transparent: true,
      opacity: 0.9
    });
  }

  public activate(): void {
    super.activate();
    document.body.style.cursor = 'crosshair';
    console.log('📏 Measurement Tool: Click on points to measure distances. Press ESC to clear.');
  }

  public deactivate(): void {
    super.deactivate();
    document.body.style.cursor = 'default';
    this.clear();
  }

  public onPointerDown(event: PointerEvent, raycaster: THREE.Raycaster): void {
    if (!this.isActive) return;

    // Ignora se clicou em UI
    const target = event.target as HTMLElement;
    if (this.isUIElement(target)) {
      return;
    }

    // Calcula posição do mouse
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Raycast
    raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = raycaster.intersectObjects(this.scene.children, true);

    if (intersects.length > 0) {
      const point = intersects[0].point.clone();
      this.addMeasurePoint(point);
    }
  }

  public onKeyDown(event: KeyboardEvent): void {
    if (!this.isActive) return;

    // ESC para limpar medições
    if (event.code === 'Escape') {
      this.clear();
      console.log('📏 Measurements cleared');
    }

    // Enter para finalizar medição
    if (event.code === 'Enter' && this.measurePoints.length >= 2) {
      this.finalizeMeasurement();
    }
  }

  /**
   * Adiciona ponto de medição
   */
  private addMeasurePoint(point: THREE.Vector3): void {
    // Adiciona ponto ao array
    this.measurePoints.push(point);

    // Cria marcador visual
    const marker = new THREE.Mesh(this.markerGeometry, this.markerMaterial);
    marker.position.copy(point);
    marker.renderOrder = 999;
    this.scene.add(marker);
    this.pointMarkers.push(marker);

    // Se temos 2+ pontos, desenha linha e mostra medida
    if (this.measurePoints.length >= 2) {
      this.drawMeasurementLine();
      this.showMeasurement();
    } else {
      console.log(`📍 Point 1 added: (${point.x.toFixed(2)}, ${point.y.toFixed(2)}, ${point.z.toFixed(2)})`);
    }

    // Emite evento
    if (this.measurePoints.length === 1) {
      eventBus.emit(EventType.MEASUREMENT_STARTED, {});
    }
  }

  /**
   * Desenha linha de medição
   */
  private drawMeasurementLine(): void {
    // Remove linha anterior
    if (this.measurementLine) {
      this.scene.remove(this.measurementLine);
      this.measurementLine.geometry.dispose();
    }

    // Cria geometria da linha
    const geometry = new THREE.BufferGeometry().setFromPoints(this.measurePoints);
    this.measurementLine = new THREE.Line(geometry, this.lineMaterial);
    this.measurementLine.renderOrder = 998;
    this.scene.add(this.measurementLine);
  }

  /**
   * Mostra medição
   */
  private showMeasurement(): void {
    // Remove labels anteriores
    this.clearLabels();

    // Calcula distância total
    let totalDistance = 0;
    for (let i = 1; i < this.measurePoints.length; i++) {
      const distance = this.measurePoints[i].distanceTo(this.measurePoints[i - 1]);
      totalDistance += distance;
      
      // Calcula ponto médio do segmento
      const midPoint = new THREE.Vector3()
        .addVectors(this.measurePoints[i], this.measurePoints[i - 1])
        .multiplyScalar(0.5);
      
      // Cria label para o segmento
      this.createLabel(midPoint, distance);
    }

    console.log(`📏 Total Distance: ${totalDistance.toFixed(3)}m (${(totalDistance * 100).toFixed(1)}cm)`);
  }

  /**
   * Cria label de medição
   */
  private createLabel(position: THREE.Vector3, distance: number): void {
    const label = document.createElement('div');
    label.className = 'measurement-label';
    label.style.position = 'absolute';
    label.style.backgroundColor = 'rgba(255, 0, 0, 0.9)';
    label.style.color = 'white';
    label.style.padding = '4px 8px';
    label.style.borderRadius = '4px';
    label.style.fontSize = '14px';
    label.style.fontWeight = 'bold';
    label.style.pointerEvents = 'none';
    label.style.zIndex = '1000';
    label.textContent = `${distance.toFixed(3)}m`;

    document.body.appendChild(label);
    this.measurementLabels.push(label);

    // Atualiza posição da label no update
    this.updateLabelPosition(label, position);
  }

  /**
   * Atualiza posição da label
   */
  private updateLabelPosition(label: HTMLElement, position: THREE.Vector3): void {
    const vector = position.clone();
    vector.project(this.camera);

    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (vector.y * -0.5 + 0.5) * window.innerHeight;

    label.style.left = `${x}px`;
    label.style.top = `${y}px`;
  }

  /**
   * Finaliza medição
   */
  private finalizeMeasurement(): void {
    if (this.measurePoints.length < 2) return;

    const totalDistance = this.calculateTotalDistance();
    
    eventBus.emit(EventType.MEASUREMENT_COMPLETED, {
      distance: totalDistance,
      points: [...this.measurePoints]
    });

    console.log(`✅ Measurement completed: ${totalDistance.toFixed(3)}m`);
  }

  /**
   * Calcula distância total
   */
  private calculateTotalDistance(): number {
    let total = 0;
    for (let i = 1; i < this.measurePoints.length; i++) {
      total += this.measurePoints[i].distanceTo(this.measurePoints[i - 1]);
    }
    return total;
  }

  /**
   * Limpa todas as medições
   */
  private clear(): void {
    // Remove marcadores
    this.pointMarkers.forEach(marker => {
      this.scene.remove(marker);
      marker.geometry.dispose();
    });
    this.pointMarkers = [];

    // Remove linha
    if (this.measurementLine) {
      this.scene.remove(this.measurementLine);
      this.measurementLine.geometry.dispose();
      this.measurementLine = null;
    }

    // Remove labels
    this.clearLabels();

    // Limpa array de pontos
    this.measurePoints = [];

    // Emite evento
    if (this.measurePoints.length > 0) {
      eventBus.emit(EventType.MEASUREMENT_CANCELLED, {});
    }
  }

  /**
   * Remove labels HTML
   */
  private clearLabels(): void {
    this.measurementLabels.forEach(label => {
      document.body.removeChild(label);
    });
    this.measurementLabels = [];
  }

  /**
   * Update loop para atualizar posições das labels
   */
  public update(_delta: number): void {
    if (!this.isActive) return;

    // Atualiza posições das labels
    this.measurementLabels.forEach((label, index) => {
      if (index < this.measurePoints.length - 1) {
        const midPoint = new THREE.Vector3()
          .addVectors(this.measurePoints[index + 1], this.measurePoints[index])
          .multiplyScalar(0.5);
        this.updateLabelPosition(label, midPoint);
      }
    });
  }

  /**
   * Verifica se o elemento é UI
   */
  private isUIElement(element: HTMLElement): boolean {
    return !!(
      element.closest('#toolbar') ||
      element.closest('#controls-info') ||
      element.closest('#stats-panel') ||
      element.closest('button')
    );
  }

  public dispose(): void {
    super.dispose();
    this.clear();
    this.markerGeometry.dispose();
    this.markerMaterial.dispose();
    this.lineMaterial.dispose();
  }
}
