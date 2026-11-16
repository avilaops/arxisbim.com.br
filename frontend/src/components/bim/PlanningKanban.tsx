import { useEffect, useRef, useState } from 'react'
import {
  planningBoardApi,
  type PlanningBoard,
  type BoardChange,
  type PlanningColumn,
} from '@/services/planning-board.service'
import type { Atividade } from '@/services/schedules.service'
import {getUser} from '@/core/auth/session'
import '@/styles/planning-kanban.css'
const date = (value: string) =>
  value.slice(0, 10).split('-').reverse().join('/')
export default function PlanningKanban({
  scheduleId,
  activities,
}: {
  scheduleId: string
  activities: Atividade[]
}) {
  const [board, setBoard] = useState<PlanningBoard | null>(null)
  const [loading, setLoading] = useState(true),
    [saving, setBusy] = useState(false)
  const [error, setError] = useState(''),
    [notice, setNotice] = useState('')
  const [revision, setRevision] = useState(0)
  const [editing, setEditing] = useState<string | null>(null),
    [name, setName] = useState('')
  const readOnly=getUser()?.role==='viewer'
  const busy=saving||readOnly
  const generation = useRef(0),
    activityKey = activities
      .map((a) => a.id)
      .sort()
      .join(',')
  useEffect(() => {
    const request = ++generation.current
    setLoading(true)
    setError('')
    setBusy(false)
    planningBoardApi
      .get(scheduleId)
      .then((value) => {
        if (generation.current === request) setBoard(value)
      })
      .catch((e) => {
        if (generation.current === request)
          setError(
            e instanceof Error ? e.message : 'Não foi possível abrir o quadro.',
          )
      })
      .finally(() => {
        if (generation.current === request) setLoading(false)
      })
    return () => {
      generation.current++
    }
  }, [scheduleId, activityKey, revision])
  async function save(change: Omit<BoardChange, 'revision'>, message: string) {
    if (!board || busy) return
    const request = ++generation.current
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const next = await planningBoardApi.save(scheduleId, {
        revision: board.revision,
        ...change,
      })
      if (generation.current === request) {
        setBoard(next)
        setNotice(message)
        setEditing(null)
        setName('')
      }
    } catch (e) {
      if (generation.current === request)
        setError(
          e instanceof Error ? e.message : 'Não foi possível salvar o quadro.',
        )
    } finally {
      if (generation.current === request) setBusy(false)
    }
  }
  function move(activityId: string, columnId: string) {
    if (
      !board ||
      !activities.some((a) => a.id === activityId) ||
      (board.assignments[activityId] || 'unassigned') === columnId
    )
      return
    void save(
      { move: { activityId, columnId } },
      'Etapa atualizada • planejamento salvo.',
    )
  }
  function reorder(index: number, direction: number) {
    if (!board) return
    const next = [...board.columns],
      target = index + direction
    if (target < 1 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    void save({ columns: next }, 'Ordem das etapas salva.')
  }
  function remove(column: PlanningColumn) {
    if (
      !board ||
      !window.confirm(
        `Remover a etapa “${column.name}”? Suas atividades voltarão para Sem etapa.`,
      )
    )
      return
    void save(
      { columns: board.columns.filter((c) => c.id !== column.id) },
      'Etapa removida • atividades disponíveis em Sem etapa.',
    )
  }
  if (loading) return <p role="status">Carregando etapas do planejamento…</p>
  return (
    <section
      className="planning4d-card planning-kanban"
      aria-label="Kanban do planejamento"
    >
      <div className="planning4d-toolbar">
        <div>
          <h3>Kanban • etapas do planejamento</h3>
          <p>
            Organize as atividades por etapa. Datas e dependências continuam no
            Gantt; o quadro não registra avanço físico.
          </p>
        </div>
        <div className="bim-actions">
          <button
            type="button"
            disabled={busy}
            onClick={() => setRevision((v) => v + 1)}
          >
            Recarregar quadro
          </button>
          <button
            type="button"
            disabled={busy || !board || board.columns.length >= 12}
            onClick={() => {
              setEditing('')
              setName('')
            }}
          >
            Nova etapa
          </button>
        </div>
      </div>
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
      {board && editing !== null && (
        <form
          className="planning-kanban-stage-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (!name.trim()) return
            const columns = editing
              ? board.columns.map((c) =>
                  c.id === editing ? { ...c, name: name.trim() } : c,
                )
              : [
                  ...board.columns,
                  { id: crypto.randomUUID(), name: name.trim() },
                ]
            void save({ columns }, 'Etapa salva.')
          }}
        >
          <label>
            Nome da etapa
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              required
              disabled={busy}
            />
          </label>
          <button disabled={busy}>Salvar etapa</button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setEditing(null)}
          >
            Cancelar
          </button>
        </form>
      )}
      {board && (
        <div
          className="planning-kanban-scroll"
          role="region"
          aria-label="Etapas com rolagem horizontal"
          tabIndex={0}
        >
          <div className="planning-kanban-columns">
            {board.columns.map((column, index) => {
              const cards = activities
                .filter(
                  (a) =>
                    (board.assignments[a.id] || 'unassigned') === column.id,
                )
                .sort(
                  (a, b) =>
                    a.plannedStart.localeCompare(b.plannedStart) ||
                    a.name.localeCompare(b.name),
                )
              return (
                <section
                  className="planning-kanban-column"
                  key={column.id}
                  aria-label={`Etapa ${column.name}`}
                  onDragOver={(e) => {
                    if (!busy) e.preventDefault()
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    if (!busy)
                      move(
                        e.dataTransfer.getData(
                          'application/x-arxis-planning-activity',
                        ),
                        column.id,
                      )
                  }}
                >
                  <header>
                    <h4>{column.name}</h4>
                    <span>{cards.length}</span>
                  </header>
                  {column.id !== 'unassigned' && (
                    <div className="planning-kanban-column-actions">
                      <button
                        type="button"
                        disabled={busy}
                        aria-label={`Renomear etapa ${column.name}`}
                        onClick={() => {
                          setEditing(column.id)
                          setName(column.name)
                        }}
                      >
                        Renomear
                      </button>
                      <button
                        type="button"
                        disabled={busy || index === 1}
                        aria-label={`Mover etapa ${column.name} para esquerda`}
                        onClick={() => reorder(index, -1)}
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        disabled={busy || index === board.columns.length - 1}
                        aria-label={`Mover etapa ${column.name} para direita`}
                        onClick={() => reorder(index, 1)}
                      >
                        →
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        aria-label={`Remover etapa ${column.name}`}
                        onClick={() => remove(column)}
                      >
                        Remover
                      </button>
                    </div>
                  )}
                  {!cards.length && (
                    <p className="planning-kanban-empty">
                      Use o seletor de uma atividade ou arraste um cartão para
                      esta etapa.
                    </p>
                  )}
                  {cards.map((activity) => (
                    <article
                      key={activity.id}
                      className="planning-kanban-card"
                      draggable={!busy}
                      onDragStart={(e) => {
                        e.dataTransfer.setData(
                          'application/x-arxis-planning-activity',
                          activity.id,
                        )
                        e.dataTransfer.effectAllowed = 'move'
                      }}
                    >
                      <h5>{activity.name}</h5>
                      <p>
                        Planejado • {date(activity.plannedStart)} a{' '}
                        {date(activity.plannedEnd)}
                      </p>
                      {activity.earlyStart && activity.earlyFinish && (
                        <p>
                          CPM • {date(activity.earlyStart)} a{' '}
                          {date(activity.earlyFinish)}
                        </p>
                      )}
                      <small>
                        {activity.predecessors?.length || 0} predecessoras •{' '}
                        {activity.elements?.length || 0} elementos IFC
                      </small>
                      <label>
                        Etapa
                        <select
                          aria-label={`Etapa de ${activity.name}`}
                          value={column.id}
                          disabled={busy}
                          onChange={(e) => move(activity.id, e.target.value)}
                        >
                          {board.columns.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </article>
                  ))}
                </section>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
