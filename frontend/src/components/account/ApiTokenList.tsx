import type { ApiToken } from '@/types/apiToken';
import ApiTokenRow from './ApiTokenRow';

interface ApiTokenListProps {
  tokens: ApiToken[];
  onRevoke: (id: string) => void;
}

export default function ApiTokenList({ tokens, onRevoke }: ApiTokenListProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
              Integração
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
              Chave
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
              Uso
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
              Encerra
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
              Último acesso
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
              Status
            </th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {tokens.map((token) => (
            <ApiTokenRow
              key={token.id}
              token={token}
              onRevoke={onRevoke}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
