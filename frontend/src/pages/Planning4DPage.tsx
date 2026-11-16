import { useEffect, useState, type FormEvent } from 'react';
import {useSearchParams} from 'react-router-dom';
import PlanningKanban from '@/components/bim/PlanningKanban';
import PlanningImport from '@/components/bim/PlanningImport';
import BimWorkspace, { type BimSelection } from '@/components/bim/BimWorkspace';
import {
  schedulesService,
  type Atividade,
  type Cronograma,
  type ComparacaoTemporal,
} from '@/services/schedules.service';
import '@/styles/planning4d.css';

const DAY = 86_400_000;
const dateOnly = (value: string) => value.slice(0, 10);
const timestamp = (value: string) => Date.parse(`${dateOnly(value)}T00:00:00Z`);
const displayDate = (value: string) => {
  const [year, month, day] = dateOnly(value).split('-');
  return `${day}/${month}/${year}`;
};
const message = (error: unknown) =>
  error instanceof Error ? error.message : 'Não foi possível concluir. Tente novamente.';
const emptyActivity = { name: '', plannedStart: '', plannedEnd: '' };

export default function Planning4DPage() {
  return (
    <BimWorkspace
      title="Planejamento 4D"
      description="Organize atividades, conecte predecessoras e acompanhe os prazos do cenário."
    >
      {(workspace) => (
        <PlanningContent
          key={`${workspace.projectId}:${workspace.scenarioId}`}
          workspace={workspace}
        />
      )}
    </BimWorkspace>
  );
}

function PlanningContent({ workspace }: { workspace: BimSelection }) {
  const [query,setQuery]=useSearchParams();
  const kanban=query.get('visualizacao')==='kanban';
  const { projectId, scenarioId, modelId } = workspace;
  const [schedule, setSchedule] = useState<Cronograma | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [scheduleName, setScheduleName] = useState('');
  const [scheduleStart, setScheduleStart] = useState('');
  const [activity, setActivity] = useState(emptyActivity);
  const [editingId, setEditingId] = useState('');
  const [removing, setRemoving] = useState<Atividade | null>(null);
  const [predecessorId, setPredecessorId] = useState('');
  const [dependencyType, setDependencyType] = useState<'FS' | 'SS' | 'FF' | 'SF'>('FS');
  const [lag, setLag] = useState('0');
  const [otherScenario, setOtherScenario] = useState('');
  const [comparison, setComparison] = useState<ComparacaoTemporal | null>(null);

  useEffect(() => {
    let current = true;
    if (!projectId || !scenarioId || workspace.loading || workspace.error) return;
    setLoading(true);
    setLoadError('');
    schedulesService
      .doCenario(projectId, scenarioId)
      .then((result) => {
        if (current) setSchedule(result);
      })
      .catch((cause) => {
        if (current) setLoadError(message(cause));
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [projectId, scenarioId, workspace.loading, workspace.error, attempt]);

  const viewerUrl = modelId
    ? `/app?model=${encodeURIComponent(modelId)}&scenario=${encodeURIComponent(scenarioId)}`
    : '/app';
  const activities = schedule?.activities ?? [];
  const edited = activities.find((item) => item.id === editingId);
  const start = schedule
    ? Math.min(
        timestamp(schedule.startDate),
        ...activities.map((a) => timestamp(a.earlyStart || a.plannedStart))
      )
    : 0;
  const finish = schedule
    ? Math.max(
        timestamp(schedule.startDate),
        ...activities.map((a) => timestamp(a.earlyFinish || a.plannedEnd))
      )
    : 0;
  // Match the inclusive calendar-day convention used by the financial comparison.
  const duration = activities.length ? Math.max(1, Math.round((finish - start) / DAY) + 1) : 0;
  const linked = activities.filter((item) => item.elements?.length).length;
  const predecessorCount = activities.reduce(
    (total, item) => total + (item.predecessors?.length ?? 0),
    0
  );

  function resetActivity() {
    setActivity(emptyActivity);
    setEditingId('');
    setPredecessorId('');
  }

  async function mutate(action: () => Promise<unknown>, success: string, onSuccess?: () => void) {
    setBusy(true);
    setError('');
    setNotice('');
    setComparison(null);
    let saved = false;
    try {
      await action();
      saved = true;
      onSuccess?.();
      if (schedule) {
        const calculated = await schedulesService.calcular(schedule.id);
        setSchedule((previous) => ({ ...previous!, ...calculated }));
      }
      setNotice(success);
    } catch (cause) {
      setError(
        `${saved ? 'Alteração salva, mas o CPM não pôde ser atualizado. Use Recarregar CPM. ' : ''}${message(cause)}`
      );
    } finally {
      setBusy(false);
    }
  }

  async function createSchedule(event: FormEvent) {
    event.preventDefault();
    if (!scheduleName.trim() || !scheduleStart) {
      setError('Informe o nome e o início do cronograma.');
      return;
    }
    await mutate(async () => {
      const created = await schedulesService.criar(
        projectId,
        scheduleName.trim(),
        scheduleStart,
        scenarioId
      );
      setSchedule(created);
    }, 'Cronograma criado. Cadastre a primeira atividade.');
  }

  async function saveActivity(event: FormEvent) {
    event.preventDefault();
    if (!schedule) return;
    if (!activity.name.trim() || !activity.plannedStart || !activity.plannedEnd) {
      setError('Preencha o nome e as duas datas da atividade.');
      return;
    }
    if (activity.plannedEnd < activity.plannedStart) {
      setError('O fim planejado deve ser igual ou posterior ao início.');
      return;
    }
    const data = { ...activity, name: activity.name.trim() };
    await mutate(
      () =>
        editingId
          ? schedulesService.atualizarAtividade(editingId, data)
          : schedulesService.criarAtividade(schedule.id, data),
      'Atividade salva • CPM atualizado.',
      resetActivity
    );
  }

  async function addPredecessor(event: FormEvent) {
    event.preventDefault();
    if (!editingId || !predecessorId) return;
    const days = Number(lag);
    if (!Number.isInteger(days) || days < -365 || days > 365) {
      setError('A defasagem deve ser um número inteiro entre -365 e 365 dias.');
      return;
    }
    await mutate(
      () =>
        schedulesService.vincularPredecessora(editingId, predecessorId, {
          type: dependencyType,
          lagDays: days,
        }),
      'Predecessora vinculada • CPM atualizado.',
      () => setPredecessorId('')
    );
  }

  async function compare(event: FormEvent) {
    event.preventDefault();
    if (!otherScenario) return;
    setBusy(true);
    setError('');
    setComparison(null);
    try {
      setComparison(await schedulesService.compararPrazo(scenarioId, otherScenario));
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  }

  if (workspace.loading || workspace.error) return null;
  if (!projectId || !scenarioId)
    return (
      <section className="planning4d planning4d-empty">
        <h2>Prepare o contexto do planejamento</h2>
        <p>
          Crie um projeto, envie o modelo IFC e salve um cenário no viewer. Depois selecione o
          cenário para planejar suas atividades.
        </p>
        <a className="planning4d-primary" href="/app">
          Criar projeto • enviar IFC • criar cenário
        </a>
      </section>
    );
  if (loading)
    return (
      <p className="planning4d" role="status">
        Carregando cronograma e calculando prazos…
      </p>
    );
  if (loadError)
    return (
      <section className="planning4d planning4d-empty">
        <p role="alert">Não foi possível abrir o cronograma. {loadError}</p>
        <button type="button" onClick={() => setAttempt((value) => value + 1)}>
          Tentar novamente
        </button>
      </section>
    );

  return (
    <div className="planning4d" aria-busy={busy}>
      {error && (
        <p className="planning4d-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="planning4d-notice" role="status">
          {notice}
        </p>
      )}
      <PlanningImport projectId={projectId} scenarioId={scenarioId} scheduleName={schedule?.name||''} onImported={()=>{resetActivity();setComparison(null);setAttempt(value=>value+1);}}/>
      {!schedule ? (
        <section className="planning4d-card">
          <h2>O cenário ainda não tem cronograma</h2>
          <p>Defina o início da obra e adicione atividades com as datas planejadas.</p>
          <form className="planning4d-form" onSubmit={createSchedule}>
            <label>
              Nome do cronograma
              <input
                required
                maxLength={500}
                value={scheduleName}
                onChange={(e) => setScheduleName(e.target.value)}
              />
            </label>
            <label>
              Início do cronograma
              <input
                required
                type="date"
                value={scheduleStart}
                onChange={(e) => setScheduleStart(e.target.value)}
              />
            </label>
            <button className="planning4d-primary" disabled={busy}>
              Criar cronograma
            </button>
          </form>
        </section>
      ) : (
        <>
          <div className="planning4d-toolbar">
            <div>
              <span className="planning4d-eyebrow">CRONOGRAMA DO CENÁRIO</span>
              <h2>{schedule.name}</h2>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void mutate(async () => {}, 'CPM atualizado.')}
            >
              Recarregar CPM
            </button>
          </div>
          <dl className="planning4d-kpis">
            <div>
              <dt>Atividades</dt>
              <dd>{activities.length}</dd>
            </div>
            <div>
              <dt>Prazo calculado</dt>
              <dd>
                {duration} <small>dias</small>
              </dd>
            </div>
            <div>
              <dt>Conclusão CPM</dt>
              <dd>
                {activities.length ? displayDate(new Date(finish).toISOString()) : 'Sem atividades'}
              </dd>
            </div>
            <div>
              <dt>Dependências</dt>
              <dd>{predecessorCount}</dd>
            </div>
          </dl>
          <nav className="planning4d-view-controls" aria-label="Visualização do cronograma">{['gantt','kanban'].map(view=><button key={view} type="button" aria-pressed={kanban===(view==='kanban')} onClick={()=>{const next=new URLSearchParams(query);next.set('visualizacao',view);setQuery(next,{replace:true})}}>{view==='kanban'?'Kanban':'Gantt'}</button>)}</nav>
          {kanban?<PlanningKanban scheduleId={schedule.id} activities={activities}/>:<section className="planning4d-card">
            <div className="planning4d-toolbar">
              <div>
                <h3>Gantt • datas CPM</h3>
                <p>As barras seguem as datas calculadas a partir das predecessoras.</p>
              </div>
              <span className="planning4d-badge">{activities.length} atividades</span>
            </div>
            {!activities.length ? (
              <p>Adicione a primeira atividade abaixo para iniciar o Gantt.</p>
            ) : (
              <div
                className="planning4d-table-scroll"
                role="region"
                aria-label="Cronograma com rolagem horizontal"
                tabIndex={0}
              >
                <table aria-label="Gantt do cronograma">
                  <thead>
                    <tr>
                      <th scope="col">Atividade</th>
                      <th scope="col">Planejado</th>
                      <th scope="col">Início CPM</th>
                      <th scope="col">Fim CPM</th>
                      <th scope="col">Predecessoras</th>
                      <th scope="col" className="planning4d-timeline-column">
                        {displayDate(new Date(start).toISOString())} •{' '}
                        {displayDate(new Date(finish).toISOString())}
                      </th>
                      <th scope="col">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.map((item) => {
                      const earlyStart = item.earlyStart || item.plannedStart;
                      const earlyFinish = item.earlyFinish || item.plannedEnd;
                      const left = Math.max(
                        0,
                        ((timestamp(earlyStart) - start) / (DAY * Math.max(1, duration))) * 100
                      );
                      const width = Math.max(
                        1,
                        ((timestamp(earlyFinish) - timestamp(earlyStart)) /
                          (DAY * Math.max(1, duration))) *
                          100
                      );
                      return (
                        <tr key={item.id}>
                          <th scope="row">
                            {item.name}
                            <small>
                              {item.elements?.length
                                ? `${item.elements.length} elementos IFC`
                                : 'Sem vínculo IFC'}
                            </small>
                          </th>
                          <td>
                            {displayDate(item.plannedStart)}
                            <br />
                            {displayDate(item.plannedEnd)}
                          </td>
                          <td>{displayDate(earlyStart)}</td>
                          <td>{displayDate(earlyFinish)}</td>
                          <td>
                            {item.predecessors?.length
                              ? item.predecessors.map((p) => (
                                  <span className="planning4d-dependency" key={p.predecessorId}>
                                    {activities.find((a) => a.id === p.predecessorId)?.name ||
                                      'Atividade indisponível'}{' '}
                                    • {p.type || 'FS'} • {p.lagDays ?? 0} dias
                                  </span>
                                ))
                              : 'Nenhuma'}
                          </td>
                          <td>
                            <div
                              className="planning4d-track"
                              aria-label={`${item.name}: ${displayDate(earlyStart)} a ${displayDate(earlyFinish)}`}
                            >
                              <span
                                style={{
                                  left: `${left}%`,
                                  width: `${Math.min(width, 100 - left)}%`,
                                }}
                              />
                            </div>
                          </td>
                          <td>
                            <div className="planning4d-row-actions">
                              <button
                                type="button"
                                disabled={busy}
                                aria-label={`Editar ${item.name}`}
                                onClick={() => {
                                  setEditingId(item.id);
                                  setActivity({
                                    name: item.name,
                                    plannedStart: dateOnly(item.plannedStart),
                                    plannedEnd: dateOnly(item.plannedEnd),
                                  });
                                  setPredecessorId('');
                                  setError('');
                                  document.getElementById('planning4d-activity-name')?.focus();
                                }}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                aria-label={`Remover ${item.name}`}
                                onClick={() => setRemoving(item)}
                              >
                                Remover
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          }
          {removing && (
            <section
              className="planning4d-card planning4d-confirm"
              role="alertdialog"
              aria-labelledby="planning4d-remove-title"
              aria-describedby="planning4d-remove-description"
            >
              <h3 id="planning4d-remove-title">Remover {removing.name}?</h3>
              <p id="planning4d-remove-description">
                A atividade e seus vínculos serão excluídos. O cronograma será recalculado.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void mutate(
                    () => schedulesService.apagarAtividade(removing.id),
                    'Atividade removida • CPM atualizado.',
                    () => {
                      if (editingId === removing.id) resetActivity();
                      setRemoving(null);
                    }
                  )
                }
              >
                Confirmar remoção
              </button>
              <button type="button" disabled={busy} onClick={() => setRemoving(null)}>
                Cancelar remoção
              </button>
            </section>
          )}
          <div className="planning4d-columns">
            <section className="planning4d-card">
              <h3>{editingId ? 'Editar atividade' : 'Nova atividade'}</h3>
              <form className="planning4d-form" onSubmit={saveActivity}>
                <fieldset disabled={busy}>
                  <label>
                    Nome da atividade
                    <input
                      id="planning4d-activity-name"
                      required
                      maxLength={500}
                      value={activity.name}
                      onChange={(e) => setActivity({ ...activity, name: e.target.value })}
                    />
                  </label>
                  <div className="planning4d-dates">
                    <label>
                      Início planejado
                      <input
                        required
                        type="date"
                        value={activity.plannedStart}
                        onChange={(e) => setActivity({ ...activity, plannedStart: e.target.value })}
                      />
                    </label>
                    <label>
                      Fim planejado
                      <input
                        required
                        type="date"
                        value={activity.plannedEnd}
                        onChange={(e) => setActivity({ ...activity, plannedEnd: e.target.value })}
                      />
                    </label>
                  </div>
                  <button className="planning4d-primary">
                    {editingId ? 'Salvar atividade' : 'Adicionar atividade'}
                  </button>
                  {editingId && (
                    <button type="button" onClick={resetActivity}>
                      Cancelar edição
                    </button>
                  )}
                </fieldset>
              </form>
              {edited && (
                <div className="planning4d-predecessors">
                  <h4>Predecessoras de {edited.name}</h4>
                  <p>
                    FS • fim para início. SS • início para início. FF • fim para fim. SF • início
                    para fim.
                  </p>
                  {!!edited.predecessors?.length && (
                    <ul>
                      {edited.predecessors.map((p) => {
                        const name =
                          activities.find((a) => a.id === p.predecessorId)?.name ||
                          'Atividade indisponível';
                        return (
                          <li key={p.predecessorId}>
                            <span>
                              {name} • {p.type || 'FS'} • {p.lagDays ?? 0} dias
                            </span>
                            <button
                              disabled={busy}
                              type="button"
                              aria-label={`Desvincular ${name}`}
                              onClick={() =>
                                void mutate(
                                  () =>
                                    schedulesService.desvincularPredecessora(
                                      edited.id,
                                      p.predecessorId
                                    ),
                                  'Predecessora removida • CPM atualizado.'
                                )
                              }
                            >
                              Desvincular
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <form className="planning4d-form" onSubmit={addPredecessor}>
                    <fieldset disabled={busy}>
                      <label>
                        Atividade predecessora
                        <select
                          required
                          value={predecessorId}
                          onChange={(e) => setPredecessorId(e.target.value)}
                        >
                          <option value="">Selecione uma atividade</option>
                          {activities
                            .filter(
                              (a) =>
                                a.id !== edited.id &&
                                !edited.predecessors?.some((p) => p.predecessorId === a.id)
                            )
                            .map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name}
                              </option>
                            ))}
                        </select>
                      </label>
                      <div className="planning4d-dates">
                        <label>
                          Relação
                          <select
                            value={dependencyType}
                            onChange={(e) =>
                              setDependencyType(e.target.value as typeof dependencyType)
                            }
                          >
                            <option value="FS">FS • fim para início</option>
                            <option value="SS">SS • início para início</option>
                            <option value="FF">FF • fim para fim</option>
                            <option value="SF">SF • início para fim</option>
                          </select>
                        </label>
                        <label>
                          Defasagem em dias
                          <input
                            type="number"
                            min={-365}
                            max={365}
                            step={1}
                            value={lag}
                            onChange={(e) => setLag(e.target.value)}
                          />
                        </label>
                      </div>
                      <button disabled={!predecessorId}>Vincular predecessora</button>
                    </fieldset>
                  </form>
                </div>
              )}
            </section>
            <div className="planning4d-side">
              <section className="planning4d-card planning4d-viewer">
                <h3>Conecte o plano ao modelo</h3>
                <p>
                  {linked} de {activities.length} atividades com elementos IFC
                </p>
                <p>
                  No viewer, vincule os elementos às atividades por GlobalId e use a simulação 4D.
                  Atividades sem vínculo não alteram a visibilidade do modelo.
                </p>
                {modelId ? (
                  <a className="planning4d-primary" href={viewerUrl}>
                    Vincular elementos • simular 4D
                  </a>
                ) : (
                  <a className="planning4d-primary" href="/app">
                    Enviar IFC no viewer
                  </a>
                )}
              </section>
              <section className="planning4d-card">
                <h3>Compare os prazos</h3>
                <form className="planning4d-form" onSubmit={compare}>
                  <label>
                    Comparar com cenário
                    <select
                      required
                      disabled={busy}
                      value={otherScenario}
                      onChange={(e) => {
                        setOtherScenario(e.target.value);
                        setComparison(null);
                      }}
                    >
                      <option value="">Selecione outro cenário</option>
                      {workspace.scenarios
                        .filter((s) => s.id !== scenarioId)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <button disabled={busy || !otherScenario}>Comparar prazos</button>
                </form>
                {workspace.scenarios.length < 2 && (
                  <p>Salve outro cenário no viewer para comparar alternativas.</p>
                )}
                {comparison && (
                  <div className="planning4d-comparison" role="status">
                    {comparison.scenarioA.schedule && comparison.scenarioB.schedule ? (
                      <>
                        <p>
                          {comparison.scenarioA.name} •{' '}
                          {displayDate(comparison.scenarioA.schedule.completionDate)}
                        </p>
                        <p>
                          {comparison.scenarioB.name} •{' '}
                          {displayDate(comparison.scenarioB.schedule.completionDate)}
                        </p>
                        <strong>
                          {comparison.deltaDays === null
                            ? 'Prazo não calculado.'
                            : comparison.deltaDays === 0
                              ? 'Os cenários terminam na mesma data.'
                              : `${comparison.scenarioB.name} termina ${Math.abs(comparison.deltaDays)} dias ${comparison.deltaDays > 0 ? 'depois' : 'antes'} de ${comparison.scenarioA.name}.`}
                        </strong>
                      </>
                    ) : (
                      <p>
                        Um dos cenários ainda não tem cronograma. Cadastre atividades nos dois para
                        comparar os prazos.
                      </p>
                    )}
                  </div>
                )}
                {otherScenario && (
                  <a
                    className="planning4d-text-link"
                    href={`/app/compare?a=${encodeURIComponent(scenarioId)}&b=${encodeURIComponent(otherScenario)}&split=1&prazo=1`}
                  >
                    Abrir comparação de cenários
                  </a>
                )}
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
