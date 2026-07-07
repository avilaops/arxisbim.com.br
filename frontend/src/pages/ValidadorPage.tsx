import { useState, useRef } from 'react';
import { buildApiV1Url } from '@/config/apiBaseUrl';
import SEO from '../components/SEO';

export default function ValidadorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [result, setResult] = useState<{
    name: string;
    filename: string;
    grade: string;
    score: string;
  } | null>(null);
  const [error, setError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (!selectedFile.name.endsWith('.ifc')) {
        setError('Por favor, envie um arquivo com extensão .ifc');
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (!droppedFile.name.endsWith('.ifc')) {
        setError('Por favor, envie um arquivo com extensão .ifc');
        return;
      }
      setFile(droppedFile);
      setError('');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !name || !email) {
      setError('Por favor, preencha todos os campos obrigatórios e envie um arquivo.');
      return;
    }

    setError('');
    setLoading(true);
    setProgress(10);
    setProgressMsg('Fazendo upload do arquivo IFC...');

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev < 40) {
          setProgressMsg('Fazendo upload do arquivo IFC...');
          return prev + 5;
        } else if (prev < 70) {
          setProgressMsg('Analisando estrutura e esquema IFC...');
          return prev + 3;
        } else if (prev < 95) {
          setProgressMsg('Calculando notas de integridade e metadados...');
          return prev + 1;
        }
        return prev;
      });
    }, 300);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name);
      formData.append('email', email);
      formData.append('company', company);

      const response = await fetch(buildApiV1Url('/ifc/public-check'), {
        method: 'POST',
        body: formData,
      });

      clearInterval(timer);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Erro ao processar o arquivo IFC.');
      }

      setProgress(100);
      setProgressMsg('Relatório enviado com sucesso!');
      
      const data = await response.json();
      setResult(data);
      setLoading(false);
    } catch (err: any) {
      clearInterval(timer);
      setError(err.message || 'Ocorreu um erro ao processar seu arquivo.');
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #060608 0%, #101014 100%)',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '60px 20px',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <SEO
        title="Validador IFC Gratuito Online — Análise de Arquivos BIM"
        description="Suba seu arquivo IFC gratuitamente, analise a qualidade estrutural, metadados e compatibilidade do modelo 3D, e receba um relatório completo por e-mail."
        keywords="validador ifc, testar arquivo bim, checar qualidade ifc online"
        path="/validador"
      />

      {/* Main Container */}
      <div
        style={{
          width: '100%',
          maxWidth: '640px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '24px',
          padding: '40px',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
          <span style={{ fontSize: '11px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '4px 12px', borderRadius: '100px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Grátis
          </span>
          <span style={{ fontSize: '11px', background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', padding: '4px 12px', borderRadius: '100px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Product-Led
          </span>
        </div>

        <h1
          style={{
            fontSize: 'clamp(28px, 4vw, 36px)',
            fontWeight: 800,
            letterSpacing: '-0.8px',
            marginBottom: '12px',
            background: 'linear-gradient(90deg, #ffffff 0%, #a855f7 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Validador de Arquivos IFC
        </h1>

        <p
          style={{
            fontSize: '15px',
            color: 'rgba(255, 255, 255, 0.6)',
            lineHeight: '1.6',
            marginBottom: '32px',
          }}
        >
          Verifique a estrutura do seu modelo IFC e obtenha um diagnóstico detalhado de metadados, qualidade geométrica e compatibilidade 3D gratuitamente por e-mail.
        </p>

        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#ef4444',
              borderRadius: '12px',
              padding: '12px 16px',
              marginBottom: '24px',
              fontSize: '14px',
              textAlign: 'left',
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {!loading && !result && (
          <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
            {/* Drag & Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed rgba(255, 255, 255, 0.15)',
                borderRadius: '16px',
                padding: '40px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                background: file ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                borderColor: file ? '#3b82f6' : 'rgba(255, 255, 255, 0.15)',
                transition: 'all 0.2s ease',
                marginBottom: '28px',
              }}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".ifc"
                style={{ display: 'none' }}
              />
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📦</div>
              {file ? (
                <div>
                  <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 600, color: '#3b82f6' }}>
                    {file.name}
                  </h4>
                  <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)' }}>
                    {(file.size / (1024 * 1024)).toFixed(2)} MB • Clique para trocar de arquivo
                  </p>
                </div>
              ) : (
                <div>
                  <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 600 }}>
                    Arraste seu arquivo IFC aqui
                  </h4>
                  <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)' }}>
                    Ou clique para selecionar um arquivo (.ifc) do seu computador
                  </p>
                </div>
              )}
            </div>

            {/* Inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'rgba(255, 255, 255, 0.8)' }}>
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'rgba(255, 255, 255, 0.8)' }}>
                  E-mail Corporativo *
                </label>
                <input
                  type="email"
                  required
                  placeholder="nome@empresa.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'rgba(255, 255, 255, 0.8)' }}>
                  Nome da Empresa
                </label>
                <input
                  type="text"
                  placeholder="Sua construtora ou escritório"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '50px',
                background: '#ffffff',
                color: '#000000',
                border: 'none',
                fontWeight: 600,
                fontSize: '15px',
                cursor: 'pointer',
                textAlign: 'center',
                boxShadow: '0 4px 14px rgba(255, 255, 255, 0.1)',
                transition: 'opacity 0.2s ease',
              }}
            >
              Analisar IFC Gratuitamente →
            </button>
          </form>
        )}

        {/* Loading State */}
        {loading && (
          <div style={{ padding: '40px 0' }}>
            <div
              style={{
                width: '100%',
                height: '6px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '10px',
                overflow: 'hidden',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #3b82f6 0%, #a855f7 100%)',
                  borderRadius: '10px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <p style={{ fontSize: '15px', fontWeight: 500, color: '#fff', marginBottom: '8px' }}>
              {progressMsg}
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)' }}>
              Isso pode levar alguns segundos dependendo do tamanho do seu arquivo...
            </p>
          </div>
        )}

        {/* Result Success Screen */}
        {result && (
          <div style={{ padding: '20px 0', textAlign: 'center' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                background: 'rgba(168, 85, 247, 0.1)',
                border: '2px solid #a855f7',
                fontSize: '48px',
                fontWeight: 800,
                color: '#a855f7',
                marginBottom: '24px',
                boxShadow: '0 0 30px rgba(168, 85, 247, 0.2)',
              }}
            >
              {result.grade}
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
              Pontuação Geral: {result.score}/100
            </h3>
            <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)', maxWidth: '400px', margin: '0 auto 36px', lineHeight: '1.6' }}>
              Parabéns <strong>{result.name}</strong>! O arquivo <strong>{result.filename}</strong> foi analisado. Enviamos o relatório com recomendações detalhadas para o e-mail cadastrado.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <a
                href="/register"
                style={{
                  display: 'block',
                  padding: '14px',
                  borderRadius: '50px',
                  background: 'linear-gradient(90deg, #3b82f6 0%, #a855f7 100%)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '15px',
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(168, 85, 247, 0.3)',
                }}
              >
                Acessar Plataforma Completa (Grátis) →
              </a>
              <button
                onClick={() => {
                  setResult(null);
                  setFile(null);
                  setProgress(0);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.4)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Analisar outro arquivo IFC
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Back Link */}
      <a
        href="/"
        style={{
          marginTop: '32px',
          color: 'rgba(255, 255, 255, 0.4)',
          fontSize: '13px',
          textDecoration: 'none',
          transition: 'color 0.2s ease',
        }}
        onMouseOver={(e) => (e.currentTarget.style.color = '#fff')}
        onMouseOut={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)')}
      >
        ← Voltar para home
      </a>
    </div>
  );
}
