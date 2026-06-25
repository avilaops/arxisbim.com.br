import { Box, Folder, Plus, X } from 'lucide-react'
import type { ViewerModel, ViewerProject } from '@/pages/Viewer3DPage'

interface ProjectModelsPanelProps {
  open: boolean
  onClose: () => void
  projects: ViewerProject[]
  models: ViewerModel[]
  selectedProjectId: string
  selectedModelId: string
  loading: boolean
  onSelectProject: (projectId: string) => void
  onSelectModel: (modelId: string) => void
  onCreateProject: () => void
}

export default function ProjectModelsPanel({
  open,
  onClose,
  projects,
  models,
  selectedProjectId,
  selectedModelId,
  loading,
  onSelectProject,
  onSelectModel,
  onCreateProject,
}: ProjectModelsPanelProps) {
  return (
    <>
      <button
        className={`viewer-drawer-backdrop ${open ? 'is-open' : ''}`}
        type="button"
        onClick={onClose}
        aria-label="Fechar painel de projetos"
      />
      <aside className={`viewer-panel viewer-projects-panel ${open ? 'is-open' : ''}`}>
        <div className="viewer-panel__header">
          <div>
            <span className="viewer-panel__eyebrow">Workspace</span>
            <h2>Projetos</h2>
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
              <Folder size={17} strokeWidth={1.45} />
              <span>Projetos</span>
            </div>
            <button
              className="viewer-panel__add"
              type="button"
              onClick={onCreateProject}
              aria-label="Criar novo projeto"
              title="Criar novo projeto"
            >
              <Plus size={17} strokeWidth={1.45} />
            </button>
          </div>
          {loading ? (
            <div className="viewer-panel__empty">
              <p>Carregando projetos…</p>
            </div>
          ) : projects.length ? (
            <div className="viewer-panel__list">
              {projects.map((project) => (
                <button
                  className={`viewer-panel__item ${
                    project.id === selectedProjectId ? 'is-active' : ''
                  }`}
                  type="button"
                  key={project.id}
                  onClick={() => onSelectProject(project.id)}
                >
                  <Folder size={17} strokeWidth={1.45} />
                  <span>{project.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="viewer-panel__empty">
              <p>Nenhum projeto disponível</p>
            </div>
          )}
        </div>

        <div className="viewer-panel__section viewer-panel__section--models">
          <div className="viewer-panel__section-title">
            <Box size={17} strokeWidth={1.45} />
            <span>Modelos IFC</span>
          </div>
          {models.length ? (
            <div className="viewer-panel__list">
              {models.map((model) => (
                <button
                  className={`viewer-panel__item ${
                    model.id === selectedModelId ? 'is-active' : ''
                  }`}
                  type="button"
                  key={model.id}
                  onClick={() => onSelectModel(model.id)}
                >
                  <Box size={17} strokeWidth={1.45} />
                  <span>{model.originalName}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="viewer-panel__empty">
              <p>Nenhum modelo disponível</p>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
