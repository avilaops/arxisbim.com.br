import ArxisIcon from '@/components/ui/ArxisIcon'

interface ViewerToolbarProps {
  onUpload: () => void
  uploading: boolean
  onToggleProjects: () => void
  onToggleProperties: () => void
  onToggleScenarios: () => void
  onToggleCronograma: () => void
  /** Ha modelo aberto: sem ele, "Redefinir" nao tem o que redefinir. */
  hasModel: boolean
  onResetView: () => void
  /** null = navegador sem Fullscreen API (iPhone antes do iOS 17.2): botao some. */
  fullscreen: boolean | null
  onToggleFullscreen: () => void
}

export default function ViewerToolbar({
  onUpload,
  uploading,
  onToggleProjects,
  onToggleProperties,
  onToggleScenarios,
  onToggleCronograma,
  hasModel,
  onResetView,
  fullscreen,
  onToggleFullscreen,
}: ViewerToolbarProps) {
  return (
    <header className="viewer-toolbar">
      <div className="viewer-toolbar__title">
        <ArxisIcon name="viewer" size={20} />
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
          <ArxisIcon name="projects" size={18} />
        </button>
        <button
          // viewer-always: o botao precisa existir em TODO viewport. Sem classe
          // ele sumia no mobile (regra que esconde icon-buttons em <=768); com
          // viewer-mobile-action sumia no desktop (essa classe e display:none
          // fora do mobile, porque os paineis la sao colunas fixas). O S12 ficou
          // invisivel num lado e depois no outro ate o teste pegar os dois.
          className="viewer-icon-button viewer-always"
          type="button"
          onClick={onToggleScenarios}
          aria-label="Abrir cenários"
          title="Cenários"
        >
          <ArxisIcon name="layers" size={18} />
        </button>
        <button
          // Mesmo caso do botao de cenarios: precisa existir em todo viewport,
          // senao o S26 fica invisivel no celular ou no desktop.
          className="viewer-icon-button viewer-always"
          type="button"
          onClick={onToggleCronograma}
          aria-label="Abrir cronograma 4D"
          title="Cronograma 4D"
        >
          <ArxisIcon name="recent" size={18} />
        </button>
        <button
          className="viewer-icon-button"
          type="button"
          onClick={onResetView}
          aria-label="Redefinir visualização"
          title={hasModel ? 'Redefinir visualização' : 'Abra um modelo para redefinir a visualização'}
          disabled={!hasModel}
        >
          <ArxisIcon name="reset" size={18} />
        </button>
        {fullscreen !== null && (
          <button
            className="viewer-icon-button"
            type="button"
            onClick={onToggleFullscreen}
            aria-label={fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            title={fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            aria-pressed={fullscreen}
          >
            <ArxisIcon name="fullscreen" size={18} />
          </button>
        )}
        <button
          className="viewer-icon-button viewer-mobile-action"
          type="button"
          onClick={onToggleProperties}
          aria-label="Abrir informações"
          title="Informações"
        >
          <ArxisIcon name="info" size={18} />
        </button>
        <button
          className="viewer-upload-button"
          type="button"
          onClick={onUpload}
          disabled={uploading}
          aria-label={uploading ? 'Enviando modelo IFC' : 'Enviar modelo IFC'}
        >
          <ArxisIcon name="upload" size={18} />
          <span>{uploading ? 'Enviando…' : 'Enviar modelo IFC'}</span>
        </button>
      </div>
    </header>
  )
}
