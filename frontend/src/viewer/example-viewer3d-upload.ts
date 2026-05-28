// Exemplo de integração: upload e visualização de GLB/IFC no Viewer 3D
import { ViewerHost } from './viewer';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('canvas3d');
  const input = document.getElementById('file-input') as HTMLInputElement;
  if (!container || !input) throw new Error('Elementos necessários não encontrados');

  const viewer = new ViewerHost(container);

  viewer.onModelLoaded = (model) => {
    console.log('Modelo carregado:', model);
    alert('Modelo carregado com sucesso!');
  };
  viewer.onError = (err) => {
    alert('Erro ao carregar modelo: ' + err.message);
  };

  input.addEventListener('change', async (e) => {
    const file = input.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    let type: 'glb' | 'ifc' | null = null;
    if (ext === 'glb') type = 'glb';
    if (ext === 'ifc') type = 'ifc';
    if (!type) {
      alert('Formato não suportado. Use .glb ou .ifc');
      return;
    }
    await viewer.loadModel(file, type);
  });

  window.addEventListener('beforeunload', () => viewer.destroy());
});
