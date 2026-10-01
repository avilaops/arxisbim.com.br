import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

export default function SharedPage() {
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [model, setModel] = useState<any>(null)

  const shareId = searchParams.get('id')
  const type = searchParams.get('type') || 'model'

  useEffect(() => {
    const loadShared = async () => {
      try {
        await new Promise((r) => setTimeout(r, 1000))

        // Simular carregamento de modelo compartilhado
        setModel({
          name: 'Projeto Compartilhado',
          owner: 'João Silva',
          date: '24 de junho de 2026',
          size: '124 MB',
          description: 'Modelo IFC de um edifício residencial de 20 andares',
        })
        setLoading(false)
      } catch {
        setLoading(false)
      }
    }

    if (shareId) {
      loadShared()
    } else {
      setLoading(false)
    }
  }, [shareId])

  if (!shareId) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0a0a0a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          textAlign: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--c-text)', marginBottom: '8px' }}>
            Link inválido
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--c-text2)', marginBottom: '20px' }}>
            Este link de compartilhamento não é válido ou expirou
          </p>
          <a
            href="/"
            style={{
              display: 'inline-block',
              padding: '8px 16px',
              background: 'var(--c-blue)',
              color: '#fff',
              borderRadius: 'var(--r)',
              textDecoration: 'none',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            Voltar para home
          </a>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0a0a0a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              margin: '0 auto 16px',
              border: '2px solid rgba(255,255,255,0.06)',
              borderTopColor: 'var(--c-blue)',
              borderRadius: '50%',
              animation: 'spin .7s linear infinite',
            }}
          ></div>
          <p style={{ fontSize: '13px', color: 'var(--c-text2)' }}>Carregando {type} compartilhado...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        padding: '40px 20px',
      }}
    >
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <a
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            color: 'var(--c-blue)',
            textDecoration: 'none',
            marginBottom: '32px',
          }}
        >
          ← Voltar para home
        </a>

        <div
          style={{
            background: 'var(--c-surface2)',
            border: '1px solid var(--c-border)',
            borderRadius: 'var(--r)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '32px',
              background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(124,58,237,0.1) 100%)',
              borderBottom: '1px solid var(--c-border)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--c-text)', marginBottom: '8px' }}>
              {model?.name}
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--c-text2)' }}>
              Compartilhado por {model?.owner} em {model?.date}
            </p>
          </div>

          {/* Content */}
          <div style={{ padding: '32px' }}>
            <div style={{ marginBottom: '28px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--c-text)', marginBottom: '8px' }}>
                Descrição
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--c-text2)' }}>
                {model?.description}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
              <div style={{ background: 'var(--c-surface3)', padding: '16px', borderRadius: 'var(--r)' }}>
                <div style={{ fontSize: '11px', color: 'var(--c-text3)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                  Tamanho
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--c-text)' }}>
                  {model?.size}
                </div>
              </div>
              <div style={{ background: 'var(--c-surface3)', padding: '16px', borderRadius: 'var(--r)' }}>
                <div style={{ fontSize: '11px', color: 'var(--c-text3)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                  Tipo
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--c-text)' }}>
                  IFC
                </div>
              </div>
              <div style={{ background: 'var(--c-surface3)', padding: '16px', borderRadius: 'var(--r)' }}>
                <div style={{ fontSize: '11px', color: 'var(--c-text3)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                  Status
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--c-green)' }}>
                  ✓ Pronto
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <a
                href="/register"
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  background: 'var(--c-blue)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--r)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'center',
                  textDecoration: 'none',
                }}
              >
                Visualizar no viewer
              </a>
              <a
                href="/login"
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  background: 'transparent',
                  color: 'var(--c-blue)',
                  border: '1px solid var(--c-blue)',
                  borderRadius: 'var(--r)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'center',
                  textDecoration: 'none',
                }}
              >
                Ir para login
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
