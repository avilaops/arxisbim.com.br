import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AppShell from '@/components/layout/AppShell'
import ApiTokensPage from './account/ApiTokenspage'
import ApiDocumentationPage from './account/ApiDocumentationPage'
import BillingPage from './account/BillingPage'
import MembersPage from './account/MembersPage'

const TABS = ['members', 'billing', 'tokens', 'docs', 'audit', 'settings']

/** Aba pedida na URL: o submenu da sidebar e o retorno do cartão do Mercado
 *  Pago chegam com ?tab=billing. */
function tabFromSearch(search: string): string {
  const tab = new URLSearchParams(search).get('tab')
  return TABS.includes(tab ?? '') ? (tab as string) : 'members'
}

export default function AccountPage() {
  const navigate = useNavigate()
  const { search } = useLocation()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(() => tabFromSearch(search))

  // Com a sidebar navegando sem recarregar, a pagina fica montada e precisa
  // seguir a troca de ?tab= (Membros -> Plano & Cobranca no mesmo /account).
  useEffect(() => {
    setActiveTab(tabFromSearch(search))
  }, [search])

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

  // `arxisvr_tenant_id` é resquício do app antigo; serve de rede se a sessão
  // atual foi criada por um fluxo que não gravou o tenant no objeto do usuário.
  const tenantId: string | null =
    user?.tenantId ?? user?.tenant_id ?? localStorage.getItem('arxisvr_tenant_id') ?? null

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

  const Tab = ({ id, label }: { id: string; label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        padding: '10px 16px',
        background: activeTab === id ? 'var(--c-blue)' : 'transparent',
        color: activeTab === id ? '#fff' : 'var(--c-text2)',
        border: '1px solid ' + (activeTab === id ? 'var(--c-blue)' : 'var(--c-border)'),
        borderRadius: 'var(--r)',
        fontSize: '12px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'background .12s, color .12s, border-color .12s',
        fontFamily: 'inherit',
      }}
    >
      {label}
    </button>
  )

  return (
    <AppShell>
      <div style={{ padding: '28px 28px 48px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1280px', width: '100%' }}>
        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>
              Configurações
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.4px', color: 'var(--c-text)' }}>
              Gerenciar conta
            </h1>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Tab id="members" label="Membros" />
          <Tab id="billing" label="Plano & Cobrança" />
          <Tab id="tokens" label="Tokens de API" />
          <Tab id="docs" label="Documentação API" />
          <Tab id="audit" label="Logs de auditoria" />
          <Tab id="settings" label="Configurações" />
        </div>

        {/* Content */}
        {activeTab === 'members' && <MembersPage tenantId={tenantId} />}

        {activeTab === 'billing' && <BillingPage />}

        {activeTab === 'tokens' && <ApiTokensPage />}

        {activeTab === 'docs' && <ApiDocumentationPage />}

        {activeTab === 'audit' && (
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
                Logs de auditoria
              </h3>
            </div>
            <div>
              {[
                { action: 'Conta criada', details: 'Você criou uma nova conta', time: 'Hoje' },
                { action: 'Plano alterado', details: 'Upgrade para Professional', time: 'Há 3 dias' },
                { action: 'Membro adicionado', details: 'Maria Santos foi adicionada', time: 'Há 1 semana' },
              ].map((log, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderBottom: idx < 2 ? '1px solid var(--c-border)' : 'none',
                  }}
                >
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: 'var(--c-blue)',
                      flexShrink: 0,
                    }}
                  ></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--c-text)' }}>
                      {log.action}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--c-text3)' }}>
                      {log.details}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, fontSize: '11px', color: 'var(--c-text3)' }}>
                    {log.time}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div
            style={{
              background: 'var(--c-surface2)',
              border: '1px solid var(--c-border)',
              borderRadius: 'var(--r)',
              padding: '20px',
            }}
          >
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--c-text)', marginBottom: '20px' }}>
              Preferências
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked style={{ width: '16px', height: '16px', accentColor: 'var(--c-blue)' }} />
                <span style={{ fontSize: '13px', color: 'var(--c-text)' }}>
                  Receber notificações por email
                </span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked style={{ width: '16px', height: '16px', accentColor: 'var(--c-blue)' }} />
                <span style={{ fontSize: '13px', color: 'var(--c-text)' }}>
                  Avisar sobre novos modelos processados
                </span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input type="checkbox" style={{ width: '16px', height: '16px', accentColor: 'var(--c-blue)' }} />
                <span style={{ fontSize: '13px', color: 'var(--c-text)' }}>
                  Avisar sobre reuniões XR agendadas
                </span>
              </label>
            </div>
            <button
              style={{
                marginTop: '20px',
                padding: '10px 16px',
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
              Salvar alterações
            </button>
          </div>
        )}
      </div>
    </AppShell>
  )
}
