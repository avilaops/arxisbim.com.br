import {
  Box,
  FolderTree,
  Info,
  Layers,
  Maximize2,
  RotateCcw,
  Upload,
} from 'lucide-react'

interface ViewerToolbarProps {
  onUpload: () => void
  uploading: boolean
  onToggleProjects: () => void
  onToggleProperties: () => void
  onToggleScenarios: () => void
}

export default function ViewerToolbar({
  onUpload,
  uploading,
  onToggleProjects,
  onToggleProperties,
  onToggleScenarios,
}: ViewerToolbarProps) {
  return (
    <header className="viewer-toolbar">
      <div className="viewer-toolbar__title">
        <Box size={17} strokeWidth={1.45} />
        <div>
          <h1>Viewer 3D</h1>
          <span>Visualização de modelos IFC</span>
        </div>
      </div>

      <div className="viewer-toolbar__actions">
        <button
          className="viewer-icon-button viewer-mobile-action"
          type="button"
          onClick={onToggleProjects}
          aria-label="Abrir projetos e modelos"
          title="Projetos e modelos"
        >
          <FolderTree size={17} strokeWidth={1.45} />
        </button>
        <button
          className="viewer-icon-button"
          type="button"
          onClick={onToggleScenarios}
          aria-label="Abrir cenários"
          title="Cenários"
        >
          <Layers size={17} strokeWidth={1.45} />
        </button>
        <button
          className="viewer-icon-button"
          type="button"
          aria-label="Redefinir visualização"
          title="Redefinir visualização"
          disabled
        >
          <RotateCcw size={17} strokeWidth={1.45} />
        </button>
        <button
          className="viewer-icon-button"
          type="button"
          aria-label="Tela cheia"
          title="Tela cheia"
          disabled
        >
          <Maximize2 size={17} strokeWidth={1.45} />
        </button>
        <button
          className="viewer-icon-button viewer-mobile-action"
          type="button"
          onClick={onToggleProperties}
          aria-label="Abrir informações"
          title="Informações"
        >
          <Info size={17} strokeWidth={1.45} />
        </button>
        <button
          className="viewer-upload-button"
          type="button"
          onClick={onUpload}
          disabled={uploading}
        >
          <Upload size={17} strokeWidth={1.45} />
          <span>{uploading ? 'Enviando…' : 'Enviar modelo IFC'}</span>
        </button>
      </div>
    </header>
  )
}
