/**
 * i18n Support for UI Components
 * Provides internationalization structure for component labels and messages
 */

export type Locale = 'pt-BR' | 'en-US' | 'es-ES';

export interface TranslationKeys {
  // Button
  button: {
    save: string;
    cancel: string;
    delete: string;
    confirm: string;
    close: string;
    upload: string;
    download: string;
    export: string;
    import: string;
    loading: string;
  };
  
  // Panel
  panel: {
    close: string;
    properties: string;
    settings: string;
  };
  
  // Dialog
  dialog: {
    close: string;
    confirm: string;
    cancel: string;
    confirmDelete: string;
    confirmDeleteMessage: string;
  };
  
  // Input
  input: {
    required: string;
    invalid: string;
    search: string;
  };
  
  // List
  list: {
    empty: string;
    noResults: string;
    select: string;
  };
  
  // Menu
  menu: {
    exportGLB: string;
    exportPNG: string;
    settings: string;
  };
  
  // Tabs
  tabs: {
    properties: string;
    layers: string;
    history: string;
  };
  
  // Card
  card: {
    view: string;
    edit: string;
  };
  
  // Tooltip
  tooltip: {
    clickToCopy: string;
    copied: string;
  };
}

const translations: Record<Locale, TranslationKeys> = {
  'pt-BR': {
    button: {
      save: 'Salvar',
      cancel: 'Cancelar',
      delete: 'Excluir',
      confirm: 'Confirmar',
      close: 'Fechar',
      upload: 'Upload',
      download: 'Download',
      export: 'Exportar',
      import: 'Importar',
      loading: 'Carregando...',
    },
    panel: {
      close: 'Fechar painel',
      properties: 'Propriedades',
      settings: 'Configurações',
    },
    dialog: {
      close: 'Fechar diálogo',
      confirm: 'Confirmar',
      cancel: 'Cancelar',
      confirmDelete: 'Confirmar exclusão',
      confirmDeleteMessage: 'Tem certeza que deseja remover este item?',
    },
    input: {
      required: 'Campo obrigatório',
      invalid: 'Valor inválido',
      search: 'Buscar...',
    },
    list: {
      empty: 'Nenhum item encontrado',
      noResults: 'Nenhum resultado',
      select: 'Selecionar',
    },
    menu: {
      exportGLB: 'Exportar GLB',
      exportPNG: 'Exportar PNG',
      settings: 'Configurações',
    },
    tabs: {
      properties: 'Propriedades',
      layers: 'Camadas',
      history: 'Histórico',
    },
    card: {
      view: 'Visualizar',
      edit: 'Editar',
    },
    tooltip: {
      clickToCopy: 'Clique para copiar',
      copied: 'Copiado!',
    },
  },
  'en-US': {
    button: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      confirm: 'Confirm',
      close: 'Close',
      upload: 'Upload',
      download: 'Download',
      export: 'Export',
      import: 'Import',
      loading: 'Loading...',
    },
    panel: {
      close: 'Close panel',
      properties: 'Properties',
      settings: 'Settings',
    },
    dialog: {
      close: 'Close dialog',
      confirm: 'Confirm',
      cancel: 'Cancel',
      confirmDelete: 'Confirm deletion',
      confirmDeleteMessage: 'Are you sure you want to remove this item?',
    },
    input: {
      required: 'Required field',
      invalid: 'Invalid value',
      search: 'Search...',
    },
    list: {
      empty: 'No items found',
      noResults: 'No results',
      select: 'Select',
    },
    menu: {
      exportGLB: 'Export GLB',
      exportPNG: 'Export PNG',
      settings: 'Settings',
    },
    tabs: {
      properties: 'Properties',
      layers: 'Layers',
      history: 'History',
    },
    card: {
      view: 'View',
      edit: 'Edit',
    },
    tooltip: {
      clickToCopy: 'Click to copy',
      copied: 'Copied!',
    },
  },
  'es-ES': {
    button: {
      save: 'Guardar',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      confirm: 'Confirmar',
      close: 'Cerrar',
      upload: 'Subir',
      download: 'Descargar',
      export: 'Exportar',
      import: 'Importar',
      loading: 'Cargando...',
    },
    panel: {
      close: 'Cerrar panel',
      properties: 'Propiedades',
      settings: 'Configuración',
    },
    dialog: {
      close: 'Cerrar diálogo',
      confirm: 'Confirmar',
      cancel: 'Cancelar',
      confirmDelete: 'Confirmar eliminación',
      confirmDeleteMessage: '¿Estás seguro de que deseas eliminar este elemento?',
    },
    input: {
      required: 'Campo obligatorio',
      invalid: 'Valor inválido',
      search: 'Buscar...',
    },
    list: {
      empty: 'No se encontraron elementos',
      noResults: 'Sin resultados',
      select: 'Seleccionar',
    },
    menu: {
      exportGLB: 'Exportar GLB',
      exportPNG: 'Exportar PNG',
      settings: 'Configuración',
    },
    tabs: {
      properties: 'Propiedades',
      layers: 'Capas',
      history: 'Historial',
    },
    card: {
      view: 'Ver',
      edit: 'Editar',
    },
    tooltip: {
      clickToCopy: 'Haz clic para copiar',
      copied: '¡Copiado!',
    },
  },
};

let currentLocale: Locale = 'pt-BR';

export const setLocale = (locale: Locale) => {
  currentLocale = locale;
};

export const getLocale = (): Locale => currentLocale;

export const t = (key: keyof TranslationKeys): TranslationKeys[keyof TranslationKeys] => {
  return translations[currentLocale][key];
};

export const useTranslation = () => {
  return {
    t,
    locale: currentLocale,
    setLocale,
  };
};

export default translations;
