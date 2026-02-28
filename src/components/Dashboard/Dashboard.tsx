import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  computeAllLoans,
  computePortfolioSummary,
  buildLoanChartData,
  buildVestingChartData,
  formatCurrency,
  formatPercent,
} from '../../lib/compute'
import type { AppData } from '../../lib/types'

interface Props {
  data: AppData
}

export function Dashboard({ data }: Props) {
  const loans = computeAllLoans(data)
  const summary = computePortfolioSummary(data, loans)
  const loanChartData = buildLoanChartData(loans)
  const vestingChartData = buildVestingChartData(data.grants)

  const priceHistory = [...data.priceHistory]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((p) => ({ date: p.date.slice(0, 7), price: p.price }))

  return (
    <div style={styles.container}>
      {/* Summary cards */}
      <div style={styles.cardGrid}>
        <MetricCard
          label="Portfolio Value"
          value={formatCurrency(summary.portfolioValue)}
          sub={`${summary.currentShares.toFixed(1)} shares @ ${formatCurrency(data.currentPrice)}`}
          accent="#4ade80"
        />
        <MetricCard
          label="Total Loans"
          value={formatCurrency(summary.totalLoanBalance)}
          sub={`Accrued interest: ${formatCurrency(summary.totalAccruedInterest)}`}
          accent="#f87171"
        />
        <MetricCard
          label="Net Value"
          value={formatCurrency(summary.netValue)}
          sub={summary.netValue >= 0 ? 'Positive equity' : 'Underwater'}
          accent={summary.netValue >= 0 ? '#60a5fa' : '#fb923c'}
        />
        <MetricCard
          label="Vested Shares"
          value={summary.vestedShares.toFixed(1)}
          sub={`${summary.unvestedShares.toFixed(1)} unvested`}
          accent="#a78bfa"
        />
      </div>

      {/* Price history */}
      {priceHistory.length > 1 && (
        <ChartSection title="Share Price History">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={priceHistory}>
              <defs>
                <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis
                stroke="#64748b"
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) => `$${v.toFixed(2)}`}
              />
              <Tooltip
                formatter={(v: number) => [`$${v.toFixed(2)}`, 'Price']}
                contentStyle={tooltipStyle}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#60a5fa"
                fill="url(#priceGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartSection>
      )}

      {/* Loan breakdown */}
      {loanChartData.length > 0 && (
        <ChartSection title="Loan Breakdown by Grant">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={loanChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
              <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
              <YAxis
                stroke="#64748b"
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(v: number) => [formatCurrency(v)]}
                contentStyle={tooltipStyle}
              />
              <Legend />
              <Bar dataKey="balance" name="Principal" stackId="a" fill="#60a5fa" />
              <Bar dataKey="interest" name="Interest" stackId="a" fill="#f87171" />
            </BarChart>
          </ResponsiveContainer>
        </ChartSection>
      )}

      {/* Vesting timeline */}
      {vestingChartData.length > 0 && (
        <ChartSection title="Vesting Schedule">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={vestingChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
              <XAxis dataKey="year" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Bar
                dataKey="vestedShares"
                name="Vested"
                stackId="v"
                fill="#4ade80"
              />
              <Bar
                dataKey="unvestedShares"
                name="Unvested"
                stackId="v"
                fill="#a78bfa"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartSection>
      )}

      <p style={styles.asOf}>
        Prices as of {data.asOfDate} · {data.currentPrice > 0 ? formatPercent(0) : '—'}
        {' '}current: {formatCurrency(data.currentPrice)}/share
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MetricCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub: string
  accent: string
}) {
  return (
    <div style={{ ...styles.card, borderTop: `3px solid ${accent}` }}>
      <div style={styles.cardLabel}>{label}</div>
      <div style={{ ...styles.cardValue, color: accent }}>{value}</div>
      <div style={styles.cardSub}>{sub}</div>
    </div>
  )
}

function ChartSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div style={styles.chartSection}>
      <h3 style={styles.chartTitle}>{title}</h3>
      {children}
    </div>
  )
}

const tooltipStyle: React.CSSProperties = {
  background: '#0f3460',
  border: '1px solid #1e3a5f',
  borderRadius: '6px',
  color: '#e2e8f0',
  fontSize: '0.85rem',
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '1rem', maxWidth: '900px', margin: '0 auto' },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '0.75rem',
    marginBottom: '1.5rem',
  },
  card: {
    background: '#0f3460',
    borderRadius: '10px',
    padding: '1rem',
  },
  cardLabel: {
    color: '#94a3b8',
    fontSize: '0.8rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.25rem',
  },
  cardValue: {
    fontSize: '1.5rem',
    fontWeight: 700,
    marginBottom: '0.25rem',
  },
  cardSub: {
    color: '#64748b',
    fontSize: '0.8rem',
  },
  chartSection: {
    background: '#0f3460',
    borderRadius: '10px',
    padding: '1rem',
    marginBottom: '1rem',
  },
  chartTitle: {
    color: '#e2e8f0',
    fontSize: '0.95rem',
    fontWeight: 600,
    margin: '0 0 0.75rem',
  },
  asOf: {
    color: '#475569',
    fontSize: '0.75rem',
    textAlign: 'center',
    marginTop: '0.5rem',
  },
}
