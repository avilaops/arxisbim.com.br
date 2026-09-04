import { useState } from 'react'
import { Camera, Check, GitCompare, Layers, Plus, Save, Trash2, X } from 'lucide-react'
import type { Scenario } from '@/services/scenarios.service'

interface ScenariosPanelProps {
  open: boolean
  onClose: () => void
  scenarios: Scenario[]
  activeScenarioId: string
  loading: boolean
  saving: boolean
  /** Falso enquanto não há modelo aberto: sem cena não há o que salvar. */
  viewerPronto: boolean
  onCreate: (name: string) => void
  onSelect: (scenarioId: string) => void
  onSave: () => void
  onDelete: (scenarioId: string) => void
}

/**
 * Painel de cenários (S12). Segue o desenho do ProjectModelsPanel: gaveta com
 * backdrop, lista e um item ativo.
 */
export default function ScenariosPanel({
  open,
  onClose,
  scenarios,
  activeScenarioId,
  loading,
  saving,
  viewerPronto,
  onCreate,
  onSelect,
  onSave,
  onDelete,
}: ScenariosPanelProps) {
  const [criando, setCriando] = useState(false)
  const [nome, setNome] = useState('')

  const confirmarCriacao = () => {
    const limpo = nome.trim()
    if (!limpo) return
    onCreate(limpo)
    setNome('')
    setCriando(false)
  }

  return (
    <>
      <button
        className={`viewer-drawer-backdrop ${open ? 'is-open' : ''}`}
        type="button"
        onClick={onClose}
        aria-label="Fechar painel de cenários"
      />
      <aside className={`viewer-panel viewer-projects-panel ${open ? 'is-open' : ''}`}>
        <div className="viewer-panel__header">
          <div>
            <span className="viewer-panel__eyebrow">Comparar alternativas</span>
            <h2>Cenários</h2>
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

        <div className="viewer-panel__section">
          <div className="viewer-panel__section-heading">
            <div className="viewer-panel__section-title">
              <Layers size={17} strokeWidth={1.45} />
              <span>Cenários</span>
            </div>
            <button
              className="viewer-panel__add"
              type="button"
              onClick={() => setCriando((v) => !v)}
              disabled={!viewerPronto}
              aria-label="Criar novo cenário"
              title={viewerPronto ? 'Criar novo cenário' : 'Abra um modelo primeiro'}
            >
              <Plus size={17} strokeWidth={1.45} />
            </button>
          </div>

          {criando && (
            <div className="viewer-panel__form">
              <input
                autoFocus
                type="text"
                value={nome}
                placeholder="Nome do cenário"
                onChange={(event) => setNome(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') confirmarCriacao()
                  if (event.key === 'Escape') setCriando(false)
                }}
              />
              <button type="button" onClick={confirmarCriacao} disabled={!nome.trim()}>
                <Check size={16} strokeWidth={1.6} />
                <span>Criar</span>
              </button>
            </div>
          )}

          {loading ? (
            <div className="viewer-panel__empty">
              <p>Carregando cenários…</p>
            </div>
          ) : scenarios.length ? (
            <div className="viewer-panel__list">
              {scenarios.map((scenario) => (
                <div
                  key={scenario.id}
                  className={`viewer-panel__item ${
                    scenario.id === activeScenarioId ? 'is-active' : ''
                  }`}
                >
                  <button
                    type="button"
                    className="viewer-panel__item-main"
                    onClick={() => onSelect(scenario.id)}
                  >
                    <Camera size={16} strokeWidth={1.45} />
                    <span>{scenario.name}</span>
                  </button>
                  <button
                    type="button"
                    className="viewer-panel__item-action"
                    onClick={() => onDelete(scenario.id)}
                    aria-label={`Apagar ${scenario.name}`}
                    title="Apagar cenário"
                  >
                    <Trash2 size={15} strokeWidth={1.45} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="viewer-panel__empty">
              <p>
                {viewerPronto
                  ? 'Nenhum cenário ainda. Posicione a câmera e salve o primeiro.'
                  : 'Abra um modelo IFC para criar cenários.'}
              </p>
            </div>
          )}

          {activeScenarioId && (
            <button
              className="viewer-upload-button"
              type="button"
              onClick={onSave}
              disabled={saving || !viewerPronto}
            >
              <Save size={17} strokeWidth={1.45} />
              <span>{saving ? 'Salvando…' : 'Salvar posição atual'}</span>
            </button>
          )}

          {/* S18: comparar só faz sentido com dois cenários. */}
          {scenarios.length >= 2 && (
            <a className="viewer-panel__link" href="/app/compare">
              <GitCompare size={16} strokeWidth={1.45} />
              <span>Comparar cenários</span>
            </a>
          )}
        </div>
      </aside>
    </>
  )
}
