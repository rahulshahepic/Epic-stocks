import { formatDate, formatCurrency } from '../../lib/compute'
import type { AppData } from '../../lib/types'

interface Props {
  data: AppData
}

interface TimelineItem {
  date: string
  label: string
  detail: string
  color: string
  icon: string
}

export function TimelineTab({ data }: Props) {
  const items: TimelineItem[] = []

  // Share events
  for (const e of data.shareEvents) {
    items.push({
      date: e.date,
      label: e.label,
      detail:
        e.vestedDelta > 0
          ? `+${e.vestedDelta.toFixed(2)} shares`
          : `${e.vestedDelta.toFixed(2)} shares`,
      color: e.vestedDelta > 0 ? '#4ade80' : '#f87171',
      icon: e.vestedDelta > 0 ? '📈' : '📉',
    })
  }

  // Future vesting dates from grants
  const today = new Date()
  for (const grant of data.grants) {
    const vestStart = new Date(grant.vestStart)
    for (let i = 0; i < grant.vestPeriods; i++) {
      const vestDate = new Date(vestStart)
      vestDate.setFullYear(vestStart.getFullYear() + i)
      if (vestDate > today) {
        items.push({
          date: vestDate.toISOString().split('T')[0]!,
          label: `${grant.year} ${grant.type} — vesting period ${i + 1}`,
          detail: `${(grant.shares / grant.vestPeriods).toFixed(2)} shares`,
          color: '#a78bfa',
          icon: '🔓',
        })
      }
    }
  }

  // Loan due dates
  for (const loan of data.baseLoans) {
    items.push({
      date: loan.due,
      label: `${loan.grantYear} ${loan.grantType} ${loan.loanType} loan due`,
      detail: formatCurrency(loan.amount),
      color: '#f59e0b',
      icon: '💰',
    })
  }

  // Refinance events
  for (const re of data.refinanceEvents) {
    items.push({
      date: re.date,
      label: `Refinance — ${re.replacesLoanIds.length} loan${re.replacesLoanIds.length !== 1 ? 's' : ''}`,
      detail: `New rate: ${(re.newRate * 100).toFixed(2)}%`,
      color: '#10b981',
      icon: '🔄',
    })
  }

  // Price history points
  for (const p of data.priceHistory) {
    items.push({
      date: p.date,
      label: 'Price update',
      detail: `$${p.price.toFixed(2)}/share`,
      color: '#60a5fa',
      icon: '🏷️',
    })
  }

  items.sort((a, b) => b.date.localeCompare(a.date)) // newest first

  const isPast = (date: string) => new Date(date) <= today
  const isToday = (date: string) => {
    const d = new Date(date)
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    )
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Timeline</h2>
      {items.length === 0 && (
        <p style={styles.empty}>No events yet. Add grants, loans, or share events.</p>
      )}
      <div style={styles.timeline}>
        {items.map((item, idx) => (
          <div
            key={`${item.date}-${idx}`}
            style={{
              ...styles.item,
              opacity: isPast(item.date) && !isToday(item.date) ? 0.65 : 1,
            }}
            title={`${item.label} — ${item.detail}`}
          >
            <div
              style={{
                ...styles.dot,
                background: item.color,
                boxShadow: isToday(item.date)
                  ? `0 0 0 4px ${item.color}44`
                  : 'none',
              }}
            >
              <span style={styles.icon}>{item.icon}</span>
            </div>
            <div style={styles.line} />
            <div style={styles.content}>
              <div style={styles.dateLabel}>
                {formatDate(item.date)}
                {isToday(item.date) && (
                  <span style={styles.todayBadge}>TODAY</span>
                )}
              </div>
              <div style={styles.eventLabel}>{item.label}</div>
              <div style={{ ...styles.detail, color: item.color }}>
                {item.detail}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '1rem', maxWidth: '700px', margin: '0 auto' },
  heading: { color: '#e2e8f0', margin: '0 0 1.5rem', fontSize: '1.2rem' },
  empty: { color: '#64748b', textAlign: 'center', padding: '2rem' },
  timeline: { display: 'flex', flexDirection: 'column', gap: 0 },
  item: {
    display: 'grid',
    gridTemplateColumns: '36px 20px 1fr',
    gap: '0 0.75rem',
    marginBottom: '0.25rem',
    position: 'relative',
  },
  dot: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    zIndex: 1,
  },
  icon: { fontSize: '1rem' },
  line: {
    width: '2px',
    background: '#1e3a5f',
    margin: '0 auto',
    minHeight: '40px',
    alignSelf: 'stretch',
  },
  content: {
    paddingBottom: '1.25rem',
    paddingTop: '0.1rem',
  },
  dateLabel: {
    color: '#64748b',
    fontSize: '0.78rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    marginBottom: '0.1rem',
  },
  todayBadge: {
    background: '#f59e0b22',
    color: '#f59e0b',
    borderRadius: '3px',
    padding: '0 0.3rem',
    fontSize: '0.7rem',
    fontWeight: 700,
  },
  eventLabel: {
    color: '#e2e8f0',
    fontSize: '0.9rem',
    fontWeight: 500,
    marginBottom: '0.1rem',
  },
  detail: {
    fontSize: '0.8rem',
    fontWeight: 600,
  },
}
