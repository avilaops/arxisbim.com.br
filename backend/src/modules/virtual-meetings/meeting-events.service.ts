/**
 * Eventos de reunião para fora do produto.
 *
 * Os eventos de reunião que já existiam (`events.ts`) são de WebSocket: vivem
 * entre os navegadores dos participantes e morrem ali. Nada saía do backend,
 * então não havia como o n8n saber que uma sala nasceu ou acabou.
 *
 * Este serviço é a ponte. Mesmo desenho do `WebhookService` do IFC: POST com
 * assinatura HMAC, e falha não derruba a reunião. A diferença é o destino, que
 * aqui é o n8n e tem variável própria (`MEETING_WEBHOOK_URL`), para o fluxo de
 * reunião poder viver separado do de IFC.
 *
 * Nunca lançar: reunião em andamento não pode cair porque um fluxo de
 * automação está fora do ar.
 */
import { createHmac } from 'node:crypto';

export const MeetingEvents = {
  ROOM_CREATED: 'meeting.room.created',
  PARTICIPANT_JOINED: 'meeting.participant.joined',
  PARTICIPANT_LEFT: 'meeting.participant.left',
  ROOM_ENDED: 'meeting.room.ended',
} as const;

export type MeetingEventName = (typeof MeetingEvents)[keyof typeof MeetingEvents];

export interface MeetingEventPayload {
  event: MeetingEventName;
  timestamp: string;
  tenantId: string | null;
  roomId: string;
  data: Record<string, unknown>;
}

const TIMEOUT_MS = 8_000;

function destino(): string | undefined {
  // Cai no webhook geral quando não há um dedicado, para quem só quer um
  // endpoint só não precisar configurar dois.
  return process.env.MEETING_WEBHOOK_URL || process.env.WEBHOOK_URL;
}

function segredo(): string | undefined {
  return process.env.MEETING_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET;
}

export class MeetingEventsService {
  /**
   * Dispara o evento e devolve se foi aceito. Não aguarda o n8n processar: o
   * corpo da resposta é ignorado de propósito, só o status importa.
   */
  static async emit(
    event: MeetingEventName,
    roomId: string,
    tenantId: string | null,
    data: Record<string, unknown> = {},
  ): Promise<boolean> {
    const url = destino();
    if (!url) return false;

    const payload: MeetingEventPayload = {
      event,
      timestamp: new Date().toISOString(),
      tenantId,
      roomId,
      data,
    };

    const body = JSON.stringify(payload);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'ArxisVR-Meetings/1.0',
      'X-ArxisVR-Event': event,
    };

    const secret = segredo();
    if (secret) {
      headers['X-Webhook-Signature'] = createHmac('sha256', secret).update(body).digest('hex');
    }

    // AbortSignal.timeout: sem isto um n8n pendurado seguraria o handler.
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (!response.ok) {
        console.error(`[meeting-events] ${event} recusado: ${response.status}`);
        return false;
      }
      return true;
    } catch (error: any) {
      console.error(`[meeting-events] ${event} falhou: ${error?.message ?? error}`);
      return false;
    }
  }

  /**
   * Dispara sem prender quem chamou. É a forma usada nos caminhos quentes
   * (entrar e sair de sala), onde esperar o n8n atrasaria o participante.
   */
  static emitDetached(
    event: MeetingEventName,
    roomId: string,
    tenantId: string | null,
    data: Record<string, unknown> = {},
  ): void {
    void this.emit(event, roomId, tenantId, data);
  }
}
