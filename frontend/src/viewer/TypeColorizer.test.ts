import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import { typeColorizer, DEFAULT_TYPE_MAP, UNMAPPED } from './TypeColorizer';
import { getProjectsService } from '../api/v1/services/projects.service';

vi.mock('../api/v1/services/projects.service', () => {
  const mockGetTypeMap = vi.fn();
  return {
    getProjectsService: () => ({
      getTypeMap: mockGetTypeMap,
    }),
  };
});

describe('TypeColorizer', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    typeColorizer.clearCache();
    await typeColorizer.loadForProject('');
  });

  it('retorna os mappings padrão inicialmente', () => {
    const map = typeColorizer.getTypeMap();
    expect(map).toEqual(DEFAULT_TYPE_MAP);
    expect(typeColorizer.getTypeInfo('IfcWall')).toEqual(DEFAULT_TYPE_MAP.IfcWall);
    expect(typeColorizer.getTypeInfo('UnknownType')).toEqual(UNMAPPED);
  });

  it('lookup de tipo e case-insensitive', () => {
    expect(typeColorizer.getTypeInfo('ifcwall')).toEqual(DEFAULT_TYPE_MAP.IfcWall);
    expect(typeColorizer.getTypeInfo('IFCWALL')).toEqual(DEFAULT_TYPE_MAP.IfcWall);
  });

  it('carrega overrides do projeto e combina com os padrões', async () => {
    const mockGetTypeMap = getProjectsService().getTypeMap as any;
    mockGetTypeMap.mockResolvedValue({
      typeMapVersion: 2,
      map: {
        IfcWall: { category: 'structural', label: 'Parede Estrutural', color: '#FF0000' },
        NewCustomType: { category: 'furniture', label: 'Item Customizado', color: '#00FF00' },
      },
    });

    const changedCallback = vi.fn();
    const unsubscribe = typeColorizer.registerOnTypeMapChanged(changedCallback);

    await typeColorizer.loadForProject('proj-123');

    expect(mockGetTypeMap).toHaveBeenCalledWith('proj-123');
    expect(changedCallback).toHaveBeenCalled();

    // Verificações do map atualizado
    const wallInfo = typeColorizer.getTypeInfo('IfcWall');
    expect(wallInfo.category).toBe('structural');
    expect(wallInfo.label).toBe('Parede Estrutural');
    expect(wallInfo.color).toBe('#FF0000');

    const newTypeInfo = typeColorizer.getTypeInfo('NewCustomType');
    expect(newTypeInfo.category).toBe('furniture');
    expect(newTypeInfo.label).toBe('Item Customizado');
    expect(newTypeInfo.color).toBe('#00FF00');

    // Pilar padrão deve continuar intacto
    expect(typeColorizer.getTypeInfo('IfcColumn')).toEqual(DEFAULT_TYPE_MAP.IfcColumn);

    unsubscribe();
  });

  it('aplica cores aos elementos na cena baseados na taxonomia', () => {
    const scene = new THREE.Scene();
    
    const wallMesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    wallMesh.name = 'IfcWall_123';
    wallMesh.userData = { ifcType: 'IfcWall' };
    scene.add(wallMesh);

    const columnMesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    columnMesh.name = 'IfcColumn_456';
    columnMesh.userData = { type: 'IfcColumn' };
    scene.add(columnMesh);

    const unknownMesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    unknownMesh.name = 'not-ifc-mesh';
    scene.add(unknownMesh);

    typeColorizer.applyColorizer(scene);

    const wallMat = wallMesh.material as THREE.MeshStandardMaterial;
    expect(wallMat).toBeDefined();
    expect(wallMat.color.getHexString().toUpperCase()).toBe('D4C5A9'); // #D4C5A9 em hex sem #

    const colMat = columnMesh.material as THREE.MeshStandardMaterial;
    expect(colMat.color.getHexString().toUpperCase()).toBe('8B7355'); // #8B7355

    const unkMat = unknownMesh.material as THREE.MeshBasicMaterial;
    // Sem tipo detectável, não é pintado pelo colorizer (continua material original)
    expect(unkMat instanceof THREE.MeshStandardMaterial).toBe(false);
  });
});
