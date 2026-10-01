import { useState } from 'react';
import type { ApiToken } from '@/types/apiToken';
import { apiTokensService } from '@/services/apiTokens.service';

export function useApiTokens() {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTokens = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiTokensService.list();
      setTokens(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tokens');
    } finally {
      setLoading(false);
    }
  };

  const createToken = async (name: string, scopes: string[], environment: 'live' | 'test', expiresAt?: string | null) => {
    try {
      const result = await apiTokensService.create({
        name,
        scopes: scopes as any,
        environment,
        expiresAt,
      });
      setTokens((prev) => [...prev, result.token]);
      return result;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to create token');
    }
  };

  const revokeToken = async (tokenId: string) => {
    try {
      await apiTokensService.revoke(tokenId);
      setTokens((prev) => prev.filter((t) => t.id !== tokenId));
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to revoke token');
    }
  };

  return {
    tokens,
    loading,
    error,
    fetchTokens,
    createToken,
    revokeToken,
  };
}
