/**
 * FiscalService — emissão de Nota Fiscal de Serviço (NFS-e).
 *
 * ⚠️ IMPORTANTE (Brasil):
 * - O Stripe NÃO emite NFS-e. Ele só cobra. A nota é emitida por você (ou por
 *   um integrador fiscal: NFE.io, eNotas, Asaas, etc.) na sua prefeitura.
 * - NFS-e exige CNPJ + inscrição municipal. Pessoa física (CPF) normalmente
 *   NÃO emite NFS-e. Por isso este serviço nasce DESLIGADO.
 *
 * Estado atual: GANCHO PRONTO E DESATIVADO.
 * - Nenhuma chamada externa, nenhum custo, nada quebra no fluxo de pagamento.
 * - Quando você tiver CNPJ + conta num integrador, basta setar as env vars:
 *     FISCAL_PROVIDER=nfe_io        (ou 'enotas')
 *     FISCAL_API_KEY=...            (chave do integrador)
 *     FISCAL_COMPANY_ID=...         (id da empresa no integrador, se aplicável)
 *   e implementar a chamada no método `emitViaProvider` abaixo.
 */

export interface NFSeRequest {
  tenantId: string;
  invoiceId: string;
  providerInvoiceId?: string | null;
  amountCents: number;
  currency: string;
  customerEmail?: string | null;
  customerName?: string | null;
  description?: string;
}

export interface NFSeResult {
  emitted: boolean;
  skipped?: boolean;
  reason?: string;
  provider?: string;
  nfseId?: string;
  pdfUrl?: string;
}

export class FiscalService {
  /** Provider configurado. 'disabled' = sem emissão (default, sem CNPJ). */
  static provider(): string {
    return (process.env.FISCAL_PROVIDER || 'disabled').toLowerCase();
  }

  static isEnabled(): boolean {
    const p = FiscalService.provider();
    return p !== 'disabled' && p !== 'none' && p !== '' && !!process.env.FISCAL_API_KEY;
  }

  /**
   * Tenta emitir a NFS-e para uma fatura paga. NUNCA lança — falha de fiscal
   * jamais pode quebrar o processamento do pagamento. Retorna o resultado.
   */
  static async emitForInvoice(req: NFSeRequest): Promise<NFSeResult> {
    try {
      if (!FiscalService.isEnabled()) {
        // Desligado (sem CNPJ / sem integrador). Free, sem chamadas externas.
        return {
          emitted: false,
          skipped: true,
          reason: 'fiscal_disabled (sem CNPJ/integrador — configure FISCAL_PROVIDER + FISCAL_API_KEY)',
          provider: FiscalService.provider(),
        };
      }
      return await FiscalService.emitViaProvider(req);
    } catch (err: any) {
      // Engole o erro de propósito: pagamento não pode falhar por causa de NF.
      return { emitted: false, skipped: true, reason: `fiscal_error: ${err?.message || err}` };
    }
  }

  /**
   * Ponto de integração com o provedor fiscal. NÃO implementado ainda — fica
   * pronto pra você plugar NFE.io/eNotas quando tiver CNPJ. Enquanto não houver
   * implementação, retorna skipped (sem custo, sem chamada).
   */
  private static async emitViaProvider(req: NFSeRequest): Promise<NFSeResult> {
    const provider = FiscalService.provider();

    // Exemplo de como ficará (NFE.io) — descomente e ajuste quando for ligar:
    //
    // if (provider === 'nfe_io') {
    //   const companyId = process.env.FISCAL_COMPANY_ID!;
    //   const res = await fetch(`https://api.nfe.io/v1/companies/${companyId}/serviceinvoices`, {
    //     method: 'POST',
    //     headers: {
    //       'Authorization': `Basic ${process.env.FISCAL_API_KEY}`,
    //       'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify({
    //       cityServiceCode: process.env.FISCAL_SERVICE_CODE,   // código de serviço municipal
    //       description: req.description || 'Assinatura ArxisVR',
    //       servicesAmount: req.amountCents / 100,
    //       borrower: { email: req.customerEmail, name: req.customerName },
    //     }),
    //   });
    //   const json = await res.json();
    //   return { emitted: true, provider, nfseId: json.id, pdfUrl: json.pdfUrl };
    // }

    return {
      emitted: false,
      skipped: true,
      reason: `provider_not_implemented:${provider} (gancho pronto — implemente emitViaProvider)`,
      provider,
    };
  }
}
