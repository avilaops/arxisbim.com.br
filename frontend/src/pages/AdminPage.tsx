import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '@/components/layout/AppShell'
import {
  adminService,
  type AdminAuditLog,
  type AdminStats,
  type AdminTenant,
  type AdminUser,
} from '@/services/admin.service'

/**
 * Painel Admin. Até 08/09/2026 esta tela desenhava usuários, organizações e
 * auditoria escritos à mão ("João Silva", "TechBuild", "5m atrás"). Agora lê
 * `GET /admin/stats|users|tenants|audit`, que já existiam; sem dado, mostra
 * estado vazio, nunca registro inventado.
 */

const ROLE_LABEL: Record<string, string> = {
  owner: 'Dono',
  admin: 'Admin',
  member: 'Membro',
  user: 'Usuário',
  viewer: 'Visualizador',
}

const PLAN_LABEL: Record<string, string> = {
  free: 'Gratuito',
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
}

function relativeDate(iso: string | null | undefined): string {
  if (!iso) return 'nunca'
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60_000)
  if (min < 1) return 'agora'
  if (min < 60) return `${min} min atrás`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} h atrás`
  const d = Math.floor(h / 24)
  if (d === 1) return 'ontem'
  if (d < 30) return `${d} dias atrás`
  if (d < 365) return `${Math.floor(d / 30)} meses atrás`
  return `${Math.floor(d / 365)} anos atrás`
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const v = bytes / 1024 ** i
  return `${v < 10 && i > 0 ? v.toFixed(1) : Math.round(v)} ${units[i]}`
}

const RESOURCE_LABEL: Record<string, string> = {
  user: 'usuário',
  tenant: 'organização',
  project: 'projeto',
  model: 'modelo',
  scenario: 'cenário',
  file: 'arquivo',
  token: 'token',
  subscription: 'assinatura',
}

/** `auth.email_verified` → "Auth: email verified". Sem tabela: a ação é o registro. */
function actionLabel(action: string): string {
  const [dominio, ...resto] = action.split('.')
  const verbo = resto.join(' ').replace(/_/g, ' ')
  return verbo ? `${dominio}: ${verbo}` : action
}

function isFailure(log: AdminAuditLog): boolean {
  return /fail|error|denied|invalid|reject/i.test(log.action) || /fail|error|denied/i.test(JSON.stringify(log.details ?? ''))
}

const card: React.CSSProperties = {
  background: 'var(--c-surface2)',
  border: '1px solid var(--c-border)',
  borderRadius: 'var(--r)',
  overflow: 'hidden',
}

const cardHead: React.CSSProperties = { padding: '12px 14px', borderBottom: '1px solid var(--c-border)' }
const cardTitle: React.CSSProperties = { fontSize: '13px', fontWeight: 600, color: 'var(--c-text)' }
const rowStyle = (last: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '10px 14px',
  borderBottom: last ? 'none' : '1px solid var(--c-border)',
})

function Vazio({ children }: { children: string }) {
  return <p style={{ padding: '18px 14px', fontSize: '12px', color: 'var(--c-text3)' }}>{children}</p>
}

export default function AdminPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [tenants, setTenants] = useState<AdminTenant[]>([])
  const [logs, setLogs] = useState<AdminAuditLog[]>([])
  const [storageBytes, setStorageBytes] = useState(0)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let parsedUser: { role?: string; permissions?: string[] } | null = null
    try {
      const userData = localStorage.getItem('arxisvr_user')
      if (!userData) {
        navigate('/login')
        return
      }
      parsedUser = JSON.parse(userData)
    } catch {
      navigate('/login')
      return
    }
    const isAdmin = parsedUser?.role === 'admin' || parsedUser?.role === 'owner' || parsedUser?.permissions?.includes('admin')
    if (!isAdmin) {
      navigate('/dashboard')
      return
    }

    let cancelado = false
    ;(async () => {
      try {
        const [s, u, t, a] = await Promise.all([
          adminService.stats(),
          adminService.users(8),
          adminService.tenants(),
          adminService.audit(10),
        ])
        if (cancelado) return
        setStats(s)
        setUsers(u.users)
        setTenants(t.tenants)
        setLogs(a.logs)
        setStorageBytes(t.tenants.reduce((soma, x) => soma + (x.storageBytes || 0), 0))
      } catch (e) {
        if (!cancelado) setErro(e instanceof Error ? e.message : 'Não foi possível carregar o painel.')
      } finally {
        if (!cancelado) setLoading(false)
      }
    })()
    return () => {
      cancelado = true
    }
  }, [navigate])

  if (loading) {
    return (
      <div id="loading" style={{ position: 'fixed', inset: 0, background: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', zIndex: 9999 }}>
        <div
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

  const kpis = [
    { title: 'Usuários', value: stats ? String(stats.totalUsers) : '', sub: stats ? `${stats.activeUsers} ativos` : '' },
    { title: 'Organizações', value: stats ? String(stats.totalTenants) : '', sub: stats ? `${stats.totalProjects} projetos` : '' },
    { title: 'Modelos IFC', value: stats ? String(stats.totalModels) : '', sub: '' },
    { title: 'Armazenamento', value: formatBytes(storageBytes), sub: 'somado por organização' },
  ]

  return (
    <AppShell>
      <div className="dash-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1280px', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>
              Administração
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.4px', color: 'var(--c-text)' }}>
              Painel Admin
            </h1>
          </div>
        </div>

        {erro && (
          <div role="alert" style={{ ...card, padding: '12px 14px', fontSize: '12px', color: 'var(--c-red)' }}>
            {erro}
          </div>
        )}

        <div className="admin-kpis" style={{ display: 'grid', gap: '10px' }}>
          {kpis.map((stat) => (
            <div key={stat.title} style={{ ...card, padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--c-text2)' }}>{stat.title}</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--c-text)' }}>{stat.value}</div>
              {stat.sub && <div style={{ fontSize: '11px', color: 'var(--c-text3)', fontWeight: 500 }}>{stat.sub}</div>}
            </div>
          ))}
        </div>

        <div className="admin-duo" style={{ display: 'grid', gap: '10px' }}>
          <div style={card}>
            <div style={cardHead}>
              <h3 style={cardTitle}>Usuários recentes</h3>
            </div>
            {users.length === 0 ? (
              <Vazio>Nenhum usuário cadastrado.</Vazio>
            ) : (
              users.map((user, idx) => (
                <div key={user.id} style={rowStyle(idx === users.length - 1)}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#fff',
                      flexShrink: 0,
                    }}
                  >
                    {(user.name || user.email).charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--c-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.name || user.email}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--c-text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.email}
                      {!user.emailVerified && ' · e-mail não verificado'}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--c-text2)' }}>
                      {ROLE_LABEL[user.role] ?? user.role}
                    </div>
                    <div style={{ fontSize: '10px', color: user.isActive ? 'var(--c-green)' : 'var(--c-text3)' }}>
                      {user.isActive ? 'Ativo' : 'Inativo'} · {relativeDate(user.lastLoginAt || user.createdAt)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={card}>
            <div style={cardHead}>
              <h3 style={cardTitle}>Organizações</h3>
            </div>
            {tenants.length === 0 ? (
              <Vazio>Nenhuma organização.</Vazio>
            ) : (
              tenants.slice(0, 8).map((org, idx, arr) => (
                <div key={org.id} style={rowStyle(idx === arr.length - 1)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--c-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {org.name || org.tenantId}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--c-text3)' }}>
                      {org.userCount} {org.userCount === 1 ? 'usuário' : 'usuários'} · {org.modelCount} {org.modelCount === 1 ? 'modelo' : 'modelos'} · {formatBytes(org.storageBytes)} · {PLAN_LABEL[org.subscription?.plan ?? ''] ?? 'Sem plano'}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, fontSize: '10px', color: org.isActive ? 'var(--c-green)' : 'var(--c-text3)', fontWeight: 600 }}>
                    {org.isActive ? 'Ativa' : 'Inativa'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={card}>
          <div style={cardHead}>
            <h3 style={cardTitle}>Auditoria</h3>
          </div>
          {logs.length === 0 ? (
            <Vazio>Nenhum registro de auditoria.</Vazio>
          ) : (
            logs.map((log, idx) => (
              <div key={log.id} style={{ ...rowStyle(idx === logs.length - 1), gap: '12px' }}>
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: isFailure(log) ? 'var(--c-red)' : 'var(--c-green)',
                    flexShrink: 0,
                  }}
                ></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--c-text)' }}>{actionLabel(log.action)}</div>
                  <div style={{ fontSize: '11px', color: 'var(--c-text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.userEmail}
                    {log.resource ? ` · ${RESOURCE_LABEL[log.resource] ?? log.resource}` : ''}
                  </div>
                </div>
                <div style={{ flexShrink: 0, fontSize: '11px', color: 'var(--c-text3)' }}>{relativeDate(log.createdAt)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  )
}
