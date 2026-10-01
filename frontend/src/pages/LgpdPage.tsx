import SEO from '../components/SEO'

export default function LgpdPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        color: 'var(--c-text)',
        padding: '40px 20px',
      }}
    >
      <SEO
        title="LGPD e Proteção de Dados — Arxis"
        description="Saiba como o Arxis está em conformidade com a LGPD (Lei Geral de Proteção de Dados) para garantir o tratamento seguro dos seus dados."
        path="/lgpd"
      />
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

        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px', letterSpacing: '-0.5px' }}>
          Lei Geral de Proteção de Dados (LGPD)
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--c-text3)', marginBottom: '32px' }}>
          Última atualização: 24 de junho de 2026
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', lineHeight: 1.7 }}>
          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
              1. Disposições Gerais
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--c-text2)' }}>
              A Arxis está em conformidade com a Lei Geral de Proteção de Dados (Lei nº
              13.709/2018). Esta página explica como tratamos seus dados pessoais de acordo
              com a LGPD.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
              2. Direitos dos Titulares
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--c-text2)', marginBottom: '12px' }}>
              Conforme a LGPD, você tem os seguintes direitos:
            </p>
            <ul style={{ fontSize: '13px', color: 'var(--c-text2)', paddingLeft: '20px', gap: '8px', display: 'flex', flexDirection: 'column' }}>
              <li>• Direito de acesso aos seus dados pessoais</li>
              <li>• Direito de corrigir dados incompletos ou inexatos</li>
              <li>• Direito de solicitar a exclusão de dados</li>
              <li>• Direito de portabilidade dos dados</li>
              <li>• Direito de oposição ao processamento de dados</li>
              <li>• Direito de informações sobre compartilhamento de dados</li>
              <li>• Direito de não estar sujeito a decisões automatizadas</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
              3. Fundamentos Legais
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--c-text2)' }}>
              Processamos seus dados pessoais com base nos seguintes fundamentos legais: (a)
              consentimento; (b) execução de contrato; (c) cumprimento de obrigações legais;
              (d) proteção de direitos; (e) operações legítimas da empresa.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
              4. Dados de Crianças
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--c-text2)' }}>
              A plataforma Arxis é destinada a usuários maiores de 18 anos. Não coletamos
              intencionalmente dados de menores. Se você descobrir que uma criança forneceu
              dados, por favor, contate-nos imediatamente.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
              5. Retenção de Dados
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--c-text2)' }}>
              Mantemos seus dados pessoais apenas pelo tempo necessário para fornecer nossos
              serviços e cumprir obrigações legais. Você pode solicitar a exclusão de seus
              dados a qualquer momento.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
              6. Transferência Internacional
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--c-text2)' }}>
              Seus dados podem ser transferidos para fora do Brasil apenas em conformidade com
              a LGPD e mediante adequadas garantias de proteção.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
              7. Titular de Dados
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--c-text2)' }}>
              <strong>Arxis</strong>
              <br />
              Email: lgpd@arxisvr.com
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
              8. Encarregado de Proteção de Dados
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--c-text2)' }}>
              Você pode contatar nosso Encarregado de Proteção de Dados (DPO) em{' '}
              <a href="mailto:dpo@arxisvr.com" style={{ color: 'var(--c-blue)' }}>
                dpo@arxisvr.com
              </a>{' '}
              para exercer seus direitos sob a LGPD.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
              9. Reclamações
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--c-text2)' }}>
              Se você acredita que seus direitos sob a LGPD foram violados, você pode
              apresentar uma reclamação à Autoridade Nacional de Proteção de Dados (ANPD).
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
