import React, { useEffect, useState } from 'react';
import { ProjectsService, Project } from '../../api/v1/services/projects.service';

const svc = new ProjectsService();

function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 120)      return 'agora';
  if (s < 3600)     return `${Math.floor(s / 60)} min atrás`;
  if (s < 86400)    return `${Math.floor(s / 3600)}h atrás`;
  if (s < 604800)   return `${Math.floor(s / 86400)}d atrás`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

/* ── tiny sparkline ──────────────────────────────────────────────────────── */
function Sparkline({ values, color = '#3b82f6' }: { values: number[]; color?: string }) {
  const w = 80, h = 28, pad = 2;
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const step = (w - pad * 2) / (values.length - 1);
  const pts = values.map((v, i) => {
    const x = pad + i * step;
    const y = pad + (1 - (v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round" opacity="0.8" />
    </svg>
  );
}

/* ── analytics card ─────────────────────────────────────────────────────── */
function ACard({
  ico, icoClass, title, metrics,
}: {
  ico: string;
  icoClass: string;
  title: string;
  metrics: { val: string; label: string; badge?: string; badgeType?: 'up' | 'down' | 'neu'; spark?: number[] }[];
}) {
  return (
    <div className="a-card">
      <div className="a-card__header">
        <div className="a-card__title">
          <div className={`a-card__ico ${icoClass}`}>{ico}</div>
          {title}
        </div>
      </div>
      <div className="a-card__body">
        {metrics.map((m, i) => (
          <div className="a-metric" key={i}>
            <div className="a-metric__val">
              {m.val}
              {m.badge && (
                <span className={`a-metric__badge ${m.badgeType ?? 'neu'}`}>
                  {m.badge}
                </span>
              )}
            </div>
            <div className="a-metric__label">{m.label}</div>
            {m.spark && (
              <div className="sparkline">
                <Sparkline values={m.spark} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── skeleton row ───────────────────────────────────────────────────────── */
function SkRow() {
  return (
    <div className="lc__row" style={{ cursor: 'default' }}>
      <div className="sk" style={{ width: 28, height: 28, borderRadius: 4, flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div className="sk" style={{ height: 11, width: '55%' }} />
        <div className="sk" style={{ height: 10, width: '35%' }} />
      </div>
    </div>
  );
}

/* ── projects list card ─────────────────────────────────────────────────── */
function ProjectsCard({ projects, loading }: { projects: Project[]; loading: boolean }) {
  const list = projects.filter(p => p.status !== 'deleted').slice(0, 7);
  return (
    <div className="lc">
      <div className="lc__head">
        <div className="lc__head-left">
          <span className="lc__title">Projetos</span>
          <span className="lc__badge">{list.length}</span>
        </div>
        <a className="lc__action" href="/app">+ Novo</a>
      </div>
      {loading
        ? [1, 2, 3, 4].map(i => <SkRow key={i} />)
        : list.length === 0
          ? <div className="lc__empty"><span className="lc__empty-ico">📁</span>Nenhum projeto</div>
          : list.map(p => (
            <div key={p.id} className="lc__row"
              onClick={() => { localStorage.setItem('arxisvr_project_id', p.id); location.href = `/app?projectId=${p.id}`; }}>
              <div className="lc__row-ico">🏗️</div>
              <div className="lc__row-body">
                <div className="lc__row-name">{p.name}</div>
                <div className="lc__row-meta">{p.description || 'Projeto BIM'}</div>
              </div>
              <div className="lc__row-end" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div className={`lc__dot ${p.status === 'active' ? 'green' : 'grey'}`} />
                <span className="lc__row-time">{ago(p.updatedAt)}</span>
              </div>
            </div>
          ))
      }
    </div>
  );
}

/* ── models card ────────────────────────────────────────────────────────── */
function ModelsCard({ projects, loading }: { projects: Project[]; loading: boolean }) {
  const list = projects.slice(0, 5);
  return (
    <div className="lc">
      <div className="lc__head">
        <div className="lc__head-left">
          <span className="lc__title">Modelos IFC</span>
          <span className="lc__badge">{list.length}</span>
        </div>
        <a className="lc__action" href="/app?action=upload">+ Importar</a>
      </div>
      {loading
        ? [1, 2, 3].map(i => <SkRow key={i} />)
        : list.length === 0
          ? <div className="lc__empty"><span className="lc__empty-ico">📦</span>Nenhum modelo</div>
          : list.map((p, i) => (
            <div key={p.id} className="lc__row"
              onClick={() => { localStorage.setItem('arxisvr_project_id', p.id); location.href = `/app?projectId=${p.id}`; }}>
              <div className="lc__row-ico">📦</div>
              <div className="lc__row-body">
                <div className="lc__row-name">{p.name}.ifc</div>
                <div className="lc__row-meta">{p.description || 'Modelo BIM'}</div>
              </div>
              <div className="lc__row-end">
                <span className="lc__row-time">{ago(p.updatedAt)}</span>
              </div>
            </div>
          ))
      }
    </div>
  );
}

/* ── collaboration card ─────────────────────────────────────────────────── */
function CollabCard() {
  const stats = [
    { key: 'Sessões XR ativas',     val: '0' },
    { key: 'Colaboradores',          val: '1' },
    { key: 'Aplicativos conectados', val: '0' },
    { key: 'Convites pendentes',     val: '0' },
  ];
  return (
    <div className="lc">
      <div className="lc__head">
        <div className="lc__head-left">
          <span className="lc__title">Colaboração</span>
        </div>
        <a className="lc__action" href="/app#meetings">+ Convidar</a>
      </div>
      <div className="lc__stat">
        {stats.map((s, i) => (
          <div key={i} className="lc__stat-row">
            <span className="lc__stat-key">
              <div className={`lc__dot ${i === 1 ? 'blue' : 'grey'}`} />
              {s.key}
            </span>
            <span className="lc__stat-val">{s.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── activity log ───────────────────────────────────────────────────────── */
function ActivityCard({ projects }: { projects: Project[] }) {
  const rows = projects.slice(0, 5).map(p => ({
    action: 'Projeto atualizado',
    who: p.name,
    time: ago(p.updatedAt),
  }));
  return (
    <div className="lc">
      <div className="lc__head">
        <div className="lc__head-left">
          <span className="lc__title">Logs de atividade</span>
        </div>
        <div style={{ display: 'flex', gap: 0 }}>
          {['Todos', 'Painel', 'API'].map((t, i) => (
            <span key={i} style={{
              padding: '3px 9px', fontSize: 11, cursor: 'pointer',
              color: i === 0 ? 'var(--c-text)' : 'var(--c-text3)',
              borderBottom: i === 0 ? '2px solid var(--c-blue)' : '2px solid transparent',
            }}>{t}</span>
          ))}
        </div>
      </div>
      {rows.length === 0
        ? <div className="lc__empty"><span className="lc__empty-ico">📋</span>Sem atividade</div>
        : rows.map((r, i) => (
          <div key={i} className="log-row">
            <span className="log-row__action">{r.action}</span>
            <span className="log-row__who">{r.who}</span>
            <span className="log-row__time">{r.time}</span>
          </div>
        ))
      }
    </div>
  );
}

/* ── next steps ─────────────────────────────────────────────────────────── */
const STEPS = [
  { ico: '📂', text: 'Importe seu primeiro modelo IFC para começar', href: '/app?action=upload' },
  { ico: '👥', text: 'Convide colaboradores para o workspace', href: '/app#collab' },
  { ico: '📅', text: 'Configure o cronograma 4D do projeto', href: '/app#bim4d' },
  { ico: '🥽', text: 'Habilite reuniões XR para revisões imersivas', href: '/app#meetings' },
];

function NextStepsCard() {
  return (
    <div className="lc">
      <div className="lc__head">
        <div className="lc__head-left">
          <span className="lc__title">Próximos passos</span>
        </div>
      </div>
      {STEPS.map((s, i) => (
        <a key={i} className="ns-row" href={s.href}>
          <div className="ns-row__ico">{s.ico}</div>
          <div className="ns-row__text">{s.text} →</div>
        </a>
      ))}
    </div>
  );
}

/* ── root ────────────────────────────────────────────────────────────────── */
export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tenant,  setTenant]    = useState('Minha Conta');

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('arxisvr_user') || 'null');
      if (u?.tenantName) setTenant(u.tenantName);
      else if (u?.name)  setTenant(u.name);
    } catch { /* ignora: falha aqui não impede o fluxo */ }
  }, []);

  useEffect(() => {
    svc.list()
      .then(res => {
        const list = Array.isArray(res) ? res : (res as any)?.data ?? (res as any)?.items ?? [];
        setProjects(list);
      })
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  const active   = projects.filter(p => p.status === 'active').length;
  const archived = projects.filter(p => p.status === 'archived').length;
  const total    = projects.filter(p => p.status !== 'deleted').length;

  /* fake sparklines — replace with real data later */
  const spark1 = [2,3,2,5,4,6,5,8,7,9,8,10];
  const spark2 = [10,8,9,7,8,6,7,5,6,4,5,3];
  const spark3 = [0,1,0,2,1,3,2,4,3,5,4,6];

  return (
    <>
      {/* ── page header ── */}
      <div className="ph">
        <div>
          <div className="ph__eyebrow">Página inicial da conta</div>
          <div className="ph__title">{tenant}</div>
        </div>
        <div className="ph__actions">
          <button type="button" className="btn">
            📅 Últimas 24 horas
          </button>
          <a className="btn btn--primary" href="/app?action=upload">
            + Importar IFC
          </a>
        </div>
      </div>

      {/* ── analytics ── */}
      <div>
        <div className="sec-row sec-row--mb">
          <span className="sec-title">Análise de dados</span>
        </div>
        <div className="analytics-grid">
          <ACard ico="🔒" icoClass="blue" title="Segurança" metrics={[
            { val: String(total),    label: 'Projetos protegidos', badge: '0 alertas', badgeType: 'neu', spark: spark1 },
            { val: '0',             label: 'Acessos bloqueados', spark: spark2 },
          ]} />
          <ACard ico="⚡" icoClass="green" title="Performance" metrics={[
            { val: loading ? '—' : `${active}`, label: 'Projetos ativos',   badge: total ? '+' + total : '—', badgeType: 'up', spark: spark3 },
            { val: '60fps',        label: 'FPS médio no viewer', spark: spark1 },
          ]} />
          <ACard ico="📊" icoClass="purple" title="Atividade" metrics={[
            { val: String(total),  label: 'Modelos carregados', badge: archived ? `${archived} arq.` : '—', badgeType: 'neu', spark: spark2 },
            { val: '0',            label: 'Sessões XR hoje', spark: spark3 },
          ]} />
        </div>
      </div>

      {/* ── data grid ── */}
      <div className="data-grid">
        <ProjectsCard projects={projects} loading={loading} />
        <ModelsCard   projects={projects} loading={loading} />
        <CollabCard />
      </div>

      {/* ── log grid ── */}
      <div className="log-grid">
        <ActivityCard  projects={projects} />
        <NextStepsCard />
      </div>
    </>
  );
}
