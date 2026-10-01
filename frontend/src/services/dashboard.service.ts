import { buildApiV1Url } from '@/config/apiBaseUrl';

export interface DashboardData {
  activeProjects: number;
  processedModels: number;
  xrMeetings: number;
  recentProjects: Array<{
    id: string;
    name: string;
    status: string;
    updatedAt: string;
  }>;
  recentActivities: Array<{
    id: string;
    action: string;
    resource: string;
    resourceId: string | null;
    timestamp: string;
    userId: string | null;
  }>;
}

export const dashboardService = {
  async get(): Promise<DashboardData> {
    const response = await fetch(buildApiV1Url('/dashboard'), {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('arxisvr_token')}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch dashboard data');
    return response.json();
  },
};
