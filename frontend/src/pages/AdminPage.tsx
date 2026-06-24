import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '@/components/layout/AppShell'

export default function AdminPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = () => {
      try {
        const userData = localStorage.getItem('arxisvr_user')
        if (!userData) {
          navigate('/login')
          return
        }

        const parsedUser = JSON.parse(userData)
        const isAdmin = parsedUser.role === 'admin' || parsedUser.role === 'owner'

        if (!isAdmin) {
          navigate('/dashboard')
          return
        }

        setUser(parsedUser)
        setLoading(false)
      } catch {
        navigate('/login')
      }
    }

    checkAuth()
  }, [navigate])

  if (loading) {
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

  return (
    <AppShell>
      <div style={{ padding: '28px 28px 48px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1280px', width: '100%' }}>
        {/* Page header */}
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

        {/* Admin stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          {[
            { title: 'Usuários', value: '42', change: '+8' },
            { title: 'Organizações', value: '12', change: '+2' },
            { title: 'Modelos IFC', value: '284', change: '+34' },
            { title: 'Armazenamento', value: '128 GB', change: '+12 GB' },
          ].map((stat, idx) => (
            <div
              key={idx}
              style={{
                background: 'var(--c-surface2)',
                border: '1px solid var(--c-border)',
                borderRadius: 'var(--r)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--c-text2)' }}>
                {stat.title}
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--c-text)' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--c-blue)', fontWeight: 600 }}>
                {stat.change}
              </div>
            </div>
          ))}
        </div>

        {/* Sections */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          {/* Users section */}
          <div
            style={{
              background: 'var(--c-surface2)',
              border: '1px solid var(--c-border)',
              borderRadius: 'var(--r)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--c-border)' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--c-text)' }}>
                Usuários recentes
              </h3>
            </div>
            <div>
              {[
                { name: 'João Silva', email: 'joao@example.com', role: 'owner', status: 'Ativo' },
                { name: 'Maria Santos', email: 'maria@example.com', role: 'admin', status: 'Ativo' },
                { name: 'Carlos Oliveira', email: 'carlos@example.com', role: 'member', status: 'Inativo' },
                { name: 'Ana Costa', email: 'ana@example.com', role: 'member', status: 'Ativo' },
              ].map((user, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderBottom: idx < 3 ? '1px solid var(--c-border)' : 'none',
                  }}
                >
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
                    {user.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--c-text)' }}>
                      {user.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--c-text3)' }}>
                      {user.email}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--c-text2)', textTransform: 'capitalize' }}>
                      {user.role}
                    </div>
                    <div style={{ fontSize: '10px', color: user.status === 'Ativo' ? 'var(--c-green)' : 'var(--c-text3)' }}>
                      {user.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Organizations section */}
          <div
            style={{
              background: 'var(--c-surface2)',
              border: '1px solid var(--c-border)',
              borderRadius: 'var(--r)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--c-border)' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--c-text)' }}>
                Organizações
              </h3>
            </div>
            <div>
              {[
                { name: 'AvilaOps', plan: 'Enterprise', users: 8, status: 'Ativo' },
                { name: 'TechBuild', plan: 'Professional', users: 12, status: 'Ativo' },
                { name: 'ArqStudio', plan: 'Starter', users: 3, status: 'Ativo' },
                { name: 'EngenhariaX', plan: 'Free', users: 1, status: 'Inativo' },
              ].map((org, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderBottom: idx < 3 ? '1px solid var(--c-border)' : 'none',
                  }}
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
                    }}
                  >
                    🏢
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--c-text)' }}>
                      {org.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--c-text3)' }}>
                      {org.users} usuários • {org.plan}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, fontSize: '10px', color: org.status === 'Ativo' ? 'var(--c-green)' : 'var(--c-text3)', fontWeight: 600 }}>
                    {org.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* System logs */}
        <div
          style={{
            background: 'var(--c-surface2)',
            border: '1px solid var(--c-border)',
            borderRadius: 'var(--r)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--c-border)' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--c-text)' }}>
              Logs do sistema
            </h3>
          </div>
          <div>
            {[
              { action: 'Usuário criado', user: 'admin@arxisvr.com', time: '5m atrás', status: 'sucesso' },
              { action: 'Organização atualizada', user: 'Carlos Oliveira', time: '1h atrás', status: 'sucesso' },
              { action: 'Modelo processado', user: 'Maria Santos', time: '2h atrás', status: 'sucesso' },
              { action: 'Falha no envio de modelo', user: 'João Silva', time: '4h atrás', status: 'erro' },
              { action: 'Backup concluído', user: 'sistema', time: '1d atrás', status: 'sucesso' },
            ].map((log, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderBottom: idx < 4 ? '1px solid var(--c-border)' : 'none',
                }}
              >
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: log.status === 'sucesso' ? 'var(--c-green)' : 'var(--c-red)',
                    flexShrink: 0,
                  }}
                ></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--c-text)' }}>
                    {log.action}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--c-text3)' }}>
                    {log.user}
                  </div>
                </div>
                <div style={{ flexShrink: 0, fontSize: '11px', color: 'var(--c-text3)' }}>
                  {log.time}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
