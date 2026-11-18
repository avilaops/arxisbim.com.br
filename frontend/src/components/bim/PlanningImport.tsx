import { useState, type FormEvent } from 'react';
import { getUser } from '@/core/auth/session';
import { planningImportApi, type PlanningImportPreview } from '@/services/planning-import.service';

export default function PlanningImport({
  projectId,
  scenarioId,
  scheduleName,
  onImported,
}: {
  projectId: string;
  scenarioId: string;
  scheduleName: string;
  onImported: () => void;
}) {
  const [name, setName] = useState(scheduleName || 'Cronograma da obra');
  const [file, setFile] = useState<{ filename: string; content: string } | null>(null);
  const [preview, setPreview] = useState<PlanningImportPreview | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [details, setDetails] = useState<string[]>([]);
  const [notice, setNotice] = useState('');
  if (getUser()?.role === 'viewer') return null;
  const reset = () => {
    setPreview(null);
    setConfirmed(false);
    setError('');
    setDetails([]);
    setNotice('');
  };
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    setBusy(true);
    setError('');
    setDetails([]);
    setNotice('');
    setConfirmed(false);
    try {
      setPreview(await planningImportApi.preview(projectId, { ...file, name, scenarioId }));
    } catch (cause) {
      setPreview(null);
      setError(cause instanceof Error ? cause.message : 'Não foi possível gerar a prévia.');
      setDetails((cause as { details?: string[] }).details || []);
    } finally {
      setBusy(false);
    }
  }
  async function apply() {
    if (!file || !preview || !confirmed) return;
    setBusy(true);
    setError('');
    try {
      await planningImportApi.apply(projectId, {
        ...file,
        name,
        scenarioId,
        revision: preview.revision,
      });
      setPreview(null);
      setConfirmed(false);
      setNotice('Cronograma importado • datas e predecessoras atualizadas.');
      onImported();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível importar.');
      setDetails((cause as { details?: string[] }).details || []);
      setPreview(null);
      setConfirmed(false);
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="planning4d-card planning-import">
      <summary>Importar cronograma • CSV, XML ou XER</summary>
      <p>
        Importe um arquivo ou atualize o cronograma deste cenário. A correspondência usa o ID
        externo da atividade. Atividades ausentes no arquivo são mantidas.
      </p>
      <p>
        Vínculos IFC, etapas do Kanban e avanço existente são preservados. O avanço do arquivo é
        ignorado; novas atividades começam sem avanço real.
      </p>
      <form className="planning4d-form" onSubmit={submit}>
        <fieldset disabled={busy}>
          <label>
            Nome do cronograma importado
            <input
              required
              maxLength={255}
              value={name}
              onChange={(event) => {
                reset();
                setName(event.target.value);
              }}
            />
          </label>
          <label>
            Arquivo de cronograma
            <input
              required
              type="file"
              accept=".csv,.xml,.xer"
              onChange={async (event) => {
                const next = event.target.files?.[0];
                reset();
                setFile(null);
                if (!next) return;
                if (next.size > 1024 * 1024) {
                  setError('O limite por arquivo é 1 MB.');
                  return;
                }
                setBusy(true);
                try {
                  setFile({ filename: next.name, content: await next.text() });
                } catch {
                  setError('Não foi possível ler o arquivo.');
                } finally {
                  setBusy(false);
                }
              }}
            />
          </label>
          <small>
            Até 1 MB e 4.000 atividades • CSV em UTF-8 com id, name, start, end, predecessors
            (opcional) e wbs (opcional). Datas AAAA-MM-DD; predecessoras como 1FS+2d, separadas por
            ponto e vírgula. MS Project XML e Primavera XER utilizam datas planejadas e dias
            corridos no CPM; calendários de trabalho não são importados.
          </small>
          <button type="submit" disabled={!file || !name.trim()}>
            Gerar prévia
          </button>
        </fieldset>
      </form>
      {busy && <p role="status">Processando importação…</p>}
      {error && (
        <div role="alert">
          <p>{error}</p>
          {!!details.length && (
            <ul>
              {details.map((detail, index) => (
                <li key={index}>{detail}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {notice && <p role="status">{notice}</p>}
      {preview && (
        <section aria-label="Prévia da importação">
          <h3>Confira antes de importar</h3>
          <p>
            {preview.inserted} novas • {preview.updated} atualizadas • {preview.kept} mantidas fora
            do arquivo
          </p>
          <div className="planning4d-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>ID externo</th>
                  <th>Atividade</th>
                  <th>Início</th>
                  <th>Término</th>
                  <th>Predecessoras</th>
                  <th>Alteração</th>
                </tr>
              </thead>
              <tbody>
                {preview.activities.map((a) => (
                  <tr key={a.externalId}>
                    <td>{a.externalId}</td>
                    <td>{a.name}</td>
                    <td>{a.plannedStart}</td>
                    <td>{a.plannedEnd}</td>
                    <td>
                      {a.predecessors
                        .map((p) => `${p.predecessorExternalId} ${p.type} ${p.lagDays}d`)
                        .join(' • ') || 'Sem predecessoras'}
                    </td>
                    <td>{a.action === 'update' ? 'Atualizar' : 'Criar'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.total > 100 && (
            <p>Prévia das primeiras 100 de {preview.total} atividades • todas serão importadas.</p>
          )}
          <label className="planning-import-confirm">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={busy}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            Confirmo as alterações de nome, datas e predecessoras apresentadas.
          </label>
          <button
            className="planning4d-primary"
            type="button"
            disabled={busy || !confirmed}
            onClick={() => void apply()}
          >
            Aplicar importação
          </button>
        </section>
      )}
    </details>
  );
}
