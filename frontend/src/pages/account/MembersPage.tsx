import { useCallback, useEffect, useState } from 'react'
import { membersService, type InviteRole, type TenantMember } from '@/services/members.service'

const wrap: React.CSSProperties = {
  background: 'var(--c-surface2)',
  border: '1px solid var(--c-border)',
  borderRadius: 'var(--r)',
  overflow: 'hidden',
}

const input: React.CSSProperties = {
  padding: '8px 10px',
  background: 'var(--c-surface)',
  border: '1px solid var(--c-border)',
  borderRadius: 'var(--r)',
  color: 'var(--c-text)',
  fontSize: '12px',
  fontFamily: 'inherit',
}

function relativeDate(iso: string | null): string {
  if (!iso) return 'nunca'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return 'hoje'
  if (days === 1) return 'ontem'
  if (days < 30) return `${days} dias atrás`
  if (days < 365) return `${Math.floor(days / 30)} meses atrás`
  return `${Math.floor(days / 365)} anos atrás`
}

export default function MembersPage({ tenantId }: { tenantId: string | null }) {
  const [members, setMembers] = useState<TenantMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [inviting, setInviting] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<InviteRole>('member')

  const load = useCallback(async () => {
    if (!tenantId) {
      setError('Não foi possível identificar seu workspace. Faça login de novo.')
      setLoading(false)
      return
    }
    setError(null)
    try {
      setMembers(await membersService.list(tenantId))
    } catch (err: any) {
      setError(err?.message || 'Não foi possível carregar os membros')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => { void load() }, [load])

  async function submitInvite(event: React.FormEvent) {
    event.preventDefault()
    if (!tenantId) return
    setInviting(true)
    setError(null)
    setNotice(null)
    try {
      await membersService.invite(tenantId, email.trim(), role)
      setNotice(`Convite enviado para ${email.trim()}.`)
      setEmail('')
      setShowInvite(false)
    } catch (err: any) {
      setError(err?.message || 'Não foi possível enviar o convite')
    } finally {
      setInviting(false)
    }
  }

  return (
    <div style={{ display: 'grid', gap: '12px' }}>
      {notice && (
        <div style={{ ...wrap, padding: '12px 14px', fontSize: '12px', color: 'var(--c-text)' }}>{notice}</div>
      )}
      {error && (
        <div style={{ ...wrap, padding: '12px 14px', fontSize: '12px', color: 'var(--c-red)', borderColor: 'var(--c-red)' }}>{error}</div>
      )}

      <div style={wrap}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--c-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--c-text)' }}>
            Membros da organização{!loading && ` (${members.length})`}
          </h3>
          <button
            onClick={() => setShowInvite((v) => !v)}
            style={{
              padding: '6px 12px',
              background: showInvite ? 'transparent' : 'var(--c-blue)',
              color: showInvite ? 'var(--c-text2)' : '#fff',
              border: showInvite ? '1px solid var(--c-border)' : 'none',
              borderRadius: 'var(--r)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {showInvite ? 'Cancelar' : '+ Adicionar membro'}
          </button>
        </div>

        {showInvite && (
          <form
            onSubmit={submitInvite}
            style={{ padding: '12px 14px', borderBottom: '1px solid var(--c-border)', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}
          >
            <input
              type="email"
              required
              placeholder="email@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ ...input, flex: '1 1 220px' }}
            />
            <select value={role} onChange={(e) => setRole(e.target.value as InviteRole)} style={input}>
              <option value="member">Membro</option>
              <option value="admin">Admin</option>
              <option value="viewer">Visualizador</option>
            </select>
            <button
              type="submit"
              disabled={inviting}
              style={{
                padding: '8px 14px',
                background: 'var(--c-blue)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--r)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: inviting ? 'not-allowed' : 'pointer',
                opacity: inviting ? 0.5 : 1,
                fontFamily: 'inherit',
              }}
            >
              {inviting ? 'Enviando...' : 'Enviar convite'}
            </button>
          </form>
        )}

        {loading ? (
          <div style={{ padding: '14px', fontSize: '12px', color: 'var(--c-text3)' }}>Carregando membros...</div>
        ) : members.length === 0 ? (
          <div style={{ padding: '14px', fontSize: '12px', color: 'var(--c-text3)' }}>Nenhum membro encontrado.</div>
        ) : (
          members.map((member, idx) => (
            <div
              key={member.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderBottom: idx < members.length - 1 ? '1px solid var(--c-border)' : 'none',
                opacity: member.isActive ? 1 : 0.5,
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#fff',
                  flexShrink: 0,
                }}
              >
                {(member.name || member.email).charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--c-text)' }}>
                  {member.name || member.email}
                  {!member.emailVerified && (
                    <span style={{ marginLeft: '6px', fontSize: '10px', color: 'var(--c-text3)' }}>e-mail não verificado</span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--c-text3)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {member.email}
                </div>
              </div>
              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--c-text2)', textTransform: 'capitalize' }}>
                  {member.role}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--c-text3)' }}>
                  Último acesso {relativeDate(member.lastLoginAt)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
