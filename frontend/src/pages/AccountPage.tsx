import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AppShell from '@/components/layout/AppShell'
import ApiTokensPage from './account/ApiTokenspage'
import ApiDocumentationPage from './account/ApiDocumentationPage'
import BillingPage from './account/BillingPage'
import MembersPage from './account/MembersPage'

// "Logs de auditoria" e "Configurações" saíram em 12/10/2026: a primeira
// mostrava três linhas escritas à mão no código e a segunda, caixas de
// seleção que não gravavam nada. Voltam quando houver dado e gravação reais.
const TABS = [
  { id: 'members', label: 'Membros' },
  { id: 'billing', label: 'Plano e cobrança' },
  { id: 'tokens', label: 'Tokens de API' },
  { id: 'docs', label: 'Documentação da API' },
]

/** Aba pedida na URL: o submenu da sidebar e o retorno do cartão do Mercado
 *  Pago chegam com ?tab=billing. */
function tabFromSearch(search: string): string {
  const tab = new URLSearchParams(search).get('tab')
  return TABS.some((t) => t.id === tab) ? (tab as string) : 'members'
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
      <div className="arx-carregando" role="status" aria-label="Carregando">
        <div className="arx-carregando__giro" />
      </div>
    )
  }

  const abaAtual = TABS.find((t) => t.id === activeTab) ?? TABS[0]

  return (
    <AppShell title={abaAtual.label}>
      <div className="conta-pagina">
        <div>
          <div style={{ fontSize: '11px', color: 'var(--c-text2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>
            Configurações
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.4px', color: 'var(--c-text)' }}>
            Gerenciar conta
          </h1>
        </div>

        <div className="conta-abas" role="tablist" aria-label="Seções da conta">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`conta-aba-${t.id}`}
              aria-selected={activeTab === t.id}
              className="conta-aba"
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div role="tabpanel" aria-labelledby={`conta-aba-${abaAtual.id}`}>
          {activeTab === 'members' && <MembersPage tenantId={tenantId} />}

          {activeTab === 'billing' && <BillingPage />}

          {activeTab === 'tokens' && <ApiTokensPage />}

          {activeTab === 'docs' && <ApiDocumentationPage />}
        </div>
      </div>
    </AppShell>
  )
}
