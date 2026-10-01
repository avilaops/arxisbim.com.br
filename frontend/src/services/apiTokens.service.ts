import type { ApiToken, ApiTokenScope } from '@/types/apiToken';
import { buildApiV1Url } from '@/config/apiBaseUrl';

export interface CreateApiTokenInput {
  name: string;
  scopes: ApiTokenScope[];
  environment: 'live' | 'test';
  expiresAt?: string | null;
}

export const apiTokensService = {
  async list(): Promise<ApiToken[]> {
    const response = await fetch(buildApiV1Url('/api-tokens'), {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('arxisvr_token')}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch API tokens');
    return response.json();
  },

  async create(input: CreateApiTokenInput) {
    const response = await fetch(buildApiV1Url('/api-tokens'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('arxisvr_token')}`,
      },
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error('Failed to create API token');
    return response.json();
  },

  async revoke(tokenId: string): Promise<void> {
    const response = await fetch(buildApiV1Url(`/api-tokens/${tokenId}`), {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('arxisvr_token')}`,
      },
    });
    if (!response.ok) throw new Error('Failed to revoke API token');
  },
};
