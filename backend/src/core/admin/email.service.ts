import nodemailer from 'nodemailer';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  description: string;
  category: 'welcome' | 'marketing' | 'billing' | 'product';
}

interface SendMarketingOptions {
  templateId?: string;
  recipients: { email: string; name: string }[];
  subject?: string;
  customBody?: string;
  sentBy: string;
}

const TEMPLATES: EmailTemplate[] = [
  {
    id: 'welcome',
    name: 'Boas-vindas',
    subject: 'Bem-vindo ao ArxisVR — sua plataforma BIM está pronta',
    description: 'Enviado automaticamente ao criar conta. Apresenta a plataforma e links para começar.',
    category: 'welcome',
  },
  {
    id: 'trial_ending',
    name: 'Trial expirando',
    subject: 'Seu período gratuito termina em 3 dias — aproveite o ArxisVR Professional',
    description: 'Lembra o usuário que o trial está acabando e incentiva upgrade.',
    category: 'billing',
  },
  {
    id: 'upgrade_cta',
    name: 'Convite para upgrade',
    subject: 'Desbloqueie VR/AR, BIM 5D e muito mais no ArxisVR Professional',
    description: 'Campanha de upsell para usuários do plano Free.',
    category: 'marketing',
  },
  {
    id: 'new_feature',
    name: 'Nova funcionalidade',
    subject: 'Novidade no ArxisVR: [FUNCIONALIDADE]',
    description: 'Anúncio de nova feature para toda a base.',
    category: 'product',
  },
  {
    id: 'reengagement',
    name: 'Reativação',
    subject: 'Sentimos sua falta! Seu projeto BIM espera por você',
    description: 'Para usuários inativos há mais de 14 dias.',
    category: 'marketing',
  },
  {
    id: 'invoice_paid',
    name: 'Fatura paga',
    subject: 'Recibo de pagamento — ArxisVR',
    description: 'Confirmação de pagamento com link para a fatura.',
    category: 'billing',
  },
];

function buildHtml(opts: { name: string; subject: string; body: string; cta?: { label: string; url: string } }): string {
  const { name, subject, body, cta } = opts;
  const ctaHtml = cta
    ? `<div style="text-align:center;margin:32px 0;">
        <a href="${cta.url}" style="display:inline-block;background:#000;color:#fff;padding:14px 28px;border-radius:50px;font-family:'DM Sans',sans-serif;font-size:15px;font-weight:600;text-decoration:none;">${cta.label}</a>
      </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width"/>
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#F5F5F7;font-family:'DM Sans',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F7;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid rgba(0,0,0,0.06);box-shadow:0 8px 32px rgba(0,0,0,0.06);">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#EDE9FF,#E3F0FF);padding:28px 40px;border-bottom:1px solid rgba(0,0,0,0.04);">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <div style="display:inline-flex;align-items:center;gap:8px;">
            <div style="width:28px;height:28px;background:#000;border-radius:50%;display:inline-block;vertical-align:middle;"></div>
            <span style="font-size:18px;font-weight:700;color:#000;vertical-align:middle;margin-left:8px;">ArxisVR</span>
          </div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:36px 40px;">
    <p style="font-size:16px;color:#1A1A1A;margin:0 0 16px;">Olá, <strong>${name}</strong> 👋</p>
    <div style="font-size:15px;color:#6e6e73;line-height:1.7;">${body}</div>
    ${ctaHtml}
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:20px 40px;border-top:1px solid rgba(0,0,0,0.06);background:#F9F9F9;">
    <p style="font-size:12px;color:#aeaeb2;margin:0;line-height:1.6;">
      ArxisVR by AvilaOps · Plataforma BIM com IA e Realidade Estendida<br>
      <a href="https://arxisvr.avilaops.com/lgpd" style="color:#aeaeb2;">Cancelar inscrição</a> ·
      <a href="https://arxisvr.avilaops.com/privacy" style="color:#aeaeb2;">Política de Privacidade</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

function buildTemplateContent(templateId: string, recipientName: string): { subject: string; html: string } {
  const appUrl = process.env.URL || 'https://arxisvr.avilaops.com';

  switch (templateId) {
    case 'welcome':
      return {
        subject: 'Bem-vindo ao ArxisVR — sua plataforma BIM está pronta',
        html: buildHtml({
          name: recipientName,
          subject: 'Bem-vindo ao ArxisVR',
          body: `<p>Sua conta na plataforma <strong>ArxisVR</strong> foi criada com sucesso!</p>
<p>O ArxisVR é a plataforma BIM com Copilot de IA e Realidade Estendida. Você pode:</p>
<ul style="padding-left:20px;margin:12px 0;">
  <li style="margin-bottom:8px;">📐 Fazer upload de modelos IFC e visualizar em escala 1:1</li>
  <li style="margin-bottom:8px;">🤖 Usar o Copilot IA com <strong>Ctrl+K</strong> para coordenação BIM</li>
  <li style="margin-bottom:8px;">⏱️ Simular o cronograma 4D vinculado ao modelo</li>
  <li style="margin-bottom:8px;">🥽 Entrar em VR/AR no navegador, sem instalação</li>
</ul>`,
          cta: { label: 'Abrir a plataforma →', url: `${appUrl}/app` },
        }),
      };

    case 'trial_ending':
      return {
        subject: 'Seu período gratuito termina em 3 dias',
        html: buildHtml({
          name: recipientName,
          subject: 'Trial expirando',
          body: `<p>Seu acesso ao plano gratuito do ArxisVR termina em <strong>3 dias</strong>.</p>
<p>Para continuar com BIM 4D/5D, VR/AR e projetos ilimitados, faça upgrade para o plano <strong>Professional por R$ 499/mês</strong>.</p>
<p>Seus projetos e modelos IFC serão preservados.</p>`,
          cta: { label: 'Fazer upgrade agora', url: `${appUrl}/register#pricing` },
        }),
      };

    case 'upgrade_cta':
      return {
        subject: 'Desbloqueie VR/AR, BIM 5D e muito mais',
        html: buildHtml({
          name: recipientName,
          subject: 'Convite para upgrade',
          body: `<p>Você está no plano <strong>Free</strong> do ArxisVR. Com o <strong>Professional</strong>, você desbloqueia:</p>
<ul style="padding-left:20px;margin:12px 0;">
  <li style="margin-bottom:8px;">✅ Projetos ilimitados</li>
  <li style="margin-bottom:8px;">✅ BIM 4D completo + BIM 5D quantitativos</li>
  <li style="margin-bottom:8px;">✅ VR/AR sem restrições</li>
  <li style="margin-bottom:8px;">✅ Até 15 usuários por tenant</li>
  <li style="margin-bottom:8px;">✅ Federação multidisciplinar</li>
</ul>
<p><strong>R$ 499/mês</strong> · Cancele quando quiser.</p>`,
          cta: { label: 'Ver planos', url: `${appUrl}/#pricing` },
        }),
      };

    case 'new_feature':
      return {
        subject: 'Novidade no ArxisVR',
        html: buildHtml({
          name: recipientName,
          subject: 'Nova funcionalidade',
          body: `<p>Temos uma novidade para você no <strong>ArxisVR</strong>!</p>
<p>Continue acompanhando as atualizações da plataforma — estamos sempre melhorando para você.</p>`,
          cta: { label: 'Ver o que há de novo', url: `${appUrl}/app` },
        }),
      };

    case 'reengagement':
      return {
        subject: 'Sentimos sua falta! Seu projeto BIM espera por você',
        html: buildHtml({
          name: recipientName,
          subject: 'Reativação',
          body: `<p>Percebemos que você não acessa o ArxisVR há alguns dias.</p>
<p>Seus projetos e modelos IFC estão todos lá, esperando por você. Que tal continuar de onde parou?</p>`,
          cta: { label: 'Voltar ao ArxisVR', url: `${appUrl}/app` },
        }),
      };

    default:
      return {
        subject: 'ArxisVR — Atualização',
        html: buildHtml({
          name: recipientName,
          subject: 'Mensagem ArxisVR',
          body: `<p>Obrigado por usar o ArxisVR!</p>`,
          cta: { label: 'Acessar plataforma', url: `${appUrl}/app` },
        }),
      };
  }
}

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.porkbun.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  getTemplates(): EmailTemplate[] {
    return TEMPLATES;
  }

  async sendMarketing(opts: SendMarketingOptions): Promise<{ sent: number; failed: number }> {
    const { templateId = 'welcome', recipients, subject, customBody, sentBy } = opts;
    let sent = 0;
    let failed = 0;

    for (const recipient of recipients) {
      try {
        const content = buildTemplateContent(templateId, recipient.name || recipient.email.split('@')[0]);
        const finalSubject = subject || content.subject;
        const html = customBody
          ? buildHtml({ name: recipient.name, subject: finalSubject, body: customBody })
          : content.html;

        await this.transporter.sendMail({
          from: `"ArxisVR" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
          to: `${recipient.name} <${recipient.email}>`,
          subject: finalSubject,
          html,
          headers: {
            'X-Mailer': 'ArxisVR/1.1',
            'List-Unsubscribe': `<mailto:privacidade@arxisvr.avilaops.com?subject=unsubscribe>`,
          },
        });
        sent++;
      } catch {
        failed++;
      }
    }

    return { sent, failed };
  }

  async sendTransactional(to: string, name: string, templateId: string): Promise<void> {
    const content = buildTemplateContent(templateId, name);
    await this.transporter.sendMail({
      from: `"ArxisVR" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
      to: `${name} <${to}>`,
      subject: content.subject,
      html: content.html,
    });
  }
}
