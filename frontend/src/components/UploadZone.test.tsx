import { describe, it, expect, vi, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { UploadZone } from './UploadZone';

let container: HTMLDivElement; let root: Root;
afterEach(() => { act(() => root.unmount()); container.remove(); });

async function render(el: React.ReactElement) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root.render(el); });
}

function setFiles(input: HTMLInputElement, file: File) {
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('UploadZone', () => {
  it('rejects non-.ifc with error', async () => {
    const onUpload = vi.fn();
    await render(<UploadZone onUpload={onUpload} />);
    const input = container.querySelector('[data-testid="upload-input"]') as HTMLInputElement;
    await act(async () => setFiles(input, new File(['x'], 'model.txt')));
    expect(container.querySelector('[data-testid="upload-error"]')).toBeTruthy();
    expect(onUpload).not.toHaveBeenCalled();
  });

  it('uploads .ifc, reports progress, fires onStart/onFinish', async () => {
    const onStart = vi.fn(); const onFinish = vi.fn();
    const onUpload = vi.fn(async (_f: File, onProgress: (p: number) => void) => { onProgress(50); onProgress(100); });
    await render(<UploadZone onUpload={onUpload} onStart={onStart} onFinish={onFinish} />);
    const input = container.querySelector('[data-testid="upload-input"]') as HTMLInputElement;
    await act(async () => setFiles(input, new File(['x'], 'tower.ifc')));
    expect(onStart).toHaveBeenCalledOnce();
    expect(onUpload).toHaveBeenCalledOnce();
    expect(onFinish).toHaveBeenCalledOnce();
    expect(container.querySelector('[data-phase="done"]')).toBeTruthy();
  });

  it('shows error phase when upload rejects', async () => {
    const onUpload = vi.fn(async () => { throw new Error('rede caiu'); });
    await render(<UploadZone onUpload={onUpload} />);
    const input = container.querySelector('[data-testid="upload-input"]') as HTMLInputElement;
    await act(async () => setFiles(input, new File(['x'], 'a.ifc')));
    expect(container.querySelector('[data-phase="error"]')).toBeTruthy();
    expect(container.textContent).toContain('rede caiu');
  });
});
