/**
 * Pathfinding.ts
 * 
 * TODO [P2]: Migrar para AVX interfaces
 * Este arquivo ainda usa Three.js diretamente pois faz parte do subsistema AI
 * que será migrado na fase P2 (após core systems)
 */

/* eslint-disable no-restricted-imports */
import * as THREE from 'three';

/**
 * PathNode - Nó para pathfinding
 */
export class PathNode {
  public position: THREE.Vector3;
  public g: number = 0; // Custo do início até este nó
  public h: number = 0; // Heurística (estimativa até o objetivo)
  public f: number = 0; // f = g + h
  public parent: PathNode | null = null;
  public neighbors: PathNode[] = [];
  
  constructor(position: THREE.Vector3) {
    this.position = position;
  }
  
  /**
   * Calcula F score
   */
  public calculateF(): void {
    this.f = this.g + this.h;
  }
}

/**
 * Pathfinding - Sistema de pathfinding A*
 * 
 * Features:
 * - A* algorithm
 * - NavMesh generation (simplified)
 * - Path smoothing
 * - Obstacle avoidance
 */
export class Pathfinding {
  private grid: Map<string, PathNode> = new Map();
  private gridSize: number = 1.0; // metros
  private obstacles: THREE.Box3[] = [];
  
  constructor(gridSize: number = 1.0) {
    this.gridSize = gridSize;
    console.log('🗺️  Pathfinding initialized (grid size:', gridSize, 'm)');
  }
  
  /**
   * Gera grid de navegação
   */
  public generateGrid(
    bounds: { min: THREE.Vector3; max: THREE.Vector3 },
    scene: THREE.Scene
  ): void {
    console.log('🗺️  Generating navigation grid...');
    
    this.grid.clear();
    this.obstacles = [];
    
    // Extrai obstáculos da cena
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.userData.isObstacle) {
        const box = new THREE.Box3().setFromObject(object);
        this.obstacles.push(box);
      }
    });
    
    // Cria grid
    const xCount = Math.ceil((bounds.max.x - bounds.min.x) / this.gridSize);
    const zCount = Math.ceil((bounds.max.z - bounds.min.z) / this.gridSize);
    
    let walkableNodes = 0;
    
    for (let x = 0; x < xCount; x++) {
      for (let z = 0; z < zCount; z++) {
        const position = new THREE.Vector3(
          bounds.min.x + x * this.gridSize,
          bounds.min.y,
          bounds.min.z + z * this.gridSize
        );
        
        // Verifica se posição está livre de obstáculos
        if (!this.isObstacle(position)) {
          const node = new PathNode(position);
          const key = this.getKey(position);
          this.grid.set(key, node);
          walkableNodes++;
        }
      }
    }
    
    // Conecta vizinhos (8 direções)
    this.grid.forEach((node) => {
      node.neighbors = this.getNeighbors(node.position);
    });
    
    console.log(`✅ Grid generated: ${walkableNodes} walkable nodes, ${this.obstacles.length} obstacles`);
  }
  
  /**
   * Encontra caminho usando A*
   */
  public findPath(start: THREE.Vector3, end: THREE.Vector3): THREE.Vector3[] | null {
    const startNode = this.getClosestNode(start);
    const endNode = this.getClosestNode(end);
    
    if (!startNode || !endNode) {
      console.warn('⚠️  Path not found: start or end node invalid');
      return null;
    }
    
    const openSet: PathNode[] = [startNode];
    const closedSet: Set<PathNode> = new Set();
    
    startNode.g = 0;
    startNode.h = this.heuristic(startNode.position, endNode.position);
    startNode.calculateF();
    
    while (openSet.length > 0) {
      // Encontra nó com menor F
      let current = openSet[0];
      let currentIndex = 0;
      
      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].f < current.f) {
          current = openSet[i];
          currentIndex = i;
        }
      }
      
      // Chegou ao destino
      if (current === endNode) {
        return this.reconstructPath(current);
      }
      
      // Move para closedSet
      openSet.splice(currentIndex, 1);
      closedSet.add(current);
      
      // Avalia vizinhos
      for (const neighbor of current.neighbors) {
        if (closedSet.has(neighbor)) continue;
        
        const tentativeG = current.g + this.distance(current.position, neighbor.position);
        
        const inOpenSet = openSet.includes(neighbor);
        
        if (!inOpenSet || tentativeG < neighbor.g) {
          neighbor.parent = current;
          neighbor.g = tentativeG;
          neighbor.h = this.heuristic(neighbor.position, endNode.position);
          neighbor.calculateF();
          
          if (!inOpenSet) {
            openSet.push(neighbor);
          }
        }
      }
    }
    
    console.warn('⚠️  Path not found: no route available');
    return null;
  }
  
  /**
   * Suaviza caminho (remove pontos desnecessários)
   */
  public smoothPath(path: THREE.Vector3[]): THREE.Vector3[] {
    if (path.length <= 2) return path;
    
    const smoothed: THREE.Vector3[] = [path[0]];
    let current = 0;
    
    while (current < path.length - 1) {
      // Tenta pular para o mais distante possível
      let farthest = current + 1;
      
      for (let i = current + 2; i < path.length; i++) {
        if (this.hasLineOfSight(path[current], path[i])) {
          farthest = i;
        } else {
          break;
        }
      }
      
      smoothed.push(path[farthest]);
      current = farthest;
    }
    
    return smoothed;
  }
  
  /**
   * Verifica se há linha de visão entre dois pontos
   */
  private hasLineOfSight(from: THREE.Vector3, to: THREE.Vector3): boolean {
    const direction = new THREE.Vector3().subVectors(to, from);
    const distance = direction.length();
    direction.normalize();
    
    const ray = new THREE.Ray(from, direction);
    
    for (const obstacle of this.obstacles) {
      const intersection = new THREE.Vector3();
      if (ray.intersectBox(obstacle, intersection)) {
        if (intersection.distanceTo(from) < distance) {
          return false;
        }
      }
    }
    
    return true;
  }
  
  /**
   * Reconstrói caminho a partir do nó final
   */
  private reconstructPath(node: PathNode): THREE.Vector3[] {
    const path: THREE.Vector3[] = [];
    let current: PathNode | null = node;
    
    while (current) {
      path.unshift(current.position.clone());
      current = current.parent;
    }
    
    return path;
  }
  
  /**
   * Heurística (distância Manhattan)
   */
  private heuristic(a: THREE.Vector3, b: THREE.Vector3): number {
    return Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
  }
  
  /**
   * Distância entre dois pontos
   */
  private distance(a: THREE.Vector3, b: THREE.Vector3): number {
    return a.distanceTo(b);
  }
  
  /**
   * Verifica se posição é obstáculo
   */
  private isObstacle(position: THREE.Vector3): boolean {
    const point = new THREE.Vector3(position.x, position.y, position.z);
    
    for (const obstacle of this.obstacles) {
      if (obstacle.containsPoint(point)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Retorna nó mais próximo de uma posição
   */
  private getClosestNode(position: THREE.Vector3): PathNode | null {
    const snapped = new THREE.Vector3(
      Math.round(position.x / this.gridSize) * this.gridSize,
      position.y,
      Math.round(position.z / this.gridSize) * this.gridSize
    );
    
    const key = this.getKey(snapped);
    let node = this.grid.get(key);
    
    if (node) return node;
    
    // Procura vizinhos se exato não existir
    let closest: PathNode | null = null;
    let minDist = Infinity;
    
    this.grid.forEach((n) => {
      const dist = n.position.distanceTo(position);
      if (dist < minDist) {
        minDist = dist;
        closest = n;
      }
    });
    
    return closest;
  }
  
  /**
   * Retorna vizinhos de uma posição (8 direções)
   */
  private getNeighbors(position: THREE.Vector3): PathNode[] {
    const neighbors: PathNode[] = [];
    
    const directions = [
      { x: 1, z: 0 },  // E
      { x: -1, z: 0 }, // W
      { x: 0, z: 1 },  // N
      { x: 0, z: -1 }, // S
      { x: 1, z: 1 },  // NE
      { x: -1, z: 1 }, // NW
      { x: 1, z: -1 }, // SE
      { x: -1, z: -1 } // SW
    ];
    
    for (const dir of directions) {
      const neighborPos = new THREE.Vector3(
        position.x + dir.x * this.gridSize,
        position.y,
        position.z + dir.z * this.gridSize
      );
      
      const key = this.getKey(neighborPos);
      const neighbor = this.grid.get(key);
      
      if (neighbor) {
        neighbors.push(neighbor);
      }
    }
    
    return neighbors;
  }
  
  /**
   * Gera key única para posição
   */
  private getKey(position: THREE.Vector3): string {
    return `${Math.round(position.x)}_${Math.round(position.z)}`;
  }
  
  /**
   * Adiciona obstáculo manualmente
   */
  public addObstacle(box: THREE.Box3): void {
    this.obstacles.push(box);
  }
  
  /**
   * Remove todos obstáculos
   */
  public clearObstacles(): void {
    this.obstacles = [];
  }
  
  /**
   * Retorna estatísticas
   */
  public getStats(): {
    gridNodes: number;
    obstacles: number;
    gridSize: number;
  } {
    return {
      gridNodes: this.grid.size,
      obstacles: this.obstacles.length,
      gridSize: this.gridSize
    };
  }
  
  /**
   * Visualiza grid (debug)
   */
  public visualizeGrid(scene: THREE.Scene): void {
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.3
    });
    
    this.grid.forEach((node) => {
      const geometry = new THREE.BoxGeometry(
        this.gridSize * 0.8,
        0.1,
        this.gridSize * 0.8
      );
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(node.position);
      mesh.position.y += 0.05;
      mesh.userData.isDebugGrid = true;
      scene.add(mesh);
    });
    
    console.log('🗺️  Grid visualized');
  }
  
  /**
   * Remove visualização
   */
  public hideGrid(scene: THREE.Scene): void {
    const toRemove: THREE.Object3D[] = [];
    
    scene.traverse((object) => {
      if (object.userData.isDebugGrid) {
        toRemove.push(object);
      }
    });
    
    toRemove.forEach((object) => {
      scene.remove(object);
    });
    
    console.log('🗺️  Grid hidden');
  }
}
