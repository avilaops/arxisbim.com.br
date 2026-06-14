import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { CommentPanel } from './CommentPanel';
import { ViewerHost } from './ViewerHost';
import { CommentsAPIService } from '../api/v1/services/comments.service';


// Mock API Service
vi.mock('../api/v1/services/comments.service', () => {
  return {
    CommentsAPIService: {
      list: vi.fn(),
      create: vi.fn(),
      toggleResolve: vi.fn(),
      delete: vi.fn(),
    },
  };
});

describe('CommentPanel UI Component (S16)', () => {
  let container: HTMLElement;
  let viewerHost: ViewerHost;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    const canvas = document.createElement('canvas');
    viewerHost = new ViewerHost(canvas);

    localStorage.setItem('arxisvr_project_id', 'proj-123');
    vi.clearAllMocks();
  });

  afterEach(() => {
    container.remove();
    viewerHost.destroy();
    localStorage.removeItem('arxisvr_project_id');
  });

  it('renders collapsed comment panel by default', () => {
    const commentPanel = new CommentPanel(container, viewerHost);
    const element = container.querySelector('.bim-comment-panel');
    expect(element).toBeTruthy();
    expect(element?.classList.contains('collapsed')).toBe(true);
    commentPanel.destroy();
  });

  it('expands when clicked', () => {
    const commentPanel = new CommentPanel(container, viewerHost);
    const element = container.querySelector('.bim-comment-panel') as HTMLElement;
    const toggle = container.querySelector('.bim-comment-toggle') as HTMLElement;
    expect(toggle).toBeTruthy();

    toggle.click();

    expect(element.classList.contains('collapsed')).toBe(false);
    expect(container.querySelector('.bim-comment-title')).toBeTruthy();
    commentPanel.destroy();
  });

  it('displays empty message if no element is selected', () => {
    const commentPanel = new CommentPanel(container, viewerHost);
    // Expand
    const toggle = container.querySelector('.bim-comment-toggle') as HTMLElement;
    toggle.click();

    expect(container.textContent).toContain('Selecione um elemento IFC');
    commentPanel.destroy();
  });

  it('loads and displays comments when element is selected', async () => {
    const commentPanel = new CommentPanel(container, viewerHost);
    
    // Mock comments response
    const mockComments = [
      {
        id: 'c-1',
        projectId: 'proj-123',
        modelVersionId: 'version-456',
        globalId: 'GUID-ABC',
        worldPosition: { x: 10, y: 20, z: 30 },
        body: 'Main comment text',
        parentId: null,
        authorId: 'user-1',
        isResolved: false,
        resolvedBy: null,
        resolvedAt: null,
        createdAt: new Date().toISOString(),
        authorName: 'John Doe',
        resolvedByName: null,
        replies: [
          {
            id: 'r-1',
            projectId: 'proj-123',
            modelVersionId: null,
            globalId: null,
            worldPosition: null,
            body: 'First reply text',
            parentId: 'c-1',
            authorId: 'user-2',
            isResolved: false,
            resolvedBy: null,
            resolvedAt: null,
            createdAt: new Date().toISOString(),
            authorName: 'Jane Smith',
            resolvedByName: null,
            replies: [],
          }
        ],
      }
    ];

    vi.mocked(CommentsAPIService.list).mockResolvedValue(mockComments);

    // Mock scene traversal to resolve globalId
    const mockMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    mockMesh.name = '777';
    mockMesh.userData = { expressID: 777, globalId: 'GUID-ABC' };
    viewerHost.scene.add(mockMesh);

    // Trigger select callback registered in CommentPanel
    viewerHost.selectByExpressId(777);

    // Verify it expanded and load comments was triggered
    expect(container.querySelector('.bim-comment-panel')?.classList.contains('collapsed')).toBe(false);
    expect(CommentsAPIService.list).toHaveBeenCalledWith('proj-123', 'GUID-ABC');

    // Wait for render to finish
    await vi.waitFor(() => {
      expect(container.textContent).toContain('John Doe');
      expect(container.textContent).toContain('Main comment text');
      expect(container.textContent).toContain('Jane Smith');
      expect(container.textContent).toContain('First reply text');
    });

    commentPanel.destroy();

  });
});
