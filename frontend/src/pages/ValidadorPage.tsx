import { useState, useRef } from 'react';
import { Upload } from 'lucide-react';
import { buildApiV1Url } from '@/config/apiBaseUrl';
import SEO from '../components/SEO';
import BrandLogo from '../components/public/BrandLogo';
import { publicSiteHref } from '../config/site.config'

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
    <div className="arx-avulsa">
      <SEO
        title="Validador IFC Gratuito Online — Análise de Arquivos BIM"
        description="Suba seu arquivo IFC gratuitamente, analise a qualidade estrutural, metadados e compatibilidade do modelo 3D, e receba um relatório completo por e-mail."
        keywords="validador ifc, testar arquivo bim, checar qualidade ifc online"
        path="/validador"
      />

      <a className="arx-avulsa__marca" href={publicSiteHref()} aria-label="Arxis, página inicial">
        <BrandLogo />
      </a>

      <main className="arx-avulsa__cartao">
        <span className="arx-avulsa__selo">Grátis</span>
        <h1>Validador de arquivos IFC</h1>
        <p className="arx-avulsa__texto">
          Envie seu modelo IFC e receba por e-mail o diagnóstico de metadados, qualidade geométrica e compatibilidade 3D.
        </p>

        {error && (
          <div className="arx-avulsa__erro" role="alert">
            {error}
          </div>
        )}

        {!loading && !result && (
          <form onSubmit={handleSubmit}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".ifc"
              hidden
              tabIndex={-1}
            />
            <button
              type="button"
              className="arx-avulsa__solta"
              data-com-arquivo={Boolean(file)}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={22} strokeWidth={1.75} aria-hidden="true" />
              {file ? (
                <>
                  <strong>{file.name}</strong>
                  <span className="arx-avulsa__apoio">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB. Toque para trocar de arquivo.
                  </span>
                </>
              ) : (
                <>
                  <strong>Escolher arquivo IFC</strong>
                  <span className="arx-avulsa__apoio">Toque para selecionar ou arraste o arquivo (.ifc) até aqui.</span>
                </>
              )}
            </button>

            <div className="arx-avulsa__campos">
              <label className="arx-avulsa__campo">
                <span>Nome completo</span>
                <input
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>

              <label className="arx-avulsa__campo">
                <span>E-mail de trabalho</span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>

              <label className="arx-avulsa__campo">
                <span>Empresa (opcional)</span>
                <input
                  type="text"
                  autoComplete="organization"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </label>
            </div>

            <button type="submit" className="arx-avulsa__botao">
              Analisar IFC gratuitamente
            </button>
          </form>
        )}

        {loading && (
          <div role="status">
            <div className="arx-avulsa__barra">
              <div style={{ width: `${progress}%` }} />
            </div>
            <h2>{progressMsg}</h2>
            <p className="arx-avulsa__apoio">Pode levar alguns segundos, conforme o tamanho do arquivo.</p>
          </div>
        )}

        {result && (
          <div>
            <div className="arx-avulsa__nota">{result.grade}</div>
            <h2>Pontuação geral: {result.score}/100</h2>
            <p className="arx-avulsa__texto">
              <strong>{result.name}</strong>, o arquivo <strong>{result.filename}</strong> foi analisado. O relatório com as recomendações foi para o e-mail informado.
            </p>
            <a className="arx-avulsa__botao" href="/register">
              Criar conta gratuita
            </a>
            <button
              type="button"
              className="arx-avulsa__ligacao"
              onClick={() => {
                setResult(null);
                setFile(null);
                setProgress(0);
              }}
            >
              Analisar outro arquivo IFC
            </button>
          </div>
        )}
      </main>

      <a className="arx-avulsa__ligacao" href={publicSiteHref()}>
        Voltar ao site
      </a>
    </div>
  );
}
