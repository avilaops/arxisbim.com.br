/**
 * meta.service.ts — cliente da Graph API do Meta (Facebook) para perfil, páginas,
 * contas de anúncio (Marketing API / Facebook Ads) e insights.
 *
 * Usa um access token (Graph API). Por padrão lê de `FACEBOOK_TOKEN`, mas qualquer
 * método aceita um token explícito (ex.: token de usuário vindo do OAuth).
 *
 * Escopos necessários por capacidade:
 *  - perfil/páginas: email, public_profile, pages_show_list
 *  - ads:            ads_read (leitura), ads_management (escrita), business_management
 */

const GRAPH = `https://graph.facebook.com/${process.env.FACEBOOK_GRAPH_VERSION || 'v21.0'}`;

export interface MetaError extends Error {
  statusCode?: number;
  fbCode?: number;
  fbType?: string;
}

function defaultToken(): string {
  const tok = process.env.FACEBOOK_TOKEN;
  if (!tok) {
    const e: MetaError = new Error('FACEBOOK_TOKEN não configurado');
    e.statusCode = 501;
    throw e;
  }
  return tok;
}

async function graphGet<T = any>(path: string, params: Record<string, string>, token?: string): Promise<T> {
  const qs = new URLSearchParams({ ...params, access_token: token || defaultToken() });
  const res = await fetch(`${GRAPH}${path}?${qs}`);
  const data = await res.json() as any;
  if (data?.error) {
    const e: MetaError = new Error(data.error.message || 'Graph API error');
    e.statusCode = res.status === 200 ? 400 : res.status;
    e.fbCode = data.error.code;
    e.fbType = data.error.type;
    throw e;
  }
  return data as T;
}

export interface TokenDebug {
  appId: string;
  type: string;
  isValid: boolean;
  expiresAt: number;
  scopes: string[];
}

export class MetaService {
  /** Valida um token e retorna app, tipo, validade e escopos. */
  async debugToken(token?: string): Promise<TokenDebug> {
    const t = token || defaultToken();
    const data = await graphGet<{ data: any }>('/debug_token', { input_token: t }, t);
    const d = data.data || {};
    return {
      appId: d.app_id,
      type: d.type,
      isValid: !!d.is_valid,
      expiresAt: d.expires_at,
      scopes: d.scopes || [],
    };
  }

  /** Perfil do usuário/owner do token. */
  async getMe(token?: string) {
    return graphGet('/me', { fields: 'id,name,email' }, token);
  }

  /** Páginas do Facebook acessíveis pelo token (pages_show_list). */
  async getPages(token?: string) {
    const r = await graphGet<{ data: any[] }>('/me/accounts', { fields: 'id,name,category,access_token,tasks' }, token);
    return r.data || [];
  }

  /** Contas de anúncio (Facebook Ads / Marketing API) — exige ads_read. */
  async getAdAccounts(token?: string) {
    const r = await graphGet<{ data: any[] }>('/me/adaccounts', {
      fields: 'id,account_id,name,account_status,currency,amount_spent,balance,business',
    }, token);
    return r.data || [];
  }

  /** Campanhas de uma conta de anúncio (act_<id>). */
  async getCampaigns(adAccountId: string, token?: string) {
    const acct = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
    const r = await graphGet<{ data: any[] }>(`/${acct}/campaigns`, {
      fields: 'id,name,objective,status,effective_status,daily_budget,lifetime_budget,start_time,stop_time',
      limit: '50',
    }, token);
    return r.data || [];
  }

  /** Insights (gasto, impressões, cliques, CTR, CPC) de uma conta de anúncio. */
  async getInsights(adAccountId: string, datePreset = 'last_30d', token?: string) {
    const acct = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
    const r = await graphGet<{ data: any[] }>(`/${acct}/insights`, {
      fields: 'spend,impressions,clicks,ctr,cpc,cpm,reach,actions',
      date_preset: datePreset,
    }, token);
    return r.data || [];
  }
}

export const metaService = new MetaService();
