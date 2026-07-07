import SEO from '../components/SEO'

export default function PrivacyPage() {
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
        title="Política de Privacidade — ArxisVR"
        description="Leia a Política de Privacidade do ArxisVR para entender como coletamos, usamos e protegemos seus dados e informações cadastrais."
        path="/privacy"
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
          Política de Privacidade
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--c-text3)', marginBottom: '32px' }}>
          Última atualização: 24 de junho de 2026
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', lineHeight: 1.7 }}>
          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
              1. Introdução
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--c-text2)' }}>
              A ArxisVR ("nós", "nosso", "nos", "Empresa") opera a plataforma ArxisVR
              ("Plataforma"). Esta página informa você sobre nossa política de privacidade e
              como tratamos seus dados pessoais quando você acessa e usa a Plataforma.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
              2. Informações que Coletamos
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--c-text2)', marginBottom: '12px' }}>
              Coletamos informações de várias formas:
            </p>
            <ul style={{ fontSize: '13px', color: 'var(--c-text2)', paddingLeft: '20px', gap: '8px', display: 'flex', flexDirection: 'column' }}>
              <li>• Informações fornecidas por você (email, nome, senha)</li>
              <li>• Dados de uso e navegação</li>
              <li>• Informações do dispositivo</li>
              <li>• Cookies e tecnologias similares</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
              3. Como Usamos Seus Dados
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--c-text2)', marginBottom: '12px' }}>
              Usamos as informações coletadas para:
            </p>
            <ul style={{ fontSize: '13px', color: 'var(--c-text2)', paddingLeft: '20px', gap: '8px', display: 'flex', flexDirection: 'column' }}>
              <li>• Fornecer e manter a Plataforma</li>
              <li>• Processar transações e enviar relatórios</li>
              <li>• Enviar comunicações de marketing (com seu consentimento)</li>
              <li>• Melhorar nossos serviços</li>
              <li>• Detectar e prevenir fraude</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
              4. Compartilhamento de Dados
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--c-text2)' }}>
              Não compartilhamos seus dados pessoais com terceiros, exceto quando necessário
              para fornecer nossos serviços ou quando requerido por lei. Podemos compartilhar
              dados agregados e anônimos com parceiros comerciais.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
              5. Segurança dos Dados
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--c-text2)' }}>
              Implementamos medidas técnicas e organizacionais apropriadas para proteger
              seus dados pessoais contra acesso não autorizado, alteração, divulgação ou
              destruição.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
              6. Seus Direitos
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--c-text2)', marginBottom: '12px' }}>
              Você tem o direito de:
            </p>
            <ul style={{ fontSize: '13px', color: 'var(--c-text2)', paddingLeft: '20px', gap: '8px', display: 'flex', flexDirection: 'column' }}>
              <li>• Acessar seus dados pessoais</li>
              <li>• Corrigir dados inexatos</li>
              <li>• Solicitar a exclusão de seus dados</li>
              <li>• Optar por não receber comunicações de marketing</li>
              <li>• Obter uma cópia dos seus dados</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>
              7. Contato
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--c-text2)' }}>
              Se você tiver dúvidas sobre esta política de privacidade ou nossas práticas de
              privacidade, entre em contato conosco em{' '}
              <a href="mailto:privacy@arxisvr.com" style={{ color: 'var(--c-blue)' }}>
                privacy@arxisvr.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
