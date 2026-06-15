/**
 * conversions.service.ts — Meta Conversions API (CAPI).
 *
 * Envia eventos server-side para o dataset/Pixel do Meta:
 *   POST https://graph.facebook.com/<v>/<pixel-id>/events
 *
 * PII (email, telefone, nome) é normalizada e **hasheada com SHA-256** antes do
 * envio (exigência do Meta). IP e user-agent vão em claro. Use `eventId` igual ao
 * do Pixel no browser para deduplicação. `testEventCode` (ex.: TEST94482) roteia
 * para a aba Test Events do Events Manager.
 *
 * Token: FACEBOOK_CAPI_TOKEN (gerado no Events Manager → Conversions API, não
 * expira). Fallback para FACEBOOK_TOKEN.
 */
import { createHash } from 'crypto';

const GRAPH = `https://graph.facebook.com/${process.env.FACEBOOK_GRAPH_VERSION || 'v21.0'}`;

export interface CapiError extends Error {
  statusCode?: number;
  fbCode?: number;
  fbType?: string;
}

export interface CapiUserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  externalId?: string;
  clientIpAddress?: string;
  clientUserAgent?: string;
  /** cookie _fbp do browser */
  fbp?: string;
  /** cookie _fbc do browser (ou fbclid) */
  fbc?: string;
}

export interface CapiEvent {
  eventName: string; // 'PageView' | 'Lead' | 'CompleteRegistration' | 'Purchase' | ...
  eventTime?: number; // unix seconds; default agora
  eventId?: string;   // dedup com o Pixel
  eventSourceUrl?: string;
  actionSource?: 'website' | 'app' | 'email' | 'phone_call' | 'chat' | 'physical_store' | 'system_generated' | 'other';
  userData?: CapiUserData;
  customData?: Record<string, unknown>;
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Normaliza (trim+lowercase) e hasheia, exceto quando vazio. */
function hashed(value?: string): string[] | undefined {
  if (!value) return undefined;
  return [sha256(value.trim().toLowerCase())];
}

function pixelId(): string {
  const id = process.env.FACEBOOK_PIXEL_ID;
  if (!id) {
    const e: CapiError = new Error('FACEBOOK_PIXEL_ID não configurado');
    e.statusCode = 501;
    throw e;
  }
  return id;
}

function capiToken(): string {
  const t = process.env.FACEBOOK_CAPI_TOKEN || process.env.FACEBOOK_TOKEN;
  if (!t) {
    const e: CapiError = new Error('FACEBOOK_CAPI_TOKEN não configurado');
    e.statusCode = 501;
    throw e;
  }
  return t;
}

function buildUserData(u: CapiUserData = {}): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (u.email) out.em = hashed(u.email);
  if (u.phone) out.ph = hashed(u.phone.replace(/[^0-9]/g, ''));
  if (u.firstName) out.fn = hashed(u.firstName);
  if (u.lastName) out.ln = hashed(u.lastName);
  if (u.externalId) out.external_id = hashed(u.externalId);
  if (u.clientIpAddress) out.client_ip_address = u.clientIpAddress;
  if (u.clientUserAgent) out.client_user_agent = u.clientUserAgent;
  if (u.fbp) out.fbp = u.fbp;
  if (u.fbc) out.fbc = u.fbc;
  return out;
}

export class ConversionsService {
  /**
   * Envia 1..N eventos. Retorna a resposta do Meta (events_received, fbtrace_id).
   * @param testEventCode use o código da aba Test Events para validar (ex.: TEST94482).
   */
  async send(events: CapiEvent[], testEventCode?: string) {
    if (!events?.length) {
      const e: CapiError = new Error('Nenhum evento para enviar');
      e.statusCode = 400;
      throw e;
    }
    const nowSec = Math.floor(Date.now() / 1000);
    const data = events.map((ev) => ({
      event_name: ev.eventName,
      event_time: ev.eventTime ?? nowSec,
      action_source: ev.actionSource ?? 'website',
      ...(ev.eventId ? { event_id: ev.eventId } : {}),
      ...(ev.eventSourceUrl ? { event_source_url: ev.eventSourceUrl } : {}),
      user_data: buildUserData(ev.userData),
      ...(ev.customData ? { custom_data: ev.customData } : {}),
    }));

    const body: Record<string, unknown> = { data };
    const code = testEventCode || process.env.FACEBOOK_TEST_EVENT_CODE;
    if (code) body.test_event_code = code;

    const res = await fetch(`${GRAPH}/${pixelId()}/events?access_token=${encodeURIComponent(capiToken())}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json() as any;
    if (json?.error) {
      const e: CapiError = new Error(json.error.message || 'Conversions API error');
      e.statusCode = res.status === 200 ? 400 : res.status;
      e.fbCode = json.error.code;
      e.fbType = json.error.type;
      throw e;
    }
    return json; // { events_received, messages, fbtrace_id }
  }
}

export const conversionsService = new ConversionsService();
