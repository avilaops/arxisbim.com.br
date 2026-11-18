import { Decimal } from 'decimal.js';
const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
export interface ObraSettings {
  name: string;
  area: string;
  start_date: string;
  months: number;
  bdi: string;
  scope: 'full' | 'labor' | 'material';
  revision: number;
}
export interface ObraLine {
  id: string;
  description: string;
  stage: string;
  unit: string;
  quantity: string | null;
  material: string | null;
  labor: string | null;
  equipment: string | null;
  combined: string | null;
  status: 'pending' | 'ready' | 'estimated';
  assumption: string;
  issue: string;
  evidence: string;
  activity_id: string | null;
  global_id: string | null;
  storey: string | null;
  version_id: string | null;
  document_id: string | null;
  page: number | null;
  revision: number;
}
export interface ObraActivity {
  id: string;
  name: string;
  start: string;
  end: string;
}
export interface ObraEntry {
  id: string;
  service_id: string;
  measured_on: string;
  quantity: string;
  paid: string;
  note: string;
}
export function effectiveRate(
  line: Pick<ObraLine, 'labor' | 'material' | 'equipment' | 'combined'>,
  scope: ObraSettings['scope'],
) {
  if (scope !== 'full') return line[scope] === null ? null : new D(line[scope]!);
  if (line.combined !== null) return new D(line.combined);
  if ([line.labor, line.material, line.equipment].some((v) => v === null)) return null;
  return new D(line.labor!).plus(line.material!).plus(line.equipment!);
}
const day = 86400000;
function distribute(
  start: string,
  end: string,
  total: Decimal,
  add: (month: string, value: Decimal) => void,
) {
  const first = Date.parse(start),
    last = Date.parse(end);
  const duration = last - first + day;
  let previous = new D(0);
  for (let cursor = first; cursor <= last;) {
    const date = new Date(cursor);
    const next = Math.min(last + day, Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
    const cumulative = total
      .times(next - first)
      .div(duration)
      .toDecimalPlaces(2);
    add(date.toISOString().slice(0, 7), cumulative.minus(previous));
    previous = cumulative;
    cursor = next;
  }
}

export function obraReport(
  settings: ObraSettings,
  lines: ObraLine[],
  activities: ObraActivity[],
  entries: ObraEntry[],
  version: string | null,
) {
  const asOf = new Date().toISOString().slice(0, 10);
  const observed = new Map<string, Decimal>();
  const schedule = new Map(activities.map((a) => [a.id, a]));
  const quantities = new Map<string, Decimal>();
  const months = new Map<string, { planned: Decimal; paid: Decimal }>();
  const stages = new Map<string, Map<string, Decimal>>();
  const monthFor = (key: string) => {
    const value = months.get(key) ?? { planned: new D(0), paid: new D(0) };
    months.set(key, value);
    return value;
  };
  const start = new Date(settings.start_date);
  for (let i = 0; i < settings.months; i++) {
    monthFor(
      new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1))
        .toISOString()
        .slice(0, 7),
    );
  }
  for (const entry of entries) {
    if (entry.measured_on <= asOf)
      observed.set(
        entry.service_id,
        (observed.get(entry.service_id) ?? new D(0)).plus(entry.quantity),
      );
    quantities.set(
      entry.service_id,
      (quantities.get(entry.service_id) ?? new D(0)).plus(entry.quantity),
    );
    const month = monthFor(entry.measured_on.slice(0, 7));
    month.paid = month.paid.plus(entry.paid);
  }
  let direct = new D(0),
    total = new D(0),
    unallocated = new D(0),
    estimated = new D(0);
  const multiplier = new D(settings.bdi).div(100).plus(1);
  const result = lines.map((line) => {
    const rate = effectiveRate(line, settings.scope);
    const stale = line.version_id !== null && line.version_id !== version;
    const reason = stale
      ? 'Elemento de outra versão IFC.'
      : line.quantity === null
        ? 'Quantidade ausente.'
        : rate === null
          ? 'Falta preço para o escopo selecionado.'
          : '';
    const status = reason ? 'pending' : line.status;
    const base = status === 'pending' ? null : rate!.times(line.quantity!).toDecimalPlaces(2);
    const amount = base?.times(multiplier).toDecimalPlaces(2) ?? null;
    if (amount !== null) {
      direct = direct.plus(base!);
      total = total.plus(amount);
      if (status === 'estimated') estimated = estimated.plus(amount);
      const activity = schedule.get(line.activity_id ?? '');
      if (activity)
        distribute(activity.start, activity.end, amount, (key, share) => {
          const month = monthFor(key);
          month.planned = month.planned.plus(share);
          const stage = stages.get(line.stage) ?? new Map<string, Decimal>();
          stage.set(key, (stage.get(key) ?? new D(0)).plus(share));
          stages.set(line.stage, stage);
        });
      else unallocated = unallocated.plus(amount);
    }
    const executed = quantities.get(line.id) ?? new D(0);
    const activity = schedule.get(line.activity_id ?? '');
    let plannedToDate: string | null = null;
    if (activity && line.quantity !== null && status !== 'pending') {
      const duration = Date.parse(activity.end) - Date.parse(activity.start) + day;
      const elapsed = Math.max(
        0,
        Math.min(duration, Date.parse(asOf) - Date.parse(activity.start) + day),
      );
      plannedToDate = new D(line.quantity)
        .times(elapsed)
        .div(duration)
        .toDecimalPlaces(4)
        .toString();
    }
    return {
      ...line,
      status,
      issue: [reason,line.issue].filter(Boolean).join(' '),
      direct: base?.toFixed(2) ?? null,
      total: amount?.toFixed(2) ?? null,
      executed: executed.toString(),
      observed: (observed.get(line.id) ?? new D(0)).toString(),
      plannedToDate,
      remaining: line.quantity === null ? null : new D(line.quantity).minus(executed).toString(),
    };
  });
  let planned = new D(0),
    paid = new D(0);
  const periods = [...months]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, value]) => {
      planned = planned.plus(value.planned);
      paid = paid.plus(value.paid);
      return {
        month,
        planned: value.planned.toFixed(2),
        paid: value.paid.toFixed(2),
        cumulative: planned.toFixed(2),
        cumulativePaid: paid.toFixed(2),
      };
    });
  return {
    asOf,
    lines: result,
    periods,
    stages: [...stages].map(([stage, values]) => ({
      stage,
      months: Object.fromEntries([...values].map(([k, v]) => [k, v.toFixed(2)])),
    })),
    direct: direct.toFixed(2),
    bdi: total.minus(direct).toFixed(2),
    total: total.toFixed(2),
    estimated: estimated.toFixed(2),
    unallocated: unallocated.toFixed(2),
    paid: paid.toFixed(2),
    perM2: total.div(settings.area).toFixed(2),
  };
}
