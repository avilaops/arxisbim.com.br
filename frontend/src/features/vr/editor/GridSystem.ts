import * as THREE from 'three';

/**
 * GridSystem - Sistema de grid 3D para VR
 * Fornece alinhamento visual e snap-to-grid
 */
export class GridSystem {
  private gridGroup: THREE.Group;
  private mainGrid: THREE.GridHelper;
  private subGrid: THREE.GridHelper;
  private axisHelper: THREE.AxesHelper;
  
  private isVisible: boolean = true;
  private gridSize: number = 10;
  private divisions: number = 20;
  private subDivisions: number = 100;
  
  constructor(size: number = 10, divisions: number = 20) {
    this.gridSize = size;
    this.divisions = divisions;
    this.subDivisions = divisions * 5;
    
    this.gridGroup = new THREE.Group();
    this.gridGroup.name = 'gridSystem';
    
    // Grid principal
    this.mainGrid = new THREE.GridHelper(this.gridSize, this.divisions, 0x888888, 0x444444);
    this.mainGrid.name = 'mainGrid';
    
    // Sub-grid (mais fino)
    this.subGrid = new THREE.GridHelper(this.gridSize, this.subDivisions, 0x333333, 0x222222);
    this.subGrid.name = 'subGrid';
    this.subGrid.position.y = 0.001; // Pequeno offset para não sobrepor
    
    // Eixos
    this.axisHelper = new THREE.AxesHelper(5);
    this.axisHelper.name = 'axisHelper';
    
    this.gridGroup.add(this.mainGrid);
    this.gridGroup.add(this.subGrid);
    this.gridGroup.add(this.axisHelper);
    
    console.log('🔲 Grid System initialized');
  }
  
  /**
   * Mostra grid
   */
  public show(): void {
    this.isVisible = true;
    this.gridGroup.visible = true;
    console.log('✅ Grid visible');
  }
  
  /**
   * Esconde grid
   */
  public hide(): void {
    this.isVisible = false;
    this.gridGroup.visible = false;
    console.log('❌ Grid hidden');
  }
  
  /**
   * Toggle visibilidade
   */
  public toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }
  
  /**
   * Define tamanho do grid
   */
  public setSize(size: number): void {
    this.gridSize = size;
    this.rebuildGrid();
  }
  
  /**
   * Define divisões do grid
   */
  public setDivisions(divisions: number): void {
    this.divisions = divisions;
    this.subDivisions = divisions * 5;
    this.rebuildGrid();
  }
  
  /**
   * Reconstrói grid
   */
  private rebuildGrid(): void {
    // Remove grids antigos
    this.gridGroup.remove(this.mainGrid);
    this.gridGroup.remove(this.subGrid);
    
    // Dispose geometry e material
    this.mainGrid.geometry.dispose();
    (this.mainGrid.material as THREE.Material).dispose();
    this.subGrid.geometry.dispose();
    (this.subGrid.material as THREE.Material).dispose();
    
    // Cria novos grids
    this.mainGrid = new THREE.GridHelper(this.gridSize, this.divisions, 0x888888, 0x444444);
    this.subGrid = new THREE.GridHelper(this.gridSize, this.subDivisions, 0x333333, 0x222222);
    this.subGrid.position.y = 0.001;
    
    this.gridGroup.add(this.mainGrid);
    this.gridGroup.add(this.subGrid);
  }
  
  /**
   * Toggle sub-grid
   */
  public toggleSubGrid(): void {
    this.subGrid.visible = !this.subGrid.visible;
    console.log('🔲 Sub-grid:', this.subGrid.visible ? 'visible' : 'hidden');
  }
  
  /**
   * Toggle eixos
   */
  public toggleAxis(): void {
    this.axisHelper.visible = !this.axisHelper.visible;
    console.log('📐 Axis:', this.axisHelper.visible ? 'visible' : 'hidden');
  }
  
  /**
   * Snap ponto para grid
   */
  public snapToGrid(value: number, gridSize?: number): number {
    const size = gridSize || (this.gridSize / this.divisions);
    return Math.round(value / size) * size;
  }
  
  /**
   * Snap vetor para grid
   */
  public snapVectorToGrid(vector: THREE.Vector3, gridSize?: number): THREE.Vector3 {
    const size = gridSize || (this.gridSize / this.divisions);
    return new THREE.Vector3(
      this.snapToGrid(vector.x, size),
      this.snapToGrid(vector.y, size),
      this.snapToGrid(vector.z, size)
    );
  }
  
  /**
   * Projeta ponto no plano do grid (Y = 0)
   */
  public projectToGridPlane(raycaster: THREE.Raycaster): THREE.Vector3 | null {
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersection = new THREE.Vector3();
    
    if (raycaster.ray.intersectPlane(plane, intersection)) {
      return intersection;
    }
    
    return null;
  }
  
  /**
   * Calcula tamanho da célula do grid
   */
  public getCellSize(): number {
    return this.gridSize / this.divisions;
  }
  
  /**
   * Adiciona grid à cena
   */
  public addToScene(scene: THREE.Scene): void {
    scene.add(this.gridGroup);
  }
  
  /**
   * Remove grid da cena
   */
  public removeFromScene(scene: THREE.Scene): void {
    scene.remove(this.gridGroup);
  }
  
  /**
   * Define altura do grid (posição Y)
   */
  public setHeight(y: number): void {
    this.gridGroup.position.y = y;
  }
  
  /**
   * Define posição do grid
   */
  public setPosition(position: THREE.Vector3): void {
    this.gridGroup.position.copy(position);
  }
  
  /**
   * Retorna grupo do grid
   */
  public getGridGroup(): THREE.Group {
    return this.gridGroup;
  }
  
  /**
   * Retorna se está visível
   */
  public getIsVisible(): boolean {
    return this.isVisible;
  }
  
  /**
   * Dispose
   */
  public dispose(): void {
    this.mainGrid.geometry.dispose();
    (this.mainGrid.material as THREE.Material).dispose();
    this.subGrid.geometry.dispose();
    (this.subGrid.material as THREE.Material).dispose();
  }
}
