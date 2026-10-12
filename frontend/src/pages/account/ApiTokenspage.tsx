import { useState, useEffect } from 'react';
import { useApiTokens } from '@/hooks/useApiTokens';
import CreateApiTokenModal from '@/components/account/CreateApiTokenModal';
import ApiTokenCreatedModal from '@/components/account/ApiTokenCreatedModal';
import ApiTokenList from '@/components/account/ApiTokenList';
import ApiTokenEmptyState from '@/components/account/ApiTokenEmptyState';
import type { CreatedApiToken } from '@/types/apiToken';

export default function ApiTokensPage() {
  const { tokens, loading, error, fetchTokens, revokeToken } = useApiTokens();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createdToken, setCreatedToken] = useState<CreatedApiToken | null>(null);

  useEffect(() => {
    fetchTokens();
  }, []);

  const handleCreateToken = (token: CreatedApiToken) => {
    setCreatedToken(token);
    setShowCreateModal(false);
    setTimeout(() => fetchTokens(), 500);
  };

  const handleRevokeToken = async (tokenId: string) => {
    if (confirm('Tem certeza que deseja revogar este acesso? Ele não poderá mais ser usado.')) {
      try {
        await revokeToken(tokenId);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Erro ao revogar acesso');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" role="status" aria-label="Carregando integrações">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-gray-900">Integrações</h2>
          <p className="mt-1 text-xs text-gray-600">
            Conecte o Arxis a outras ferramentas (n8n, Power BI, ERP, aplicativos próprios).
          </p>
        </div>
        {!error && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="min-h-10 px-4 bg-blue-600 text-white text-xs font-semibold rounded-md hover:bg-blue-700 transition"
          >
            Nova integração
          </button>
        )}
      </div>

      {error ? (
        // Sem isto, a lista que não carregou (403 para quem não administra a
        // conta, por exemplo) aparecia como "nenhuma integração".
        <div role="alert" className="rounded-lg border px-4 py-3 text-sm">
          Não foi possível carregar as integrações desta conta. Só quem administra a conta pode vê-las.
        </div>
      ) : tokens.length === 0 ? (
        <ApiTokenEmptyState />
      ) : (
        <ApiTokenList
          tokens={tokens}
          onRevoke={handleRevokeToken}
        />
      )}

      {showCreateModal && (
        <CreateApiTokenModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateToken}
        />
      )}

      {createdToken && (
        <ApiTokenCreatedModal
          token={createdToken}
          onClose={() => setCreatedToken(null)}
        />
      )}
    </div>
  );
}
