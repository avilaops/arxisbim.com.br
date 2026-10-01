import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import type { CreatedApiToken } from '@/types/apiToken';

interface ApiTokenCreatedModalProps {
  token: CreatedApiToken;
  onClose: () => void;
}

export default function ApiTokenCreatedModal({
  token,
  onClose,
}: ApiTokenCreatedModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(token.plainToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Acesso criado!</h2>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>⚠️ Importante:</strong> Esta é a única vez que você verá a chave de segurança.
              Copie e guarde em local seguro. Você não conseguirá vê-la novamente.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Chave de segurança
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={token.plainToken}
                readOnly
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-mono text-sm text-gray-700"
              />
              <button
                onClick={handleCopy}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 font-medium whitespace-nowrap"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copiar
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-lg">
            <div>
              <p className="text-gray-600 text-xs font-medium">Nome</p>
              <p className="font-semibold text-gray-900 mt-1">{token.token.name}</p>
            </div>
            <div>
              <p className="text-gray-600 text-xs font-medium">Uso</p>
              <p className="font-semibold text-gray-900 mt-1 capitalize">
                {token.token.environment === 'live' ? 'Produção' : 'Teste'}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-600 text-xs font-medium mb-2">Permissões</p>
              <div className="flex flex-wrap gap-1">
                {token.token.scopes.map((scope) => {
                  const [resource, permission] = scope.split(':');
                  const resourceMap: Record<string, string> = {
                    projects: 'Projetos',
                    models: 'Modelos 3D',
                    planning: 'Planejamento 4D',
                    budgets: 'Orçamentos 5D',
                    scenarios: 'Cenários',
                  };
                  const permissionLabel = permission === 'read' ? '📖' : '✏️';
                  return (
                    <span
                      key={scope}
                      className="px-2 py-1 bg-white border border-gray-300 text-gray-700 rounded text-xs"
                    >
                      {resourceMap[resource]} {permissionLabel}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
            <p>
              <strong>Próximo passo:</strong> Use esta chave para conectar o Arxis na sua ferramenta de integração.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
