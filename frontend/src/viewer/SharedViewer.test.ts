import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SharedViewer } from './SharedViewer';
import { SharingAPIService } from '../api/v1/services/sharing.service';
import { ViewerHost } from './ViewerHost';

// Mock the SharingAPIService
vi.mock('../api/v1/services/sharing.service', () => {
  return {
    SharingAPIService: {
      resolvePublicLink: vi.fn(),
      listPublicModels: vi.fn(),
      getPublicModelDownloadUrl: vi.fn(),
      getPublicElementProperties: vi.fn(),
    },
  };
});

describe('SharedViewer Component (S17)', () => {
  let container: HTMLElement;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    // Mock URL functions for JSDOM
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:test-url');
    global.URL.revokeObjectURL = vi.fn();

    // Mock HTML elements required by SharedViewer
    const header = document.createElement('header');
    header.id = 'shared-header';
    container.appendChild(header);

    const title = document.createElement('span');
    title.id = 'project-title';
    header.appendChild(title);

    const meta = document.createElement('span');
    meta.id = 'project-meta-info';
    header.appendChild(meta);

    const sidebar = document.createElement('aside');
    sidebar.id = 'shared-sidebar';
    container.appendChild(sidebar);

    const info = document.createElement('div');
    info.id = 'model-info';
    sidebar.appendChild(info);

    const loading = document.createElement('div');
    loading.id = 'loading';
    container.appendChild(loading);

    canvas = document.createElement('canvas');
    container.appendChild(canvas);

    vi.clearAllMocks();
  });

  afterEach(() => {
    container.remove();
  });

  it('renders error overlay when shared link has expired (410)', async () => {
    const error = new Error('Shared link has expired');
    (error as any).statusCode = 410;
    
    vi.mocked(SharingAPIService.resolvePublicLink).mockRejectedValue(error);

    const sharedViewer = new SharedViewer(container, canvas);
    await sharedViewer.initialize('some-expired-token');

    // Verify error message is rendered
    expect(container.textContent).toContain('Link Expirado ou Inativo');
    expect(container.textContent).toContain('Este link de visualização pública expirou');
  });

  it('renders project metadata and loads models on successful resolution', async () => {
    const mockDetails = {
      accessLevel: 'viewer' as const,
      expiresAt: null,
      project: {
        id: 'proj-123',
        name: 'Shared Project Test',
        description: 'Testing public link',
        location: null,
        status: 'active',
      },
      scenario: null,
    };

    const mockModels = [
      {
        id: 'model-123',
        originalName: 'Structure.ifc',
      },
    ];

    vi.mocked(SharingAPIService.resolvePublicLink).mockResolvedValue(mockDetails);
    vi.mocked(SharingAPIService.listPublicModels).mockResolvedValue(mockModels);
    vi.mocked(SharingAPIService.getPublicModelDownloadUrl).mockReturnValue('http://localhost/download');

    // Mock global fetch to return empty blob for simple loader
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      blob: async () => new Blob([''], { type: 'application/ifc' }),
    } as any);

    const sharedViewer = new SharedViewer(container, canvas);
    await sharedViewer.initialize('valid-token-123');

    // Verify project name updated
    const titleEl = container.querySelector('#project-title');
    expect(titleEl?.textContent).toBe('Shared Project Test');

    expect(SharingAPIService.resolvePublicLink).toHaveBeenCalledWith('valid-token-123');
    expect(SharingAPIService.listPublicModels).toHaveBeenCalledWith('valid-token-123');
    expect(mockFetch).toHaveBeenCalled();

    mockFetch.mockRestore();
  });
});
