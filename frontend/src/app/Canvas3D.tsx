// Canvas3D: Área do viewer 3D
import { useViewerModelListener } from './useViewerModelListener';

export default function Canvas3D() {
  const model = useViewerModelListener();
  return (
    <main className="canvas-area" id="viewer-canvas">
      {/* ViewerHost será montado aqui */}
      {model && (
        <div style={{position:'absolute',top:10,right:10,background:'#222',color:'#fff',padding:8,borderRadius:4}}>
          Modelo carregado: {model.name || 'IFC'}
        </div>
      )}
    </main>
  );
}
