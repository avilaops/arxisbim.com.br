import { useState, useEffect } from 'react';
import { useApiTokens } from '@/hooks/useApiTokens';
import CreateApiTokenModal from '@/components/account/CreateApiTokenModal';
import ApiTokenCreatedModal from '@/components/account/ApiTokenCreatedModal';
import ApiTokenList from '@/components/account/ApiTokenList';
import ApiTokenEmptyState from '@/components/account/ApiTokenEmptyState';
import type { CreatedApiToken } from '@/types/apiToken';

export default function ApiTokensPage() {
  const { tokens, loading, fetchTokens, revokeToken } = useApiTokens();
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
      <div className="flex items-center justify-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Integrações</h1>
          <p className="mt-1 text-sm text-gray-600">
            Conecte o ArxisVR a outras ferramentas (n8n, Power BI, ERP, aplicativos próprios, etc.)
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
        >
          + Nova integração
        </button>
      </div>

      {tokens.length === 0 ? (
        <ApiTokenEmptyState />
      ) : (
        <ApiTokenList
          tokens={tokens}
          onRevoke={handleRevokeToken}
        />
      )}

      {showCreateModal && (
        <CreateApiTokenModal
          onClose={() => setShowCreateModal(true)}
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
