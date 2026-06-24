import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function AppPage() {
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
        setUser(JSON.parse(userData))
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
    <div
      style={{
        display: 'grid',
        height: '100vh',
        gridTemplateColumns: '240px 1fr 280px',
        gridTemplateRows: '48px 1fr',
        background: '#0a0a0a',
      }}
    >
      {/* Top bar */}
      <header
        style={{
          gridColumn: '1 / -1',
          background: 'var(--c-surface)',
          borderBottom: '1px solid var(--c-border)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          gap: '16px',
          zIndex: 100,
        }}
      >
        <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, color: 'var(--c-text)', textDecoration: 'none' }}>
          <img src="/logo-icon.svg" alt="ArxisVR" style={{ width: '20px', height: '20px' }} />
          ArxisVR
        </a>

        <div style={{ flex: 1, display: 'flex', gap: '12px', alignItems: 'center', fontSize: '13px' }}>
          <button style={{ padding: '6px 12px', background: 'var(--c-surface2)', border: '1px solid var(--c-border)', borderRadius: 'var(--r)', color: 'var(--c-text2)', cursor: 'pointer', fontSize: '12px', fontWeight: 500, fontFamily: 'inherit' }}>
            Viewer 3D
          </button>
          <button style={{ padding: '6px 12px', background: 'transparent', border: 'none', color: 'var(--c-text2)', cursor: 'pointer', fontSize: '12px', fontWeight: 500, fontFamily: 'inherit' }}>
            Planejamento 4D
          </button>
          <button style={{ padding: '6px 12px', background: 'transparent', border: 'none', color: 'var(--c-text2)', cursor: 'pointer', fontSize: '12px', fontWeight: 500, fontFamily: 'inherit' }}>
            Reuniões XR
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button style={{ padding: '6px 12px', background: 'var(--c-blue)', border: 'none', borderRadius: 'var(--r)', color: '#fff', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'inherit' }}>
            ↑ Enviar modelo
          </button>
          <a href="/dashboard" style={{ padding: '6px 12px', background: 'var(--c-surface2)', border: '1px solid var(--c-border)', borderRadius: 'var(--r)', color: 'var(--c-text2)', textDecoration: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 500, display: 'inline-block', fontFamily: 'inherit' }}>
            Dashboard
          </a>
        </div>
      </header>

      {/* Left sidebar - Projects & Models */}
      <nav
        style={{
          background: 'var(--c-surface)',
          borderRight: '1px solid var(--c-border)',
          overflowY: 'auto',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          fontSize: '12px',
        }}
      >
        <div style={{ paddingBottom: '8px', borderBottom: '1px solid var(--c-border)' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', padding: '0 4px' }}>
            Projetos
          </div>
          {[
            { name: 'Residencial Heitor', icon: '▣' },
            { name: 'Edifício VZZ-086', icon: '▣' },
            { name: 'Industrial Sampa', icon: '▣' },
          ].map((project, idx) => (
            <button
              key={idx}
              style={{
                width: '100%',
                padding: '6px 8px',
                background: idx === 0 ? 'var(--c-blue-dim)' : 'transparent',
                border: 'none',
                borderRadius: 'var(--r)',
                color: idx === 0 ? 'var(--c-text)' : 'var(--c-text2)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background .1s',
                fontFamily: 'inherit',
                fontSize: '12px',
                fontWeight: idx === 0 ? 600 : 400,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onMouseEnter={(e) => !idx && (e.currentTarget.style.background = 'var(--c-blue-dim)')}
            >
              <span>{project.icon}</span>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {project.name}
              </span>
            </button>
          ))}
        </div>

        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', padding: '0 4px' }}>
            Modelos IFC
          </div>
          {[
            { name: 'Estrutural Rev08', status: '✓' },
            { name: 'Hidráulica Rev01', status: '✓' },
            { name: 'Elétrica Rev01', status: '✓' },
          ].map((model, idx) => (
            <button
              key={idx}
              style={{
                width: '100%',
                padding: '6px 8px',
                background: 'transparent',
                border: 'none',
                borderRadius: 'var(--r)',
                color: 'var(--c-text2)',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                e.currentTarget.style.color = 'var(--c-text)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--c-text2)'
              }}
            >
              <span style={{ fontSize: '10px' }}>·</span>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {model.name}
              </span>
            </button>
          ))}
        </div>
      </nav>

      {/* Center - Canvas (3D Viewer) */}
      <div
        style={{
          background: '#1a1a1a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            color: 'var(--c-text3)',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏗️</div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: 'var(--c-text)' }}>
            Selecione um modelo
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--c-text2)' }}>
            Clique em um modelo IFC no painel lateral para visualizá-lo aqui
          </p>
          <button
            style={{
              marginTop: '16px',
              padding: '8px 16px',
              background: 'var(--c-blue)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--r)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            ↑ Enviar novo modelo
          </button>
        </div>
      </div>

      {/* Right sidebar - Properties & Settings */}
      <aside
        style={{
          background: 'var(--c-surface)',
          borderLeft: '1px solid var(--c-border)',
          overflowY: 'auto',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          fontSize: '12px',
        }}
      >
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--c-text2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
            Informações
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--c-text)' }}>
            Nenhum elemento selecionado
          </div>
          <div style={{ fontSize: '11px', color: 'var(--c-text3)', marginTop: '4px' }}>
            Selecione um elemento no viewport para ver suas propriedades
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--c-border)', paddingTop: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--c-text2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
            Controles
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <button style={{ padding: '6px', background: 'var(--c-surface2)', border: '1px solid var(--c-border)', borderRadius: 'var(--r)', color: 'var(--c-text2)', cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit', transition: 'background .1s' }}>
              Resetar câmera
            </button>
            <button style={{ padding: '6px', background: 'var(--c-surface2)', border: '1px solid var(--c-border)', borderRadius: 'var(--r)', color: 'var(--c-text2)', cursor: 'pointer', fontSize: '11px', fontFamily: 'inherit', transition: 'background .1s' }}>
              Modo VR
            </button>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--c-border)', paddingTop: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--c-text2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
            Copilot IA
          </div>
          <input
            type="text"
            placeholder="O que você quer fazer?"
            style={{
              width: '100%',
              padding: '8px',
              background: 'var(--c-surface2)',
              border: '1px solid var(--c-border)',
              borderRadius: 'var(--r)',
              color: 'var(--c-text)',
              fontSize: '11px',
              fontFamily: 'inherit',
            }}
          />
          <div style={{ fontSize: '10px', color: 'var(--c-text3)', marginTop: '6px' }}>
            Digite em português (Ctrl+K)
          </div>
        </div>
      </aside>
    </div>
  )
}
