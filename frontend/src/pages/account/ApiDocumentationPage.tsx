import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function ApiDocumentationPage() {
  const [expandedSection, setExpandedSection] = useState<string | null>('auth');

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Documentação da API</h1>
        <p className="text-lg text-gray-600">
          Use tokens API para acessar os recursos do ArxisVR programaticamente
        </p>
      </div>

      {/* Base URL */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-gray-600 font-medium">Endpoint base</p>
          <button
            onClick={() => navigator.clipboard.writeText('https://api.arxisvr.com/api/v1')}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Copiar
          </button>
        </div>
        <code className="text-gray-900 font-mono">https://api.arxisvr.com/api/v1</code>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {/* Authentication */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setExpandedSection(expandedSection === 'auth' ? null : 'auth')}
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition"
          >
            <h3 className="text-lg font-semibold text-gray-900">1. Autenticação</h3>
            {expandedSection === 'auth' ? (
              <ChevronUp className="h-5 w-5 text-gray-600" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-600" />
            )}
          </button>
          {expandedSection === 'auth' && (
            <div className="p-4 bg-white space-y-4 border-t border-gray-200">
              <p className="text-gray-700">
                Todos os requests à API devem incluir um token API no header de autorização:
              </p>
              <div className="bg-gray-900 p-4 rounded-lg font-mono text-sm text-gray-100 overflow-x-auto">
                Authorization: Bearer arx_live_xxxxxxxxxxxxxxxxxx
              </div>
              <p className="text-gray-700">
                O token pode ser <strong>live</strong> (produção) ou <strong>test</strong> (testes).
              </p>
              <h4 className="text-md font-semibold text-gray-900 mt-4">Exemplo com curl:</h4>
              <div className="bg-gray-900 p-4 rounded-lg font-mono text-sm text-gray-100 overflow-x-auto">
                {`curl -H "Authorization: Bearer arx_live_xxxxxxxxxxxxxxxxxx" \\
  https://api.arxisvr.com/api/v1/projects`}
              </div>
            </div>
          )}
        </div>

        {/* Scopes */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setExpandedSection(expandedSection === 'scopes' ? null : 'scopes')}
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition"
          >
            <h3 className="text-lg font-semibold text-gray-900">2. Escopos de Acesso</h3>
            {expandedSection === 'scopes' ? (
              <ChevronUp className="h-5 w-5 text-gray-600" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-600" />
            )}
          </button>
          {expandedSection === 'scopes' && (
            <div className="p-4 bg-white space-y-3 border-t border-gray-200">
              <p className="text-gray-700 mb-4">
                Cada token API possui escopos que definem quais operações ele pode realizar.
              </p>
              {[
                { scope: 'projects:read', desc: 'Ler dados de projetos' },
                { scope: 'projects:write', desc: 'Criar e editar projetos' },
                { scope: 'models:read', desc: 'Ler modelos 3D' },
                { scope: 'models:write', desc: 'Fazer upload de modelos' },
                { scope: 'planning:read', desc: 'Ler cronogramas' },
                { scope: 'planning:write', desc: 'Editar cronogramas' },
                { scope: 'budgets:read', desc: 'Ler orçamentos' },
                { scope: 'budgets:write', desc: 'Editar orçamentos' },
                { scope: 'scenarios:read', desc: 'Ler cenários' },
                { scope: 'scenarios:write', desc: 'Criar cenários' },
              ].map((item) => (
                <div key={item.scope} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                  <code className="bg-white px-2 py-1 rounded text-sm font-mono text-blue-600 whitespace-nowrap">
                    {item.scope}
                  </code>
                  <span className="text-gray-700">{item.desc}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Error Handling */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setExpandedSection(expandedSection === 'errors' ? null : 'errors')}
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition"
          >
            <h3 className="text-lg font-semibold text-gray-900">3. Tratamento de Erros</h3>
            {expandedSection === 'errors' ? (
              <ChevronUp className="h-5 w-5 text-gray-600" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-600" />
            )}
          </button>
          {expandedSection === 'errors' && (
            <div className="p-4 bg-white space-y-4 border-t border-gray-200">
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-2">401 Unauthorized</h4>
                <p className="text-gray-700 mb-2">Token inválido, expirado ou revogado.</p>
                <div className="bg-gray-900 p-4 rounded-lg font-mono text-sm text-gray-100 overflow-x-auto">
                  {`{
  "error": "Unauthorized",
  "message": "Invalid or revoked API token"
}`}
                </div>
              </div>

              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-2">403 Forbidden</h4>
                <p className="text-gray-700 mb-2">Token não possui escopo para acessar este recurso.</p>
                <div className="bg-gray-900 p-4 rounded-lg font-mono text-sm text-gray-100 overflow-x-auto">
                  {`{
  "error": "Forbidden",
  "message": "Required scopes: projects:write"
}`}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Best Practices */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setExpandedSection(expandedSection === 'practices' ? null : 'practices')}
            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition"
          >
            <h3 className="text-lg font-semibold text-gray-900">4. Boas Práticas</h3>
            {expandedSection === 'practices' ? (
              <ChevronUp className="h-5 w-5 text-gray-600" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-600" />
            )}
          </button>
          {expandedSection === 'practices' && (
            <div className="p-4 bg-white space-y-3 border-t border-gray-200">
              <ul className="space-y-3 text-gray-700">
                <li className="flex gap-3">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>
                    <strong>Nunca compartilhe seu token.</strong> Trate-o como uma senha.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>
                    <strong>Use tokens com escopo mínimo.</strong> Não dê :write se só precisa ler.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>
                    <strong>Defina datas de expiração.</strong> Tokens que expiram reduzem risco.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>
                    <strong>Use ambiente de teste.</strong> Crie tokens com environment: test.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>
                    <strong>Armazene com segurança.</strong> Nunca commite tokens em git.
                  </span>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
