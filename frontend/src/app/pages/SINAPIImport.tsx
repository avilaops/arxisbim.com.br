import React, { useState } from 'react';
import { getAPIClient } from '../../api/v1/client.js';
import '../../styles/pages/sinapi-import.css';

export function SINAPIImport() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleImport() {
    if (!file) {
      setError('Selecione um arquivo XLSX');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const client = getAPIClient();
      const res = await client.post('/admin/sinapi/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setResult({
        imported: res.data.imported_count || 0,
        skipped: res.data.skipped_count || 0,
      });

      setFile(null);
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          'Erro ao importar arquivo SINAPI. Verifique o formato.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sinapi-import">
      <h1>Importar SINAPI</h1>

      <div className="import-form">
        <label className="file-input-label">
          <span>Selecionar arquivo XLSX</span>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>

        {file && (
          <div className="selected-file">
            📄 {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}
        {result && (
          <div className="alert alert-success">
            ✓ Importação concluída: {result.imported} itens importados
            {result.skipped > 0 && `, ${result.skipped} pulados`}
          </div>
        )}

        <button
          className="btn-primary btn-large"
          onClick={handleImport}
          disabled={loading || !file}
        >
          {loading ? 'Importando...' : '⬆ Importar'}
        </button>
      </div>

      <div className="import-help">
        <h3>Formato esperado</h3>
        <ul>
          <li>Arquivo XLSX com colunas: código, descrição, unidade, preço</li>
          <li>Estado (UF) deve estar na primeira linha ou coluna</li>
          <li>Mês de referência automaticamente definido para hoje</li>
        </ul>
      </div>
    </div>
  );
}
