// Hook/utilitário para escutar eventos de modelo carregado no viewer
import { useEffect, useState } from 'react';
import { on } from '../core/eventBus.simple';

export function useViewerModelListener() {
  const [model, setModel] = useState<any>(null);
  useEffect(() => {
    on('viewer:modelAdded', setModel);
  }, []);
  return model;
}
