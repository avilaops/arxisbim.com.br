// Componente de upload de IFC integrado ao fluxo do ViewerController
import React, { useRef } from 'react';
import { ViewerController } from '../controllers/viewerController';
import { ifcService } from '../services/ifcService';
import { emit } from '../core/eventBus.simple';

const viewerController = new ViewerController({ addModel: (m: any) => emit('viewer:modelAdded', m) }, ifcService);

export default function UploadIFC() {
  const fileInput = useRef<HTMLInputElement>(null);
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await viewerController.loadIFC(file);
      alert('IFC carregado!');
    } catch (err) {
      alert('Erro ao carregar IFC: ' + err);
    }
  };
  return (
    <div style={{ margin: 16 }}>
      <input type="file" accept=".ifc" ref={fileInput} onChange={handleUpload} />
    </div>
  );
}
