import { useState, type FormEvent } from 'react'
import {
  scopeName,
  statusName,
  type Service,
  type Settings,
  type Workspace,
} from '@/services/obra.service'

export type Save = (
  path: string,
  method: string,
  data: unknown,
  message: string,
) => Promise<boolean>
const field = (form: FormData, name: string) => String(form.get(name) ?? '').trim()
const decimal = (form: FormData, name: string) => field(form, name).replace(',', '.') || null
export const localDate = () => new Date().toLocaleDateString('sv-SE')
function fields(event: FormEvent<HTMLFormElement>) {
  event.preventDefault()
  return new FormData(event.currentTarget)
}
function Numeric({
  name,
  label,
  value,
  required = false,
}: {
  name: string
  label: string
  value?: string | null
  required?: boolean
}) {
  return (
    <label>
      {label}
      <input
        name={name}
        defaultValue={value ?? ''}
        inputMode="decimal"
        pattern="[0-9]+([,.][0-9]{1,4})?"
        required={required}
      />
    </label>
  )
}
export function ObraSettingsForm({
  settings,
  name,
  save,
}: {
  settings?: Settings
  name: string
  save: Save
}) {
  return (
    <form
      className="obra-form"
      onSubmit={(event) => {
        const f = fields(event)
        void save(
          '',
          'PUT',
          {
            name: field(f, 'name'),
            area: decimal(f, 'area'),
            months: Number(field(f, 'months')),
            scope: field(f, 'scope'),
            start_date: field(f, 'start'),
            bdi: decimal(f, 'bdi'),
            revision: settings?.revision ?? 0,
          },
          'Parâmetros da obra salvos.',
        )
      }}
    >
      <label>
        Nome da obra
        <input name="name" defaultValue={settings?.name ?? name} required maxLength={500} />
      </label>
      <Numeric name="area" label="Área construída (m²)" value={settings?.area} required />
      <label>
        Início previsto
        <input
          type="date"
          name="start"
          defaultValue={settings?.start_date ?? localDate()}
          required
        />
      </label>
      <label>
        Prazo (meses)
        <input
          type="number"
          name="months"
          min="1"
          max="600"
          defaultValue={settings?.months}
          required
        />
      </label>
      <Numeric name="bdi" label="BDI (%)" value={settings?.bdi ?? '0'} required />
      <label>
        Escopo
        <select name="scope" defaultValue={settings?.scope ?? 'full'}>
          {Object.entries(scopeName).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <button className="bim-button">Salvar parâmetros</button>
    </form>
  )
}

export function ServiceForm({
  data,
  line,
  save,
  close,
}: {
  data: Workspace
  line?: Service
  save: Save
  close: () => void
}) {
  const [id] = useState(() => line?.id ?? crypto.randomUUID())
  const [status, setStatus] = useState(line?.status ?? 'pending')
  const [doc, setDoc] = useState(line?.document_id ?? '')
  const [useArea, setUseArea] = useState(false)
  const [correctionId, setCorrectionId] = useState(() => crypto.randomUUID())
  const [correction, setCorrection] = useState('')
  return (
    <form
      className="obra-form"
      onSubmit={async (event) => {
        const f = fields(event)
        if (
          await save(
            '/service',
            'PUT',
            {
              id,
              revision: line?.revision ?? 0,
              description: field(f, 'description'),
              stage: field(f, 'stage'),
              unit: useArea ? 'm²' : field(f, 'unit'),
              quantity: useArea ? data.settings.area : decimal(f, 'qty'),
              material: decimal(f, 'material'),
              equipment: decimal(f, 'equipment'),
              labor: decimal(f, 'labor'),
              combined: decimal(f, 'combined'),
              status,
              assumption: field(f, 'assumption'),
              evidence: field(f, 'evidence'),
              activity_id: field(f, 'activity') || null,
              global_id: field(f, 'guid') || null,
              document_id: doc || null,
              page: doc ? Number(field(f, 'page')) : null,
            },
            'Serviço salvo.',
          )
        )
          close()
      }}
    >
      <label>
        Descrição do serviço
        <input name="description" defaultValue={line?.description} required maxLength={500} />
      </label>
      <label>
        Etapa
        <input name="stage" defaultValue={line?.stage} required list="obra-stages" />
      </label>
      <datalist id="obra-stages">
        {[...new Set(data.report.lines.map((l) => l.stage))].map((s) => (
          <option key={s}>{s}</option>
        ))}
      </datalist>
      <label>
        Unidade
        <input
          name="unit"
          key={'unit' + useArea}
          readOnly={useArea}
          defaultValue={useArea ? 'm²' : (line?.unit ?? 'm²')}
          required
        />
      </label>
      <Numeric
        name="qty"
        label="Quantidade do serviço"
        value={useArea ? data.settings.area : line?.quantity}
        key={String(useArea)}
      />
      <label>
        <input
          type="checkbox"
          checked={useArea}
          onChange={(e) => {
            setUseArea(e.target.checked)
            if (e.target.checked) setStatus('estimated')
          }}
        />
        Usar área construída como estimativa em m²
      </label>
      <Numeric name="labor" label="Mão de obra (R$/unidade)" value={line?.labor} />
      <Numeric name="material" label="Material (R$/unidade)" value={line?.material} />
      <Numeric name="equipment" label="Equipamento (R$/unidade)" value={line?.equipment} />
      <Numeric
        name="combined"
        label="Preço único sem composição (R$/unidade)"
        value={line?.combined}
      />
      <label>
        Atividade de execução
        <select name="activity" defaultValue={line?.activity_id ?? ''}>
          <option value="">A programar</option>
          {data.activities.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} • {a.start}
            </option>
          ))}
        </select>
      </label>
      <label>
        GlobalId do elemento IFC
        <input name="guid" defaultValue={line?.global_id ?? ''} maxLength={22} />
      </label>
      <label>
        Prancha ou relatório
        <select value={doc} onChange={(e) => setDoc(e.target.value)}>
          <option value="">Sem PDF</option>
          {data.documents.map((d) => (
            <option key={d.id} value={d.id}>
              {d.filename}
            </option>
          ))}
        </select>
      </label>
      {doc && (
        <label>
          Página de origem
          <input
            type="number"
            min="1"
            max={data.documents.find((d) => d.id === doc)?.pages}
            name="page"
            required
            defaultValue={line?.page ?? 1}
          />
        </label>
      )}
      <label>
        Fonte e memória da medição
        <textarea name="evidence" defaultValue={line?.evidence} required={status !== 'pending'} />
      </label>
      <label>
        Situação
        <select
          disabled={useArea}
          value={status}
          onChange={(e) => setStatus(e.target.value as Service['status'])}
        >
          {Object.entries(statusName).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label>
        Premissa aprovada ou especificação conferida
        <textarea
          name="assumption"
          defaultValue={line?.assumption}
          required={status === 'estimated'}
        />
      </label>
      {line?.issue && <p>{line.issue}</p>}
      {line && (
        <label>
          Correção para o projetista
          <input
            value={correction}
            onChange={(e) => setCorrection(e.target.value)}
            maxLength={500}
          />
          <button
            type="button"
            disabled={!correction.trim()}
            onClick={async () => {
              if (
                await save(
                  '/services/' + line.id + '/correction',
                  'POST',
                  { message: correction, requestId: correctionId },
                  'Solicitação registrada nos comentários do projeto.',
                )
              ) {
                setCorrection('')
                setCorrectionId(crypto.randomUUID())
              }
            }}
          >
            Registrar pedido de correção
          </button>
        </label>
      )}
      <div className="obra-actions">
        <button className="bim-button">Salvar serviço</button>
        <button type="button" onClick={close}>
          Fechar
        </button>
      </div>
    </form>
  )
}

export function IfcForm({ data, save }: { data: Workspace; save: Save }) {
  return (
    <form
      className="obra-form"
      onSubmit={(event) => {
        const f = fields(event)
        void save(
          '/ifc',
          'POST',
          {
            itemId: field(f, 'item'),
            category: field(f, 'category'),
            stage: field(f, 'stage'),
            storey: field(f, 'storey') ? Number(field(f, 'storey')) : null,
            requirements: field(f, 'props')
              .split('\n')
              .map((s) => s.trim())
              .filter(Boolean),
          },
          'Diagnóstico IFC concluído.',
        )
      }}
    >
      <label>
        Serviço da tabela de preços
        <select name="item" required>
          {data.items.map((i) => (
            <option value={i.id} key={i.id}>
              {i.description} • {i.unit} • {i.table_name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Categoria IFC
        <select name="category" required>
          {data.categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <label>
        Etapa do orçamento
        <input name="stage" required />
      </label>
      <label>
        Pavimento (Express ID opcional)
        <input type="number" name="storey" />
      </label>
      <label>
        Propriedades obrigatórias • uma por linha
        <textarea
          name="props"
          placeholder={'Pset_WallCommon.FireRating\nPset_Acabamento.Tinta=Acrílica'}
        />
      </label>
      <button className="bim-button" disabled={!data.items.length || !data.categories.length}>
        Verificar elementos e incluir serviços
      </button>
    </form>
  )
}
export function MeasurementForm({ data, save }: { data: Workspace; save: Save }) {
  const [token, setToken] = useState(() => crypto.randomUUID())
  const eligible = data.report.lines.filter((l) => l.status !== 'pending')
  return (
    <form
      className="obra-form"
      onSubmit={async (event) => {
        const el = event.currentTarget,
          f = fields(event)
        if (
          await save(
            '/measurements',
            'POST',
            {
              id: token,
              service_id: field(f, 'line'),
              measured_on: field(f, 'date'),
              quantity: decimal(f, 'qty') ?? '0',
              paid: decimal(f, 'paid') ?? '0',
              note: field(f, 'note'),
            },
            'Apontamento registrado.',
          )
        ) {
          setToken(crypto.randomUUID())
          el.reset()
        }
      }}
    >
      <label>
        Serviço medido
        <select name="line" required>
          {eligible.map((l) => (
            <option key={l.id} value={l.id}>
              {l.stage} • {l.description} • {l.global_id ?? ''} ({l.executed}/{l.quantity} {l.unit})
            </option>
          ))}
        </select>
      </label>
      <label>
        Data do apontamento
        <input type="date" name="date" required defaultValue={localDate()} />
      </label>
      <Numeric name="qty" label="Quantidade executada neste apontamento" />
      <label>
        Pagamento efetivo (R$)
        <input name="paid" inputMode="decimal" pattern="[0-9]+([,.][0-9]{1,2})?" />
      </label>
      <label>
        Observação ou documento de campo
        <input name="note" maxLength={1000} />
      </label>
      <button className="bim-button" disabled={!eligible.length}>
        Registrar medição ou pagamento
      </button>
    </form>
  )
}
