import * as THREE from 'three';
import { ViewerHost } from './ViewerHost';

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('canvas3d');
  if (!container) throw new Error('Elemento #canvas3d não encontrado');

  const viewer = new ViewerHost(container);

  // Eventos customizados
  viewer.onModelLoaded = (model: THREE.Object3D) => {
    console.log('Modelo carregado:', model);
    // Seleciona e destaca um objeto fictício após carregar
    setTimeout(() => {
      viewer.selectObject('demo-object');
    }, 1000);
  };
  viewer.onSelectionChanged = (obj: THREE.Object3D | null) => {
    if (obj) {
      console.log('Objeto selecionado:', obj.name);
    } else {
      console.log('Nenhum objeto selecionado');
    }
  };
  viewer.onError = (err: Error) => {
    console.error('Erro no viewer:', err);
  };

  // Mock: cria um objeto 3D e adiciona à cena como se fosse um modelo carregado
  const box = new (window as any).THREE.Mesh(
    new (window as any).THREE.BoxGeometry(1, 1, 1),
    new (window as any).THREE.MeshStandardMaterial({ color: 0x00aaff })
  );
  box.name = 'demo-object';
  viewer.scene.add(box);
  if (viewer.onModelLoaded) viewer.onModelLoaded(box);

  // Exemplo de ajuste de LOD
  viewer.setLOD(0);

  // Limpeza ao sair
  window.addEventListener('beforeunload', () => viewer.destroy());
});
