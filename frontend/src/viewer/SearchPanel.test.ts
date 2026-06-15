import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SearchPanel } from './SearchPanel';
import { ViewerHost } from './ViewerHost';
import { BIMSearchAPIService } from '../api/v1/services/bim-search.service';
import { eventBus } from '../core';

// Mock the API Service
vi.mock('../api/v1/services/bim-search.service', () => {
  return {
    BIMSearchAPIService: {
      search: vi.fn(),
    },
  };
});

describe('SearchPanel UI Component (S15)', () => {
  let container: HTMLElement;
  let viewerHost: ViewerHost;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    const canvas = document.createElement('canvas');
    viewerHost = new ViewerHost(canvas);

    vi.clearAllMocks();
  });

  afterEach(() => {
    container.remove();
    viewerHost.destroy();
  });

  it('renders collapsed search panel by default', () => {
    const searchPanel = new SearchPanel(container, viewerHost);
    const element = container.querySelector('.bim-search-panel');
    expect(element).toBeTruthy();
    expect(element?.classList.contains('collapsed')).toBe(true);
    searchPanel.destroy();
  });

  it('expands when clicked', () => {
    const searchPanel = new SearchPanel(container, viewerHost);
    const element = container.querySelector('.bim-search-panel') as HTMLElement;
    const toggle = container.querySelector('.bim-search-toggle') as HTMLElement;
    expect(toggle).toBeTruthy();

    toggle.click();

    expect(element.classList.contains('collapsed')).toBe(false);
    expect(container.querySelector('.bim-search-title')).toBeTruthy();
    searchPanel.destroy();
  });

  it('displays empty message if no model version is active', () => {
    const searchPanel = new SearchPanel(container, viewerHost);
    // Expand
    const toggle = container.querySelector('.bim-search-toggle') as HTMLElement;
    toggle.click();

    expect(container.textContent).toContain('Nenhum modelo ativo');
    searchPanel.destroy();
  });

  it('enables inputs and triggers search API when model is loaded', async () => {
    const searchPanel = new SearchPanel(container, viewerHost);
    const toggle = container.querySelector('.bim-search-toggle') as HTMLElement;
    toggle.click();

    // Mock search results
    const mockResults = [
      {
        id: '1',
        modelVersionId: 'version-123',
        expressId: 456,
        globalId: 'GUID123',
        ifcType: 'IfcWall',
        name: 'Parede Teste',
        properties: {},
      },
    ];
    vi.mocked(BIMSearchAPIService.search).mockResolvedValue(mockResults);

    // Emit loaded event
    eventBus.emit('ifc:loaded', {
      model: { id: 'version-123', originalName: 'test.ifc' },
    });

    // Inputs should now be present
    const qInput = container.querySelector('#bim-search-q-input') as HTMLInputElement;
    expect(qInput).toBeTruthy();

    qInput.value = 'Parede';
    qInput.dispatchEvent(new Event('input'));

    const searchBtn = container.querySelector('#bim-search-submit-btn') as HTMLButtonElement;
    expect(searchBtn).toBeTruthy();

    searchBtn.click();

    // Verify search was called with active model and criteria
    expect(BIMSearchAPIService.search).toHaveBeenCalledWith('version-123', {
      q: 'Parede',
      type: undefined,
      pset: undefined,
      limit: 25,
      offset: 0,
    });

    // Wait for promise resolution
    await vi.waitFor(() => {
      expect(container.textContent).toContain('Parede Teste');
      expect(container.textContent).toContain('#456');
    });

    searchPanel.destroy();
  });

  it('triggers viewer selection and focus when result is clicked', async () => {
    const searchPanel = new SearchPanel(container, viewerHost);
    const toggle = container.querySelector('.bim-search-toggle') as HTMLElement;
    toggle.click();

    const mockResults = [
      {
        id: '1',
        modelVersionId: 'version-123',
        expressId: 789,
        globalId: 'GUID456',
        ifcType: 'IfcSlab',
        name: 'Laje Teste',
        properties: {},
      },
    ];
    vi.mocked(BIMSearchAPIService.search).mockResolvedValue(mockResults);

    // Load model
    eventBus.emit('ifc:loaded', {
      model: { id: 'version-123', originalName: 'test.ifc' },
    });

    // Trigger search
    const searchBtn = container.querySelector('#bim-search-submit-btn') as HTMLButtonElement;
    searchBtn.click();

    await vi.waitFor(() => {
      expect(container.querySelector('.bim-search-result-item')).toBeTruthy();
    });

    // Spy on viewerHost methods
    const selectSpy = vi.spyOn(viewerHost, 'selectByExpressId');
    const focusSpy = vi.spyOn(viewerHost, 'focusOnObject');

    // Click on result item
    const resultItem = container.querySelector('.bim-search-result-item') as HTMLElement;
    resultItem.click();

    expect(selectSpy).toHaveBeenCalledWith(789);
    expect(focusSpy).toHaveBeenCalledWith(789);

    searchPanel.destroy();
  });
});
