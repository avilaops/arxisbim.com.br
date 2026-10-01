import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Camera, Check, Eye, EyeOff, GitCompare, Layers, Plus, Save, Trash2, X } from 'lucide-react'
import type { Scenario } from '@/services/scenarios.service'
import type { Categoria } from './visibilidadeIfc'

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
  /** Categorias IFC do modelo aberto e quais tipos estao ocultos agora. */
  categorias: Categoria[]
  ocultos: string[]
  onToggleCategoria: (categoria: Categoria) => void
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
  categorias,
  ocultos,
  onToggleCategoria,
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
      <aside className={`viewer-panel viewer-projects-panel viewer-scenarios-panel ${open ? 'is-open' : ''}`}>
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

        {/* Visibilidade por categoria IFC: e o que faz um cenario diferir do
            outro em algo alem da camera. O que se salva sao tipos IFC. */}
        {viewerPronto && categorias.length > 0 && (
          <div className="viewer-panel__section viewer-panel__section--visibilidade">
            <div className="viewer-panel__section-heading">
              <div className="viewer-panel__section-title">
                <Eye size={17} strokeWidth={1.45} />
                <span>Visibilidade</span>
              </div>
              <span className="viewer-panel__hint">{ocultos.length ? `${categorias.filter((c) => c.tipos.some((t) => ocultos.includes(t))).length} oculta(s)` : 'tudo visível'}</span>
            </div>
            <div className="viewer-panel__list" role="group" aria-label="Categorias IFC">
              {categorias.map((categoria) => {
                const oculta = categoria.tipos.some((t) => ocultos.includes(t))
                return (
                  <button
                    key={categoria.nome}
                    type="button"
                    className={`viewer-panel__item viewer-panel__categoria ${oculta ? 'is-oculta' : ''}`}
                    onClick={() => onToggleCategoria(categoria)}
                    aria-pressed={!oculta}
                    aria-label={`${oculta ? 'Mostrar' : 'Ocultar'} ${categoria.nome}`}
                  >
                    {oculta ? <EyeOff size={16} strokeWidth={1.45} /> : <Eye size={16} strokeWidth={1.45} />}
                    <span>{categoria.nome}</span>
                    <small>{categoria.ids.length}</small>
                  </button>
                )
              })}
            </div>
          </div>
        )}

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
              <span>{saving ? 'Salvando…' : 'Salvar câmera e visibilidade'}</span>
            </button>
          )}

          {/* S18: comparar só faz sentido com dois cenários. */}
          {scenarios.length >= 2 && (
            <Link className="viewer-panel__link" to="/app/compare">
              <GitCompare size={16} strokeWidth={1.45} />
              <span>Comparar cenários</span>
            </Link>
          )}
        </div>
      </aside>
    </>
  )
}
