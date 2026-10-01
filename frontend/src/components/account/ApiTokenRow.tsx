import { Trash2 } from 'lucide-react';
import type { ApiToken } from '@/types/apiToken';

interface ApiTokenRowProps {
  token: ApiToken;
  onRevoke: (id: string) => void;
}

export default function ApiTokenRow({ token, onRevoke }: ApiTokenRowProps) {
  const isExpired = token.expiresAt && new Date(token.expiresAt) < new Date();
  const isRevoked = !!token.revokedAt;

  return (
    <tr className="hover:bg-gray-50 transition">
      <td className="px-4 py-3 text-sm font-medium text-gray-900">{token.name}</td>
      <td className="px-4 py-3 text-sm font-mono text-gray-600">{token.prefix}</td>
      <td className="px-4 py-3 text-sm">
        <span
          className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            token.environment === 'live'
              ? 'bg-red-100 text-red-800'
              : 'bg-blue-100 text-blue-800'
          }`}
        >
          {token.environment === 'live' ? 'Produção' : 'Teste'}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {token.expiresAt
          ? new Date(token.expiresAt).toLocaleDateString('pt-BR')
          : 'Sem data'}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {token.lastUsedAt
          ? new Date(token.lastUsedAt).toLocaleDateString('pt-BR')
          : 'Nunca'}
      </td>
      <td className="px-4 py-3 text-sm">
        {isRevoked && (
          <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
            Revogado
          </span>
        )}
        {isExpired && !isRevoked && (
          <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
            Expirado
          </span>
        )}
        {!isExpired && !isRevoked && (
          <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
            Ativo
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-right">
        <button
          onClick={() => onRevoke(token.id)}
          disabled={isRevoked}
          className="text-red-600 hover:text-red-800 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 ml-auto"
        >
          <Trash2 className="h-4 w-4" />
          Revogar
        </button>
      </td>
    </tr>
  );
}
