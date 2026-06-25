import { Info, SlidersHorizontal, X } from 'lucide-react'

interface ViewerPropertiesPanelProps {
  open: boolean
  onClose: () => void
}

export default function ViewerPropertiesPanel({
  open,
  onClose,
}: ViewerPropertiesPanelProps) {
  return (
    <>
      <button
        className={`viewer-drawer-backdrop viewer-drawer-backdrop--right ${open ? 'is-open' : ''}`}
        type="button"
        onClick={onClose}
        aria-label="Fechar painel de informações"
      />
      <aside className={`viewer-panel viewer-properties-panel ${open ? 'is-open' : ''}`}>
        <div className="viewer-panel__header">
          <div>
            <span className="viewer-panel__eyebrow">Seleção</span>
            <h2>Informações</h2>
          </div>
          <button
            className="viewer-panel__close"
            type="button"
            onClick={onClose}
            aria-label="Fechar painel"
          >
            <X size={17} strokeWidth={1.45} />
          </button>
        </div>

        <div className="viewer-properties-empty">
          <div className="viewer-properties-empty__icon">
            <Info size={17} strokeWidth={1.45} />
          </div>
          <h3>Nenhum elemento selecionado</h3>
          <p>Selecione um elemento no modelo para ver suas propriedades.</p>
        </div>

        <div className="viewer-panel__section viewer-controls">
          <div className="viewer-panel__section-title">
            <SlidersHorizontal size={17} strokeWidth={1.45} />
            <span>Controles</span>
          </div>
          <p>Controles disponíveis após carregar um modelo.</p>
        </div>
      </aside>
    </>
  )
}
