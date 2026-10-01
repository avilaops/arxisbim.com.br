import { buildApiV1Url } from '@/config/apiBaseUrl';

export interface TenantMember {
  id: string;
  email: string;
  name: string;
  role: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  isActive: boolean;
}

export type InviteRole = 'admin' | 'member' | 'viewer';

function authHeaders(json = false): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${localStorage.getItem('arxisvr_token')}`,
  };
  if (json) headers['Content-Type'] = 'application/json';
  return headers;
}

async function readError(response: Response, fallback: string): Promise<never> {
  let detail = '';
  try {
    const body = await response.json();
    detail = body?.message || body?.error || '';
  } catch {
    /* resposta sem corpo JSON */
  }
  throw new Error(detail || fallback);
}

export const membersService = {
  async list(tenantId: string): Promise<TenantMember[]> {
    const response = await fetch(buildApiV1Url(`/tenants/${encodeURIComponent(tenantId)}/users`), {
      headers: authHeaders(),
    });
    if (!response.ok) await readError(response, 'Não foi possível carregar os membros');
    return response.json();
  },

  /** Só owner e admin conseguem; a API responde 403 para o resto. */
  async invite(tenantId: string, email: string, role: InviteRole): Promise<void> {
    const response = await fetch(buildApiV1Url(`/workspaces/${encodeURIComponent(tenantId)}/invites`), {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({ email, role }),
    });
    if (!response.ok) await readError(response, 'Não foi possível enviar o convite');
  },
};
