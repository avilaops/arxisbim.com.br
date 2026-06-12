/**
 * UploadZone (S05) — drag-and-drop + botão para upload do primeiro IFC.
 *
 * Presentational: recebe `onUpload(file, onProgress)` via prop (Shell rule),
 * não conhece files.service nem presigned URL. Valida extensão .ifc, mostra
 * progresso % real (vindo do callback), estados idle/dragging/uploading/error/done.
 */
import React from 'react';

type Phase = 'idle' | 'dragging' | 'uploading' | 'done' | 'error';

export interface UploadZoneProps {
  /** Faz o upload e reporta progresso 0–100. Lança em falha. */
  onUpload: (file: File, onProgress: (pct: number) => void) => Promise<void>;
  /** Chamado ao iniciar (telemetria upload_started). */
  onStart?: (file: File) => void;
  /** Chamado ao concluir (telemetria upload_finished). */
  onFinish?: (file: File) => void;
  accept?: string;
}

function isIfc(name: string): boolean {
  return name.toLowerCase().endsWith('.ifc');
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onUpload, onStart, onFinish, accept = '.ifc' }) => {
  const [phase, setPhase] = React.useState<Phase>('idle');
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = React.useCallback(async (file: File) => {
    setError(null);
    if (!isIfc(file.name)) {
      setPhase('error');
      setError('Apenas arquivos .ifc são aceitos.');
      return;
    }
    setPhase('uploading');
    setProgress(0);
    onStart?.(file);
    try {
      await onUpload(file, (pct) => setProgress(Math.min(100, Math.max(0, Math.round(pct)))));
      setPhase('done');
      setProgress(100);
      onFinish?.(file);
    } catch (err: any) {
      setPhase('error');
      setError(err?.message || 'Falha no upload.');
    }
  }, [onUpload, onStart, onFinish]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
    else setPhase('idle');
  };

  const borderColor = phase === 'dragging' ? 'var(--color-primary, #2563EB)'
    : phase === 'error' ? 'var(--color-danger, #dc2626)'
    : 'var(--color-border, #d1d5db)';

  return (
    <div
      data-testid="upload-zone"
      data-phase={phase}
      onDragOver={(e) => { e.preventDefault(); if (phase === 'idle') setPhase('dragging'); }}
      onDragLeave={() => { if (phase === 'dragging') setPhase('idle'); }}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      style={{
        border: `2px dashed ${borderColor}`,
        borderRadius: 12,
        padding: '32px 24px',
        textAlign: 'center',
        cursor: 'pointer',
        background: phase === 'dragging' ? 'var(--color-primary-soft, #eff6ff)' : 'var(--color-surface, #fff)',
        transition: 'border-color .2s, background .2s',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        data-testid="upload-input"
        style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
      />

      {phase === 'uploading' ? (
        <div data-testid="upload-progress">
          <p style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--color-text, #111)' }}>Enviando… {progress}%</p>
          <div style={{ height: 6, borderRadius: 3, background: 'var(--color-surface-2, #f3f4f6)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--color-primary, #2563EB)', transition: 'width .2s' }} />
          </div>
        </div>
      ) : phase === 'done' ? (
        <p style={{ margin: 0, fontSize: 15, color: 'var(--color-success, #15803d)', fontWeight: 600 }}>✓ Modelo enviado — processando…</p>
      ) : (
        <>
          <div style={{ fontSize: 32 }} aria-hidden="true">📐</div>
          <p style={{ margin: '8px 0 4px', fontSize: 15, fontWeight: 600, color: 'var(--color-text, #111)' }}>
            Arraste seu IFC aqui ou clique para selecionar
          </p>
          {error && <p data-testid="upload-error" role="alert" style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--color-danger, #dc2626)' }}>{error}</p>}
        </>
      )}
    </div>
  );
};
