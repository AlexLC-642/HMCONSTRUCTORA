import type { ComponentType, CSSProperties, ReactNode } from "react";
import { Activity, Info, TrendingDown, TrendingUp } from "lucide-react";
import { dashboardAccents, dashboardChartTheme, type DashboardAccent } from "./dashboard-chart-theme";
import { PremiumCountUp } from "./premium-count-up";

export type IconProps = {
  size?: number;
  style?: CSSProperties;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
};

type MetricCardProps = {
  title: string;
  value: number | string;
  format?: "integer" | "money" | "money-short" | "percent";
  detail: string;
  delta?: string;
  accent?: DashboardAccent;
  tone?: string;
  href?: string;
  icon: ComponentType<IconProps>;
};

type Segment = {
  label: string;
  value: number;
  color: string;
};

export type PortfolioRow = {
  id: string;
  code: string;
  name: string;
  real: number;
  planned: number;
  budget: number;
  spent: number;
  paid: number;
  balance: number;
  risk: string;
  href: string;
};

type LegacyChartRow = {
  label: string;
  values: Array<{ label: string; value: number; color: string }>;
};

type ProgressComparisonRow = {
  label: string;
  real: number;
  planned: number;
};

const chart = dashboardChartTheme.colors;

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

function moneyCompact(value: number) {
  if (Math.abs(value) >= 1_000_000) return `Q ${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `Q ${(value / 1_000).toFixed(0)}K`;
  return `Q ${value.toFixed(0)}`;
}

function percent(value: number) {
  return `${value.toFixed(1)}%`;
}

function pointsFromValues(values: number[], width: number, height: number, top = 10) {
  const max = Math.max(100, ...values);
  const usableHeight = height - top - 20;
  return values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y = top + usableHeight - (Math.max(0, value) / max) * usableHeight;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

function riskConfig(risk: string) {
  if (risk === "Riesgo") return { label: "Riesgo", color: chart.danger, soft: "rgba(239,68,68,0.12)" };
  if (risk === "Atencion") return { label: "Atencion", color: chart.warning, soft: "rgba(245,158,11,0.12)" };
  return { label: "En ritmo", color: chart.actual, soft: "rgba(16,185,129,0.12)" };
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <article className={`premium-panel dashboard-enter ${className}`}>
      {children}
    </article>
  );
}

export function MetricCard({ title, value, format = "integer", detail, delta, accent, tone, href, icon: Icon }: MetricCardProps) {
  if (tone && !accent) {
    const lightContent = (
      <>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">{title}</p>
            <p className="mt-4 text-3xl font-semibold tracking-tight text-[var(--foreground)] tabular-nums">
              {typeof value === "number" ? <PremiumCountUp format={format} value={value} /> : value}
            </p>
          </div>
          <span className="grid size-10 place-items-center rounded-lg text-white shadow-sm" style={{ backgroundColor: tone }}>
            <Icon aria-hidden="true" size={18} />
          </span>
        </div>
        <p className="mt-3 text-sm text-[var(--muted)]">{detail}</p>
        {delta ? <p className="mt-1 text-xs font-semibold text-[var(--success)]">{delta}</p> : null}
      </>
    );
    const lightClassName = "dashboard-kpi-card focus-ring p-4";

    if (href) return <a className={lightClassName} href={href}>{lightContent}</a>;
    return <article className={lightClassName}>{lightContent}</article>;
  }

  const accentConfig = accent ? dashboardAccents[accent] : {
    ...dashboardAccents.slate,
    color: tone ?? dashboardAccents.slate.color
  };
  const spark = "0,42 18,40 36,31 54,34 72,26 90,30 108,20 126,24 144,15 162,20 180,13";
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">{title}</p>
          <p className="mt-3 text-[2rem] font-semibold leading-none tracking-tight text-white tabular-nums">
            {typeof value === "number" ? <PremiumCountUp format={format} value={value} /> : value}
          </p>
        </div>
        <span className="grid size-10 place-items-center rounded-xl border border-white/10 bg-white/8 text-white shadow-lg" style={{ boxShadow: `0 14px 34px ${accentConfig.shadow}` }}>
          <Icon aria-hidden="true" size={19} />
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-300">{detail}</p>
        {delta ? <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] font-semibold text-slate-200">{delta}</span> : null}
      </div>
      <svg aria-hidden="true" className="mt-5 h-12 w-full overflow-visible" viewBox="0 0 180 52">
        <defs>
          <linearGradient id={`metric-${accent}`} x1="0" x2="1" y1="0" y2="0">
            <stop stopColor={accentConfig.color} stopOpacity="0.2" />
            <stop offset="1" stopColor={accentConfig.color} stopOpacity="0.96" />
          </linearGradient>
        </defs>
        <polyline fill="none" points={spark} stroke={`url(#metric-${accent})`} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
        <line stroke="rgba(203,213,225,0.13)" x1="0" x2="180" y1="46" y2="46" />
      </svg>
    </>
  );

  const className = "premium-kpi focus-ring";
  const style = {
    "--accent": accentConfig.color,
    "--accent-soft": accentConfig.soft,
    "--accent-shadow": accentConfig.shadow
  } as CSSProperties;

  if (href) {
    return <a className={className} href={href} style={style}>{content}</a>;
  }

  return <article className={className} style={style}>{content}</article>;
}

export function LightPortfolioSChart({ projects }: { projects: PortfolioRow[] }) {
  const projectCount = Math.max(1, projects.length);
  const realAverage = projects.reduce((sum, project) => sum + project.real, 0) / projectCount;
  const plannedAverage = projects.reduce((sum, project) => sum + project.planned, 0) / projectCount;
  const financialAverage = projects.reduce((sum, project) => sum + (project.budget === 0 ? 0 : (project.spent / project.budget) * 100), 0) / projectCount;
  const width = 820;
  const height = 310;
  const chartLeft = 54;
  const chartRight = 790;
  const chartTop = 34;
  const chartBottom = 262;
  const chartWidth = chartRight - chartLeft;
  const chartHeight = chartBottom - chartTop;
  const todayX = chartLeft + chartWidth * 0.7;

  function seriesToPoints(values: number[]) {
    return values.map((value, index) => {
      const x = chartLeft + (index / (values.length - 1)) * chartWidth;
      const y = chartBottom - (clamp(value) / 100) * chartHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
  }

  function buildCurve(target: number) {
    if (target <= 0) return [0, 0, 0, 0, 0, 0, 0];
    return [0, target * 0.08, target * 0.22, target * 0.45, target * 0.68, target * 0.86, target];
  }

  const realSeries = buildCurve(realAverage);
  const plannedSeries = buildCurve(plannedAverage);
  const financialSeries = buildCurve(financialAverage);
  const realPoints = seriesToPoints(realSeries);
  const plannedPoints = seriesToPoints(plannedSeries);
  const financialPoints = seriesToPoints(financialSeries);
  const breach = realAverage - plannedAverage;

  if (projects.length === 0) {
    return <div className="rounded-lg border border-dashed border-[var(--border)] bg-white p-8 text-center text-sm text-[var(--muted)]">Sin proyectos para consolidar.</div>;
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_16rem]">
      <svg aria-label="Curva S de portafolio" className="h-auto w-full" role="img" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="light-s-area" x1="0" x2="0" y1="0" y2="1">
            <stop stopColor="#10B981" stopOpacity="0.24" />
            <stop offset="1" stopColor="#10B981" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="light-s-real" x1="0" x2="1" y1="0" y2="0">
            <stop stopColor="#0F766E" />
            <stop offset="1" stopColor="#10B981" />
          </linearGradient>
          <linearGradient id="light-s-plan" x1="0" x2="1" y1="0" y2="0">
            <stop stopColor="#0284C7" />
            <stop offset="1" stopColor="#22D3EE" />
          </linearGradient>
        </defs>
        <rect fill="#ffffff" height={height} rx="12" width={width} />
        {[0, 25, 50, 75, 100].map((tick) => {
          const y = chartBottom - (tick / 100) * chartHeight;
          return (
            <g key={tick}>
              <line stroke="rgba(90,102,97,0.18)" x1={chartLeft} x2={chartRight} y1={y} y2={y} />
              <text fill="#5A6661" fontSize="12" x="8" y={y + 4}>{tick}%</text>
            </g>
          );
        })}
        <line stroke="rgba(245,158,11,0.62)" strokeDasharray="5 7" x1={todayX} x2={todayX} y1={chartTop} y2={chartBottom} />
        <text fill="#B76E00" fontSize="12" fontWeight="700" x={todayX + 10} y={chartTop + 16}>Hoy</text>
        <polygon fill="url(#light-s-area)" points={`${chartLeft},${chartBottom} ${realPoints} ${chartRight},${chartBottom}`} />
        <polyline className="dashboard-line-draw" fill="none" points={plannedPoints} stroke="url(#light-s-plan)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
        <polyline className="dashboard-line-draw dashboard-line-delay-1" fill="none" points={realPoints} stroke="url(#light-s-real)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
        <polyline className="dashboard-line-draw dashboard-line-delay-2" fill="none" points={financialPoints} stroke="#8B5CF6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
        <line stroke="rgba(90,102,97,0.24)" x1={chartLeft} x2={chartRight} y1={chartBottom} y2={chartBottom} />
      </svg>
      <div className="grid content-center gap-3">
        <KpiStripLight color="#10B981" label="Avance real" value={percent(realAverage)} />
        <KpiStripLight color="#0284C7" label="Planificado" value={percent(plannedAverage)} />
        <KpiStripLight color="#8B5CF6" label="Avance financiero" value={percent(financialAverage)} />
        <KpiStripLight color={breach < -5 ? "#EF4444" : "#10B981"} label="Brecha" value={`${breach >= 0 ? "+" : ""}${breach.toFixed(1)} pp`} />
      </div>
    </div>
  );
}

export function PortfolioSChart({ projects }: { projects: PortfolioRow[] }) {
  const projectCount = Math.max(1, projects.length);
  const realAverage = projects.reduce((sum, project) => sum + project.real, 0) / projectCount;
  const plannedAverage = projects.reduce((sum, project) => sum + project.planned, 0) / projectCount;
  const financialAverage = projects.reduce((sum, project) => sum + (project.budget === 0 ? 0 : (project.spent / project.budget) * 100), 0) / projectCount;
  const planSeries = [0, 8, 18, 31, 45, 58, 72, 86, Math.max(plannedAverage, 92)];
  const realSeries = [0, 5, 12, 20, Math.max(22, realAverage * 0.62), realAverage * 0.78, realAverage * 0.9, realAverage];
  const financeSeries = [0, 4, 10, 18, financialAverage * 0.55, financialAverage * 0.72, financialAverage * 0.88, financialAverage];
  const width = 760;
  const height = 280;
  const todayX = 520;

  if (projects.length === 0) {
    return <EmptyState text="Sin proyectos para consolidar." />;
  }

  return (
    <Panel className="xl:col-span-2">
      <PanelHeader actionHref="/projects" actionLabel="Proyectos" title="Curva S de portafolio" />
      <div className="grid gap-5 lg:grid-cols-[1fr_16rem]">
        <svg aria-label="Curva S del portafolio" className="h-auto w-full" role="img" viewBox={`0 0 ${width} ${height}`}>
          <defs>
            <linearGradient id="s-area" x1="0" x2="0" y1="0" y2="1">
              <stop stopColor={chart.actual} stopOpacity="0.28" />
              <stop offset="1" stopColor={chart.actual} stopOpacity="0" />
            </linearGradient>
            <filter id="line-glow">
              <feGaussianBlur result="blur" stdDeviation="3" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {[60, 120, 180, 240].map((y) => <line key={y} stroke={chart.grid} x1="44" x2="730" y1={y} y2={y} />)}
          {[0, 25, 50, 75, 100].map((tick, index) => <text fill={chart.muted} fontSize="11" key={tick} x="8" y={246 - index * 45}>{tick}%</text>)}
          <line stroke="rgba(245,158,11,0.55)" strokeDasharray="4 6" x1={todayX} x2={todayX} y1="24" y2="252" />
          <text fill={chart.warning} fontSize="11" fontWeight="700" x={todayX + 8} y="36">Hoy</text>
          <polygon fill="url(#s-area)" points={`44,246 ${pointsFromValues(realSeries, 680, 242, 22).split(" ").map((point) => {
            const [x, y] = point.split(",").map(Number);
            return `${x + 44},${y}`;
          }).join(" ")} 724,246`} />
          <polyline className="dashboard-line-draw" fill="none" filter="url(#line-glow)" points={pointsFromValues(planSeries, 680, 242, 22).split(" ").map((point) => {
            const [x, y] = point.split(",").map(Number);
            return `${x + 44},${y}`;
          }).join(" ")} stroke={chart.plan} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
          <polyline className="dashboard-line-draw dashboard-line-delay-1" fill="none" points={pointsFromValues(realSeries, 680, 242, 22).split(" ").map((point) => {
            const [x, y] = point.split(",").map(Number);
            return `${x + 44},${y}`;
          }).join(" ")} stroke={chart.actual} strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
          <polyline className="dashboard-line-draw dashboard-line-delay-2" fill="none" points={pointsFromValues(financeSeries, 680, 242, 22).split(" ").map((point) => {
            const [x, y] = point.split(",").map(Number);
            return `${x + 44},${y}`;
          }).join(" ")} stroke={chart.financial} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
        </svg>
        <div className="grid content-center gap-3">
          <KpiStrip color={chart.actual} label="Avance real" value={percent(realAverage)} />
          <KpiStrip color={chart.plan} label="Planificado" value={percent(plannedAverage)} />
          <KpiStrip color={chart.financial} label="Avance financiero" value={percent(financialAverage)} />
          <KpiStrip color={realAverage - plannedAverage < -5 ? chart.danger : chart.actual} label="Brecha" value={`${realAverage - plannedAverage >= 0 ? "+" : ""}${(realAverage - plannedAverage).toFixed(1)} pp`} />
        </div>
      </div>
    </Panel>
  );
}

export function PortfolioBulletChart({ projects }: { projects: PortfolioRow[] }) {
  const rows = projects.slice(0, 7);
  if (rows.length === 0) return <EmptyState text="Sin proyectos activos." />;

  return (
    <Panel>
      <PanelHeader actionHref="/projects" actionLabel="Cartera" title="Avance real vs plan" />
      <div className="space-y-3">
        {rows.map((project) => {
          const gap = project.real - project.planned;
          const status = gap < -8 ? "Atrasado" : gap < -3 ? "Atencion" : "En ritmo";
          const color = gap < -8 ? chart.danger : gap < -3 ? chart.warning : chart.actual;
          return (
            <a className="premium-row group" href={project.href} key={project.id}>
              <div className="min-w-0">
                <p className="font-semibold text-white">{project.code}</p>
                <p className="truncate text-xs text-slate-400">{project.name}</p>
              </div>
              <div className="space-y-2">
                <div className="relative h-3 rounded-full bg-white/8">
                  <span className="absolute inset-y-0 left-0 rounded-full" style={{ background: `linear-gradient(90deg, ${color}88, ${color})`, width: `${clamp(project.real)}%` }} />
                  <span className="absolute -top-1 h-5 w-0.5 bg-cyan-200 shadow-[0_0_16px_rgba(34,211,238,0.6)]" style={{ left: `${clamp(project.planned)}%` }} />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Real {percent(project.real)}</span>
                  <span>Plan {percent(project.planned)}</span>
                </div>
              </div>
              <span className="text-right text-sm font-semibold tabular-nums" style={{ color }}>{status}<br />{gap >= 0 ? "+" : ""}{gap.toFixed(1)} pp</span>
            </a>
          );
        })}
      </div>
    </Panel>
  );
}

export function FinanceBars({ projects }: { projects: PortfolioRow[] }) {
  const rows = projects.slice(0, 7);
  const max = Math.max(1, ...rows.flatMap((project) => [project.budget, project.spent, project.paid]));
  if (rows.length === 0) return <EmptyState text="Sin datos financieros." />;

  return (
    <Panel>
      <PanelHeader actionHref="/finances" actionLabel="Finanzas" title="Presupuesto vs ejecucion" />
      <div className="space-y-4">
        {rows.map((project) => (
          <a className="grid gap-3 rounded-xl border border-white/8 bg-white/[0.035] p-3 transition hover:border-cyan-300/30 hover:bg-white/[0.055] md:grid-cols-[8rem_1fr]" href={project.href} key={project.id}>
            <div className="min-w-0">
              <p className="font-semibold text-white">{project.code}</p>
              <p className="truncate text-xs text-slate-400">{project.name}</p>
            </div>
            <div className="grid gap-2">
              <FinanceBar color={chart.budget} label="Presupuesto" max={max} value={project.budget} />
              <FinanceBar color={chart.spent} label="Ejecutado" max={max} value={project.spent} />
              <FinanceBar color={chart.actual} label="Disponible" max={max} value={Math.max(0, project.budget - project.spent)} />
            </div>
          </a>
        ))}
      </div>
    </Panel>
  );
}

export function DonutChart({ segments, centerValue, centerLabel }: { segments: Segment[]; centerValue: string; centerLabel: string }) {
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="grid gap-5 md:grid-cols-[10rem_1fr] md:items-center">
      <svg aria-label={centerLabel} className="h-40 w-40 drop-shadow-[0_24px_34px_rgba(0,0,0,0.22)]" role="img" viewBox="0 0 120 120">
        <circle cx="60" cy="60" fill="none" r={radius} stroke="rgba(203,213,225,0.11)" strokeWidth="15" />
        {total > 0 ? segments.map((segment) => {
          const length = (Math.max(0, segment.value) / total) * circumference;
          const dashOffset = offset;
          offset += length;
          return (
            <circle
              className="dashboard-donut-draw"
              cx="60"
              cy="60"
              fill="none"
              key={segment.label}
              r={radius}
              stroke={segment.color}
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={-dashOffset}
              strokeLinecap="round"
              strokeWidth="15"
              transform="rotate(-90 60 60)"
            >
              <title>{`${segment.label}: ${segment.value}`}</title>
            </circle>
          );
        }) : null}
        <text fill={chart.text} fontSize="19" fontWeight="800" textAnchor="middle" x="60" y="58">{centerValue}</text>
        <text fill={chart.muted} fontSize="8" textAnchor="middle" x="60" y="72">{centerLabel}</text>
      </svg>
      <div className="space-y-2">
        {segments.map((segment) => (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.035] px-3 py-2 text-sm" key={segment.label}>
            <span className="flex min-w-0 items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-full shadow-[0_0_14px_currentColor]" style={{ backgroundColor: segment.color, color: segment.color }} />
              <span className="truncate text-slate-300">{segment.label}</span>
            </span>
            <span className="font-semibold text-white tabular-nums">{segment.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function GlobalProgressGauge({ value, planned }: { value: number; planned: number }) {
  const safeValue = clamp(value);
  const safePlan = clamp(planned);
  const radius = 58;
  const circumference = Math.PI * radius;
  const offset = circumference - (safeValue / 100) * circumference;
  const gap = value - planned;
  const color = gap < -5 ? chart.danger : gap < 0 ? chart.warning : chart.actual;

  return (
    <div className="grid justify-items-center gap-4">
      <svg aria-label="Avance global" className="h-40 w-64" role="img" viewBox="0 0 180 116">
        <defs>
          <linearGradient id="gauge-progress" x1="0" x2="1" y1="0" y2="0">
            <stop stopColor={color} stopOpacity="0.45" />
            <stop offset="1" stopColor={color} />
          </linearGradient>
        </defs>
        <path d="M32 92a58 58 0 0 1 116 0" fill="none" stroke="rgba(203,213,225,0.12)" strokeLinecap="round" strokeWidth="18" />
        <path className="dashboard-gauge-draw" d="M32 92a58 58 0 0 1 116 0" fill="none" stroke="url(#gauge-progress)" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" strokeWidth="18" />
        {planned > 0 ? <circle cx={32 + 116 * (safePlan / 100)} cy="92" fill={chart.plan} r="4"><title>{`Plan ${planned.toFixed(1)}%`}</title></circle> : null}
        <text fill={chart.text} fontSize="26" fontWeight="800" textAnchor="middle" x="90" y="76">{percent(value)}</text>
        <text fill={chart.muted} fontSize="10" textAnchor="middle" x="90" y="93">Portafolio</text>
      </svg>
      <div className="grid w-full grid-cols-2 gap-2 text-center text-sm">
        <div className="rounded-xl border border-white/8 bg-white/[0.035] px-3 py-2"><p className="font-semibold text-white">{percent(planned)}</p><p className="text-xs text-slate-400">Plan</p></div>
        <div className="rounded-xl border border-white/8 bg-white/[0.035] px-3 py-2"><p className="font-semibold text-white">{gap >= 0 ? "+" : ""}{gap.toFixed(1)} pp</p><p className="text-xs text-slate-400">Brecha</p></div>
      </div>
    </div>
  );
}

export function HealthMap({ projects }: { projects: PortfolioRow[] }) {
  const rows = projects.slice(0, 8);
  if (rows.length === 0) return <EmptyState text="Sin proyectos activos." />;

  return (
    <Panel className="xl:col-span-2">
      <PanelHeader actionHref="/projects" actionLabel="Ver proyectos" title="Mapa de salud de cartera" />
      <div className="grid gap-3">
        {rows.map((project) => {
          const risk = riskConfig(project.risk);
          const execution = project.budget === 0 ? 0 : (project.spent / project.budget) * 100;
          const coverage = project.spent === 0 ? 0 : (project.paid / project.spent) * 100;
          return (
            <a className="premium-health-row" href={project.href} key={project.id}>
              <div className="min-w-0">
                <p className="font-semibold text-white">{project.code}</p>
                <p className="truncate text-xs text-slate-400">{project.name}</p>
              </div>
              <MiniMeter color={chart.actual} label="Avance" value={project.real} />
              <MiniMeter color={chart.plan} label="Plan" value={project.planned} />
              <MiniMeter color={chart.spent} label="Ejecucion" value={execution} />
              <MiniMeter color={chart.paid} label="Cobertura" value={coverage} />
              <span className="inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold" style={{ backgroundColor: risk.soft, borderColor: `${risk.color}55`, color: risk.color }}>{risk.label}</span>
            </a>
          );
        })}
      </div>
    </Panel>
  );
}

export function RiskStatusPanel({ projects }: { projects: PortfolioRow[] }) {
  const groups = [
    { label: "En ritmo", value: projects.filter((project) => project.risk === "En ritmo").length, color: chart.actual, icon: TrendingUp },
    { label: "Atencion", value: projects.filter((project) => project.risk === "Atencion").length, color: chart.warning, icon: Info },
    { label: "Riesgo", value: projects.filter((project) => project.risk === "Riesgo").length, color: chart.danger, icon: TrendingDown }
  ];
  const total = Math.max(1, projects.length);

  return (
    <div className="space-y-4">
      <div className="h-4 overflow-hidden rounded-full bg-white/8">
        <div className="flex h-full">
          {groups.map((group) => <span key={group.label} style={{ backgroundColor: group.color, width: `${(group.value / total) * 100}%` }} />)}
        </div>
      </div>
      <div className="grid gap-2">
        {groups.map((group) => {
          const Icon = group.icon;
          return (
            <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.035] px-3 py-2" key={group.label}>
              <span className="flex items-center gap-2 text-sm text-slate-300"><Icon aria-hidden="true" size={16} style={{ color: group.color }} />{group.label}</span>
              <span className="font-semibold text-white tabular-nums">{group.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AlertsPanel({ alerts }: { alerts: Array<{ label: string; value: number; href: string; icon: ComponentType<IconProps>; tone: DashboardAccent }> }) {
  return (
    <Panel>
      <PanelHeader title="Alertas operativas" />
      <div className="grid gap-2">
        {alerts.map((alert) => {
          const Icon = alert.icon;
          const accent = dashboardAccents[alert.tone];
          return (
            <a className="focus-ring flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.035] px-3 py-3 transition hover:border-white/18 hover:bg-white/[0.06]" href={alert.href} key={alert.label}>
              <span className="flex items-center gap-2 text-sm text-slate-300"><Icon aria-hidden="true" size={16} style={{ color: accent.color }} />{alert.label}</span>
              <span className="font-semibold text-white tabular-nums">{alert.value}</span>
            </a>
          );
        })}
      </div>
    </Panel>
  );
}

export function ActivityDonutPanel({ segments, completedRatio }: { segments: Segment[]; completedRatio: number }) {
  return (
    <Panel>
      <PanelHeader title="Estado de actividades" />
      <DonutChart centerLabel="Completado" centerValue={percent(completedRatio)} segments={segments} />
    </Panel>
  );
}

export function GroupedBarChart({ rows, max }: { rows: LegacyChartRow[]; max: number }) {
  if (rows.length === 0) return <EmptyState text="Sin datos para graficar." />;

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <div className="grid gap-3 rounded-xl border border-black/5 bg-black/[0.025] p-3 md:grid-cols-[8rem_1fr]" key={row.label}>
          <p className="font-semibold text-slate-900">{row.label}</p>
          <div className="grid gap-2">
            {row.values.map((item) => (
              <FinanceBar color={item.color} key={item.label} label={item.label} max={max} value={item.value} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProgressComparisonChart({ rows }: { rows: ProgressComparisonRow[] }) {
  if (rows.length === 0) return <EmptyState text="Sin avance registrado." />;

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const gap = row.real - row.planned;
        const color = gap < -8 ? chart.danger : gap < -3 ? chart.warning : chart.actual;
        return (
          <div className="rounded-xl border border-black/5 bg-black/[0.025] p-3" key={row.label}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="font-semibold text-slate-900">{row.label}</p>
              <span className="text-sm font-semibold tabular-nums" style={{ color }}>{gap >= 0 ? "+" : ""}{gap.toFixed(1)} pp</span>
            </div>
            <div className="relative h-4 rounded-full bg-slate-200">
              <span className="absolute inset-y-0 left-0 rounded-full" style={{ background: `linear-gradient(90deg, ${color}88, ${color})`, width: `${clamp(row.real)}%` }} />
              <span className="absolute -top-1 h-6 w-0.5 bg-cyan-500" style={{ left: `${clamp(row.planned)}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-xs text-slate-500">
              <span>Real {percent(row.real)}</span>
              <span>Plan {percent(row.planned)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function StackedStatusBar({ segments }: { segments: Segment[] }) {
  const total = Math.max(1, segments.reduce((sum, segment) => sum + segment.value, 0));

  return (
    <div className="space-y-3">
      <div className="flex h-4 overflow-hidden rounded-full bg-slate-200">
        {segments.map((segment) => (
          <span key={segment.label} style={{ backgroundColor: segment.color, width: `${(segment.value / total) * 100}%` }} />
        ))}
      </div>
      <div className="grid gap-2">
        {segments.map((segment) => (
          <div className="flex items-center justify-between rounded-md border border-black/5 bg-black/[0.025] px-3 py-2 text-sm" key={segment.label}>
            <span className="flex items-center gap-2 text-slate-600"><span className="size-2 rounded-full" style={{ backgroundColor: segment.color }} />{segment.label}</span>
            <strong className="tabular-nums text-slate-900">{segment.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function FinanceBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr_4.5rem] items-center gap-3 text-xs">
      <span className="text-slate-400">{label}</span>
      <span className="h-2.5 overflow-hidden rounded-full bg-white/8">
        <span className="block h-full rounded-full transition-[width] duration-300" style={{ background: `linear-gradient(90deg, ${color}77, ${color})`, width: `${Math.min(100, (Math.abs(value) / max) * 100)}%` }} />
      </span>
      <span className="text-right font-semibold text-slate-100 tabular-nums">{moneyCompact(value)}</span>
    </div>
  );
}

function MiniMeter({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 flex justify-between gap-2 text-[11px] text-slate-400">
        <span>{label}</span>
        <span className="tabular-nums">{percent(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/8">
        <span className="block h-full rounded-full" style={{ backgroundColor: color, width: `${clamp(value)}%` }} />
      </div>
    </div>
  );
}

function KpiStrip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.035] p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm text-slate-300"><span className="size-2 rounded-full" style={{ backgroundColor: color }} />{label}</span>
        <strong className="text-white tabular-nums">{value}</strong>
      </div>
    </div>
  );
}

function KpiStripLight({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[#fbfbf8] p-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <span className="size-2.5 rounded-full shadow-[0_0_14px_currentColor]" style={{ backgroundColor: color, color }} />
          {label}
        </span>
        <strong className="text-[var(--foreground)] tabular-nums">{value}</strong>
      </div>
    </div>
  );
}

function PanelHeader({ title, actionHref, actionLabel }: { title: string; actionHref?: string; actionLabel?: string }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl border border-cyan-300/15 bg-cyan-300/10 text-cyan-200">
          <Activity aria-hidden="true" size={17} />
        </span>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
      </div>
      {actionHref && actionLabel ? <a className="focus-ring rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-300 transition hover:border-cyan-300/35 hover:text-white" href={actionHref}>{actionLabel}</a> : null}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-white/12 bg-white/[0.03] p-8 text-center text-sm text-slate-400">{text}</div>;
}
