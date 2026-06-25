import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '@/components/layout/AppShell'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const redirectedRef = useRef(false)

  useEffect(() => {
    if (redirectedRef.current) return
    const checkAuth = () => {
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
        setLoading(false)
      } catch {
        localStorage.removeItem('arxisvr_user')
        redirectedRef.current = true
        navigate('/login', { replace: true })
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
              Bem-vindo de volta
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.4px', color: 'var(--c-text)' }}>
              {user?.name || user?.email || 'Dashboard'}
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                height: '30px',
                padding: '0 12px',
                borderRadius: 'var(--r)',
                fontSize: '12px',
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

        {/* Analytics cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {[
            { title: 'Projetos ativos', value: '5', trend: '+2 esta semana' },
            { title: 'Modelos processados', value: '24', trend: '+4 esta semana' },
            { title: 'Reuniões XR', value: '12', trend: '+1 hoje' },
          ].map((card, idx) => (
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
                <div style={{ width: '20px', height: '20px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', background: 'rgba(59,130,246,0.15)' }}>
                  📊
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.5px', color: 'var(--c-text)' }}>
                    {card.value}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--c-text3)', marginTop: '1px' }}>
                    Total
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '0 5px', borderRadius: '999px', background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
                    ↑ {card.trend}
                  </span>
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
              <span style={{ fontSize: '11px', color: 'var(--c-text3)', background: 'rgba(255,255,255,0.06)', padding: '0 6px', borderRadius: '999px', marginLeft: '6px', lineHeight: '18px' }}>
                5
              </span>
            </div>
            <a
              href="#"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                color: 'var(--c-blue)',
                padding: '4px 8px',
                borderRadius: 'var(--r)',
                border: '1px solid rgba(59,130,246,0.25)',
                transition: 'background .12s',
                textDecoration: 'none',
              }}
            >
              Ver tudo →
            </a>
          </div>

          <div>
            {[
              { name: 'Residencial Heitor', lastModified: '2 horas atrás', status: 'Ativo' },
              { name: 'Edifício VZZ-086', lastModified: '1 dia atrás', status: 'Ativo' },
              { name: 'Industrial Sampa', lastModified: '3 dias atrás', status: 'Pausado' },
              { name: 'Projeto Alpha', lastModified: '1 semana atrás', status: 'Ativo' },
              { name: 'Projeto Beta', lastModified: '2 semanas atrás', status: 'Finalizado' },
            ].map((project, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  borderBottom: idx < 4 ? '1px solid var(--c-border)' : 'none',
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
                  }}
                >
                  📦
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--c-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {project.name}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--c-text3)', marginTop: '1px' }}>
                    {project.lastModified}
                  </div>
                </div>
                <div style={{ flexShrink: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--c-text2)' }}>
                    {project.status}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty state fallback */}
          {false && (
            <div style={{ padding: '28px 14px', textAlign: 'center', color: 'var(--c-text3)', fontSize: '12px' }}>
              <div style={{ fontSize: '24px', display: 'block', marginBottom: '8px', opacity: 0.35 }}>
                📭
              </div>
              Nenhum projeto ainda. <a href="#" style={{ color: 'var(--c-blue)' }}>Criar novo</a>
            </div>
          )}
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px' }}>
            <div>
              {[
                { action: 'Modelo processado', who: 'Você', time: '2h atrás' },
                { action: 'Reunião XR iniciada', who: 'Você e 3 outros', time: '1d atrás' },
                { action: 'Projeto criado', who: 'Você', time: '3d atrás' },
              ].map((log, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '10px',
                    padding: '9px 14px',
                    borderBottom: idx < 2 ? '1px solid var(--c-border)' : 'none',
                    fontSize: '12px',
                    cursor: 'default',
                    transition: 'background .1s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  <span style={{ fontWeight: 500, color: 'var(--c-text)', flexShrink: 0, minWidth: '140px' }}>
                    {log.action}
                  </span>
                  <span style={{ color: 'var(--c-text2)', flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {log.who}
                  </span>
                  <span style={{ color: 'var(--c-text3)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                    {log.time}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
