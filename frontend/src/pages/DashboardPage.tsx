import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, BarChart2, Box, Inbox, ClipboardList } from 'lucide-react'
import AppShell from '@/components/layout/AppShell'
import { dashboardService, type DashboardData } from '@/services/dashboard.service'
import { buildApiV1Url } from '@/config/apiBaseUrl'
import '@/styles/viewer.css'

// ── Action label translation map ────────────────────────────
const ACTION_LABELS: Record<string, string> = {
  'POST:/api/v1/projects': 'Projeto criado',
  'PUT:/api/v1/projects/:id': 'Projeto atualizado',
  'DELETE:/api/v1/projects/:id': 'Projeto removido',
  'POST:/api/v1/ifc-models': 'Modelo enviado',
  'POST:/api/v1/ifc-models/:id/upload': 'Modelo enviado',
  'DELETE:/api/v1/ifc-models/:id': 'Modelo removido',
  'POST:/api/v1/meetings': 'Reunião XR criada',
  'POST:/api/v1/meetings/:id/join': 'Participou de reunião XR',
  'POST:/api/v1/auth/login': 'Login realizado',
  'POST:/api/v1/auth/register': 'Conta criada',
  'POST:/api/v1/api-tokens': 'Token API criado',
  'DELETE:/api/v1/api-tokens/:id': 'Token API revogado',
  'POST:/api/v1/budgets': 'Orçamento criado',
  'PUT:/api/v1/budgets/:id': 'Orçamento atualizado',
  'POST:/api/v1/schedules': 'Cronograma criado',
  'PUT:/api/v1/schedules/:id': 'Cronograma atualizado',
}

function translateAction(action: string): string {
  // Direct match
  if (ACTION_LABELS[action]) return ACTION_LABELS[action]
  // Normalize dynamic segments: /api/v1/projects/uuid → /api/v1/projects/:id
  const normalized = action.replace(
    /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    '/:id',
  )
  if (ACTION_LABELS[normalized]) return ACTION_LABELS[normalized]
  // Fallback: extract method + last meaningful path segment
  const match = action.match(/^(POST|PUT|PATCH|DELETE|GET):.*\/([a-z0-9-]+)\/?(:id)?$/i)
  if (match) {
    const verb = { POST: 'Criado', PUT: 'Atualizado', PATCH: 'Atualizado', DELETE: 'Removido', GET: 'Consultado' }[match[1]] || ''
    return `${match[2].replace(/-/g, ' ')} ${verb}`.trim()
  }
  return action
}

// ── Relative time ───────────────────────────────────────────
function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `${minutes}min atrás`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h atrás`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d atrás`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks} sem. atrás`
  return new Date(isoDate).toLocaleDateString('pt-BR')
}

// ── Status label + color ────────────────────────────────────
function statusLabel(status: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    active: { label: 'Ativo', color: '#22c55e' },
    draft: { label: 'Rascunho', color: '#f59e0b' },
    in_progress: { label: 'Em andamento', color: '#3b82f6' },
    under_review: { label: 'Em revisão', color: '#a855f7' },
    completed: { label: 'Finalizado', color: '#6b7280' },
    archived: { label: 'Arquivado', color: '#6b7280' },
    // Estados derivados da versao ativa do modelo (projects.service):
    // sem modelo, enviando, processando, pronto, falhou.
    empty: { label: 'Sem modelo', color: '#6b7280' },
    uploading: { label: 'Enviando', color: '#f59e0b' },
    processing: { label: 'Processando', color: '#3b82f6' },
    ready: { label: 'Pronto', color: '#22c55e' },
    failed: { label: 'Falhou', color: '#ef4444' },
  }
  // Valor desconhecido nunca vai cru para a tela: o usuario nao le enum.
  return map[status] || { label: 'Sem status', color: '#6b7280' }
}

// ── Skeleton pulse ──────────────────────────────────────────
const pulseKeyframes = `
@keyframes skeletonPulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.15; }
}
`

function Skeleton({ width, height, borderRadius = 6 }: { width: string | number; height: string | number; borderRadius?: number }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: 'rgba(255,255,255,0.06)',
        animation: 'skeletonPulse 1.5s ease-in-out infinite',
      }}
    />
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [allProjectsOpen, setAllProjectsOpen] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [creating, setCreating] = useState(false)
  const [allProjects, setAllProjects] = useState<DashboardData['recentProjects']>([])
  const [allProjectsLoading, setAllProjectsLoading] = useState(false)
  const redirectedRef = useRef(false)

  // Auth check
  useEffect(() => {
    if (redirectedRef.current) return
    try {
      const userData = localStorage.getItem('arxisvr_user')
      if (!userData) {
        redirectedRef.current = true
        navigate('/login', { replace: true })
        return
      }
      const parsed = JSON.parse(userData)
      if (!parsed || !parsed.email) {
        localStorage.removeItem('arxisvr_user')
        redirectedRef.current = true
        navigate('/login', { replace: true })
        return
      }
      setUser(parsed)
    } catch {
      localStorage.removeItem('arxisvr_user')
      redirectedRef.current = true
      navigate('/login', { replace: true })
    }
  }, [navigate])

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await dashboardService.get()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) fetchDashboard()
  }, [user, fetchDashboard])

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('arxisvr_token')}`,
  })

  const openProject = (projectId: string) => {
    localStorage.setItem('arxisvr_project_id', projectId)
    navigate('/app')
  }

  const createProject = async () => {
    const name = projectName.trim()
    if (name.length < 2) return

    setCreating(true)
    setError(null)
    try {
      const response = await fetch(buildApiV1Url('/projects'), {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || result.message || 'Falha ao criar projeto')

      localStorage.setItem('arxisvr_project_id', result.id)
      setCreateOpen(false)
      setProjectName('')
      await fetchDashboard()
      navigate('/app')
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Falha ao criar projeto')
    } finally {
      setCreating(false)
    }
  }

  const showAllProjects = async () => {
    setAllProjectsOpen(true)
    setAllProjectsLoading(true)
    try {
      const response = await fetch(buildApiV1Url('/projects?pageSize=100'), {
        headers: authHeaders(),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Falha ao carregar projetos')
      setAllProjects(result.items || [])
    } catch (listError) {
      setError(listError instanceof Error ? listError.message : 'Falha ao carregar projetos')
    } finally {
      setAllProjectsLoading(false)
    }
  }

  if (!user) {
    return (
      <div id="loading" style={{ position: 'fixed', inset: 0, background: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', zIndex: 9999 }}>
        <div
          className="spin"
          style={{
            width: '28px',
            height: '28px',
            border: '2px solid rgba(255,255,255,0.06)',
            borderTopColor: 'var(--c-blue)',
            borderRadius: '50%',
            animation: 'spin .7s linear infinite',
          }}
        ></div>
        <p style={{ fontSize: '12px', color: 'var(--c-text3)' }}>Carregando...</p>
      </div>
    )
  }

  // ── Analytics cards data ────────────────────────────────────
  const cards = data
    ? [
        { title: 'Projetos ativos', value: data.activeProjects },
        { title: 'Modelos processados', value: data.processedModels },
        { title: 'Reuniões XR', value: data.xrMeetings },
      ]
    : null

  return (
    <AppShell>
      <style>{pulseKeyframes}</style>
      <div className="dash-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1280px', width: '100%' }}>
        {/* Page header */}
        <div className="dash-head" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>
              Bem-vindo de volta
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.4px', color: 'var(--c-text)' }}>
              {user?.name || user?.email || 'Dashboard'}
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="dash-cta"
              onClick={() => setCreateOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                borderRadius: 'var(--r)',
                fontWeight: 500,
                color: 'var(--c-text2)',
                background: 'var(--c-surface2)',
                border: '1px solid var(--c-border2)',
                cursor: 'pointer',
                transition: 'background .12s, border-color .12s, color .12s',
                fontFamily: 'inherit',
              }}
            >
              Novo projeto
            </button>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div
            style={{
              background: 'rgba(255,60,60,0.06)',
              border: '1px solid rgba(255,60,60,0.18)',
              borderRadius: 'var(--r)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              textAlign: 'center',
            }}
          >
            <div style={{ color: '#ff6b6b', opacity: 0.8 }}><AlertTriangle size={24} strokeWidth={1.5} /></div>
            <p style={{ fontSize: '13px', color: '#ff6b6b', margin: 0 }}>
              {error}
            </p>
            <button
              onClick={fetchDashboard}
              style={{
                padding: '6px 16px',
                borderRadius: 'var(--r)',
                fontSize: '12px',
                fontWeight: 600,
                color: '#fff',
                background: 'var(--c-blue)',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Analytics cards */}
        <div className="dash-kpis" style={{ display: 'grid', gap: '10px' }}>
          {loading
            ? [0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    background: 'var(--c-surface2)',
                    border: '1px solid var(--c-border)',
                    borderRadius: 'var(--r)',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <Skeleton width={100} height={14} />
                  <Skeleton width={40} height={24} />
                </div>
              ))
            : cards?.map((card, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'var(--c-surface2)',
                    border: '1px solid var(--c-border)',
                    borderRadius: 'var(--r)',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    transition: 'border-color .12s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 500, color: 'var(--c-text)' }}>
                      {card.title}
                    </div>
                    <div style={{ width: '20px', height: '20px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6', background: 'rgba(59,130,246,0.15)' }}>
                      <BarChart2 size={12} strokeWidth={2} />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.5px', color: 'var(--c-text)' }}>
                      {card.value}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--c-text3)', marginTop: '1px' }}>
                      Total
                    </div>
                  </div>
                </div>
              ))}
        </div>

        {/* Recent projects */}
        <div
          style={{
            background: 'var(--c-surface2)',
            border: '1px solid var(--c-border)',
            borderRadius: 'var(--r)',
            overflow: 'hidden',
            transition: 'border-color .12s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--c-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--c-text)' }}>
                Projetos recentes
              </div>
              {data && (
                <span style={{ fontSize: '11px', color: 'var(--c-text3)', background: 'rgba(255,255,255,0.06)', padding: '0 6px', borderRadius: '999px', marginLeft: '6px', lineHeight: '18px' }}>
                  {data.recentProjects.length}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => void showAllProjects()}
              className="dash-link"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                color: 'var(--c-blue)',
                borderRadius: 'var(--r)',
                border: '1px solid rgba(59,130,246,0.25)',
                transition: 'background .12s',
                background: 'transparent',
                cursor: 'pointer',
              }}
            >
              Ver tudo →
            </button>
          </div>

          <div>
            {loading ? (
              // Skeleton rows
              [0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderBottom: i < 2 ? '1px solid var(--c-border)' : 'none',
                  }}
                >
                  <Skeleton width={28} height={28} borderRadius={4} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <Skeleton width={160} height={13} />
                    <Skeleton width={80} height={11} />
                  </div>
                  <Skeleton width={50} height={13} />
                </div>
              ))
            ) : data && data.recentProjects.length > 0 ? (
              data.recentProjects.map((project, idx) => {
                const st = statusLabel(project.status)
                return (
                  <div
                    key={project.id}
                    onClick={() => openProject(project.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 14px',
                      borderBottom: idx < data.recentProjects.length - 1 ? '1px solid var(--c-border)' : 'none',
                      cursor: 'pointer',
                      transition: 'background .1s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                  >
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '4px',
                        background: 'var(--c-surface3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px',
                        flexShrink: 0,
                        color: 'var(--c-text2)',
                      }}
                    >
                      <Box size={14} strokeWidth={1.5} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--c-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {project.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--c-text3)', marginTop: '1px' }}>
                        {timeAgo(project.updatedAt)}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: 500, color: st.color }}>
                        {st.label}
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              // Empty state
              <div style={{ padding: '28px 14px', textAlign: 'center', color: 'var(--c-text3)', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px', opacity: 0.35 }}>
                  <Inbox size={24} strokeWidth={1.5} />
                </div>
                <p style={{ margin: '0 0 12px', color: 'var(--c-text3)' }}>Nenhum projeto ainda.</p>
                <button
                  onClick={() => setCreateOpen(true)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 'var(--r)',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#fff',
                    background: 'var(--c-blue)',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Criar primeiro projeto
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Activity log */}
        <div
          style={{
            background: 'var(--c-surface2)',
            border: '1px solid var(--c-border)',
            borderRadius: 'var(--r)',
            overflow: 'hidden',
            transition: 'border-color .12s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--c-border)' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--c-text)' }}>
              Atividade recente
            </div>
          </div>

          <div>
            {loading ? (
              [0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 14px',
                    borderBottom: i < 2 ? '1px solid var(--c-border)' : 'none',
                  }}
                >
                  <Skeleton width={140} height={13} />
                  <div style={{ flex: 1 }} />
                  <Skeleton width={60} height={11} />
                </div>
              ))
            ) : data && data.recentActivities.length > 0 ? (
              data.recentActivities.map((activity, idx) => (
                <div
                  key={activity.id}
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '10px',
                    padding: '9px 14px',
                    borderBottom: idx < data.recentActivities.length - 1 ? '1px solid var(--c-border)' : 'none',
                    fontSize: '12px',
                    cursor: 'default',
                    transition: 'background .1s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  <span style={{ fontWeight: 500, color: 'var(--c-text)', flexShrink: 0, minWidth: '140px' }}>
                    {translateAction(activity.action)}
                  </span>
                  <span style={{ color: 'var(--c-text3)', flexShrink: 0, whiteSpace: 'nowrap', marginLeft: 'auto' }}>
                    {timeAgo(activity.timestamp)}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ padding: '20px 14px', textAlign: 'center', color: 'var(--c-text3)', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px', opacity: 0.35 }}>
                  <ClipboardList size={20} strokeWidth={1.5} />
                </div>
                Nenhuma atividade registrada ainda.
              </div>
            )}
          </div>
        </div>

        {createOpen && (
          <div className="viewer-modal-backdrop">
            <section className="viewer-modal" role="dialog" aria-modal="true" aria-labelledby="dashboard-create-title">
              <div className="viewer-modal__header">
                <div>
                  <span className="viewer-panel__eyebrow">Workspace</span>
                  <h2 id="dashboard-create-title">Novo projeto</h2>
                </div>
                <button className="viewer-panel__close viewer-modal__close" type="button" onClick={() => setCreateOpen(false)} aria-label="Fechar">×</button>
              </div>
              <div className="viewer-modal__body">
                <label htmlFor="dashboard-project-name">Nome do projeto</label>
                <input
                  id="dashboard-project-name"
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void createProject()
                  }}
                  placeholder="Ex.: Edifício comercial"
                  autoFocus
                />
              </div>
              <div className="viewer-modal__footer">
                <button className="viewer-secondary-button" type="button" onClick={() => setCreateOpen(false)}>Cancelar</button>
                <button className="viewer-upload-button" type="button" onClick={() => void createProject()} disabled={creating || projectName.trim().length < 2}>
                  {creating ? 'Criando…' : 'Criar projeto'}
                </button>
              </div>
            </section>
          </div>
        )}

        {allProjectsOpen && (
          <div className="viewer-modal-backdrop">
            <section className="viewer-modal dashboard-projects-modal" role="dialog" aria-modal="true" aria-labelledby="all-projects-title">
              <div className="viewer-modal__header">
                <div>
                  <span className="viewer-panel__eyebrow">Workspace</span>
                  <h2 id="all-projects-title">Todos os projetos</h2>
                </div>
                <button className="viewer-panel__close viewer-modal__close" type="button" onClick={() => setAllProjectsOpen(false)} aria-label="Fechar">×</button>
              </div>
              <div className="dashboard-projects-list">
                {allProjectsLoading ? (
                  <p>Carregando projetos…</p>
                ) : allProjects.length ? (
                  allProjects.map((project) => {
                    const st = statusLabel(project.status)
                    return (
                      <button type="button" key={project.id} onClick={() => openProject(project.id)}>
                        <span>
                          <strong>{project.name}</strong>
                          <small>Atualizado {timeAgo(project.updatedAt)}</small>
                        </span>
                        <em style={{ color: st.color }}>{st.label}</em>
                      </button>
                    )
                  })
                ) : (
                  <p>Nenhum projeto disponível.</p>
                )}
              </div>
              <div className="viewer-modal__footer">
                <button className="viewer-upload-button" type="button" onClick={() => {
                  setAllProjectsOpen(false)
                  setCreateOpen(true)
                }}>
                  Novo projeto
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </AppShell>
  )
}
