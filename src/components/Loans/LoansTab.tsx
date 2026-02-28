import { useState } from 'react'
import {
  computeAllLoans,
  formatCurrency,
  formatDate,
  formatPercent,
} from '../../lib/compute'
import type { AppData, BaseLoan, GrantType, LoanType, RefinanceEvent } from '../../lib/types'

interface Props {
  data: AppData
  onUpdate: (updater: (prev: AppData) => AppData) => void
}

const GRANT_TYPES: GrantType[] = [
  'Purchase',
  'Catch-Up Purchase',
  'Bonus',
  'Catch-Up Bonus',
]
const LOAN_TYPES: LoanType[] = ['Purchase', 'Tax']

type LoanForm = Omit<BaseLoan, 'id'>
type RefinanceForm = Omit<RefinanceEvent, 'id'>

const DEFAULT_LOAN: LoanForm = {
  grantId: '',
  grantYear: new Date().getFullYear(),
  grantType: 'Purchase',
  loanType: 'Purchase',
  amount: 0,
  rate: 0,
  due: '',
}

const DEFAULT_REFINANCE: RefinanceForm = {
  date: '',
  replacesLoanIds: [],
  newRate: 0,
  newDue: '',
}

export function LoansTab({ data, onUpdate }: Props) {
  const [activeSection, setActiveSection] = useState<
    'loans' | 'add-loan' | 'add-refinance'
  >('loans')
  const [loanForm, setLoanForm] = useState<LoanForm>(DEFAULT_LOAN)
  const [refForm, setRefForm] = useState<RefinanceForm>(DEFAULT_REFINANCE)
  const [showSuperseded, setShowSuperseded] = useState(false)

  const allComputed = computeAllLoans(data)
  const active = allComputed.filter((l) => !l.superseded)
  const superseded = allComputed.filter((l) => l.superseded)
  const displayLoans = showSuperseded ? allComputed : active

  const totalBalance = active.reduce((s, l) => s + l.amount, 0)

  function handleAddLoan(e: React.FormEvent) {
    e.preventDefault()
    const grant = data.grants.find(
      (g) => g.year === loanForm.grantYear && g.type === loanForm.grantType,
    )
    onUpdate((prev) => ({
      ...prev,
      baseLoans: [
        ...prev.baseLoans,
        { ...loanForm, id: `loan-${Date.now()}`, grantId: grant?.id ?? loanForm.grantId },
      ],
    }))
    setLoanForm(DEFAULT_LOAN)
    setActiveSection('loans')
  }

  function handleAddRefinance(e: React.FormEvent) {
    e.preventDefault()
    onUpdate((prev) => ({
      ...prev,
      refinanceEvents: [
        ...prev.refinanceEvents,
        { ...refForm, id: `ref-${Date.now()}` },
      ],
    }))
    setRefForm(DEFAULT_REFINANCE)
    setActiveSection('loans')
  }

  const kindBadge = (kind: string) => {
    const colors: Record<string, string> = {
      base: '#3b82f6',
      interest: '#f59e0b',
      'refinance-replacement': '#10b981',
    }
    const labels: Record<string, string> = {
      base: 'Principal',
      interest: 'Interest',
      'refinance-replacement': 'Refinanced',
    }
    const c = colors[kind] ?? '#64748b'
    return (
      <span
        style={{
          background: c + '22',
          color: c,
          borderRadius: '4px',
          padding: '0.1rem 0.4rem',
          fontSize: '0.75rem',
          fontWeight: 600,
        }}
      >
        {labels[kind] ?? kind}
      </span>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.heading}>Loans</h2>
          <p style={styles.totalLabel}>
            Active balance: <strong style={{ color: '#f87171' }}>{formatCurrency(totalBalance)}</strong>
          </p>
        </div>
        <div style={styles.headerActions}>
          <button
            style={styles.addBtn}
            onClick={() => setActiveSection('add-loan')}
            data-testid="add-loan-btn"
          >
            + Add Loan
          </button>
          <button
            style={{ ...styles.addBtn, background: '#10b981' }}
            onClick={() => setActiveSection('add-refinance')}
            data-testid="add-refinance-btn"
          >
            + Refinance
          </button>
        </div>
      </div>

      {/* Add Loan Form */}
      {activeSection === 'add-loan' && (
        <form onSubmit={handleAddLoan} style={styles.form}>
          <h3 style={styles.formTitle}>Add Base Loan</h3>
          <p style={styles.formNote}>
            Enter principal and tax loans only. Interest loans are computed
            automatically from your rate history.
          </p>
          <div style={styles.formGrid}>
            <FormField label="Grant Year">
              <input
                type="number"
                value={loanForm.grantYear}
                onChange={(e) => setLoanForm({ ...loanForm, grantYear: +e.target.value })}
                required
                style={styles.input}
              />
            </FormField>
            <FormField label="Grant Type">
              <select
                value={loanForm.grantType}
                onChange={(e) =>
                  setLoanForm({ ...loanForm, grantType: e.target.value as GrantType })
                }
                style={styles.input}
              >
                {GRANT_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Loan Type">
              <select
                value={loanForm.loanType}
                onChange={(e) =>
                  setLoanForm({ ...loanForm, loanType: e.target.value as LoanType })
                }
                style={styles.input}
              >
                {LOAN_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Amount ($)">
              <input
                type="number"
                value={loanForm.amount}
                step="0.01"
                min={0}
                onChange={(e) => setLoanForm({ ...loanForm, amount: +e.target.value })}
                required
                style={styles.input}
              />
            </FormField>
            <FormField label="Rate (e.g. 0.037)">
              <input
                type="number"
                value={loanForm.rate}
                step="0.0001"
                min={0}
                max={1}
                onChange={(e) => setLoanForm({ ...loanForm, rate: +e.target.value })}
                required
                style={styles.input}
              />
            </FormField>
            <FormField label="Due Date">
              <input
                type="date"
                value={loanForm.due}
                onChange={(e) => setLoanForm({ ...loanForm, due: e.target.value })}
                required
                style={styles.input}
              />
            </FormField>
          </div>
          <div style={styles.formActions}>
            <button type="submit" style={styles.saveBtn}>Add Loan</button>
            <button type="button" style={styles.cancelBtn} onClick={() => setActiveSection('loans')}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Add Refinance Form */}
      {activeSection === 'add-refinance' && (
        <form onSubmit={handleAddRefinance} style={styles.form}>
          <h3 style={styles.formTitle}>Add Refinance Event</h3>
          <p style={styles.formNote}>
            Select which base loans are being refinanced, then provide the new
            terms. The old loans will be marked as superseded.
          </p>
          <div style={styles.formGrid}>
            <FormField label="Date">
              <input
                type="date"
                value={refForm.date}
                onChange={(e) => setRefForm({ ...refForm, date: e.target.value })}
                required
                style={styles.input}
              />
            </FormField>
            <FormField label="New Rate (e.g. 0.037)">
              <input
                type="number"
                value={refForm.newRate}
                step="0.0001"
                min={0}
                max={1}
                onChange={(e) => setRefForm({ ...refForm, newRate: +e.target.value })}
                required
                style={styles.input}
              />
            </FormField>
            <FormField label="New Due Date">
              <input
                type="date"
                value={refForm.newDue}
                onChange={(e) => setRefForm({ ...refForm, newDue: e.target.value })}
                required
                style={styles.input}
              />
            </FormField>
          </div>
          <FormField label="Loans being refinanced (check all that apply)">
            <div style={styles.checkList}>
              {data.baseLoans.map((bl) => (
                <label key={bl.id} style={styles.checkRow}>
                  <input
                    type="checkbox"
                    checked={refForm.replacesLoanIds.includes(bl.id)}
                    onChange={(e) => {
                      const ids = e.target.checked
                        ? [...refForm.replacesLoanIds, bl.id]
                        : refForm.replacesLoanIds.filter((id) => id !== bl.id)
                      setRefForm({ ...refForm, replacesLoanIds: ids })
                    }}
                  />
                  <span style={{ color: '#e2e8f0', fontSize: '0.85rem' }}>
                    {bl.grantYear} {bl.grantType} {bl.loanType} — {formatCurrency(bl.amount)}
                  </span>
                </label>
              ))}
            </div>
          </FormField>
          <div style={styles.formActions}>
            <button type="submit" style={{ ...styles.saveBtn, background: '#10b981' }}>
              Add Refinance
            </button>
            <button type="button" style={styles.cancelBtn} onClick={() => setActiveSection('loans')}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Loan table */}
      <div style={styles.tableControls}>
        <label style={styles.toggleLabel}>
          <input
            type="checkbox"
            checked={showSuperseded}
            onChange={(e) => setShowSuperseded(e.target.checked)}
          />
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
            Show superseded loans ({superseded.length})
          </span>
        </label>
      </div>

      <div style={styles.tableWrap} data-testid="loans-table">
        <table style={styles.table}>
          <thead>
            <tr>
              {['Grant', 'Type', 'Kind', 'Year', 'Amount', 'Rate', 'Due', ''].map(
                (h) => (
                  <th key={h} style={styles.th}>
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {displayLoans.map((loan) => (
              <tr
                key={loan.id}
                style={{
                  ...styles.tr,
                  opacity: loan.superseded ? 0.4 : 1,
                }}
              >
                <td style={styles.td}>{loan.grantYear} {loan.grantType}</td>
                <td style={styles.td}>{loan.loanType}</td>
                <td style={styles.td}>{kindBadge(loan.kind)}</td>
                <td style={styles.td}>{loan.originYear}</td>
                <td style={styles.td}>{formatCurrency(loan.amount)}</td>
                <td style={styles.td}>{formatPercent(loan.rate)}</td>
                <td style={styles.td}>{formatDate(loan.due)}</td>
                <td style={styles.td}>
                  {loan.superseded && (
                    <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                      Superseded
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Refinance history */}
      {data.refinanceEvents.length > 0 && (
        <details style={styles.details}>
          <summary style={styles.summary}>
            Refinance History ({data.refinanceEvents.length})
          </summary>
          <div style={styles.refList}>
            {[...data.refinanceEvents]
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((re) => (
                <div key={re.id} style={styles.refItem}>
                  <strong style={{ color: '#10b981' }}>
                    {formatDate(re.date)}
                  </strong>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                    {' '}— New rate {formatPercent(re.newRate)}, due{' '}
                    {formatDate(re.newDue)}. Replaced{' '}
                    {re.replacesLoanIds.length} loan
                    {re.replacesLoanIds.length !== 1 ? 's' : ''}.
                  </span>
                </div>
              ))}
          </div>
        </details>
      )}
    </div>
  )
}

function FormField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{label}</span>
      {children}
    </label>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '1rem', maxWidth: '900px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' },
  heading: { color: '#e2e8f0', margin: '0 0 0.25rem', fontSize: '1.2rem' },
  totalLabel: { color: '#94a3b8', margin: 0, fontSize: '0.875rem' },
  headerActions: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },
  addBtn: { background: '#4285f4', color: 'white', border: 'none', borderRadius: '6px', padding: '0.4rem 0.9rem', cursor: 'pointer', fontSize: '0.875rem' },
  form: { background: '#0f3460', borderRadius: '10px', padding: '1.25rem', marginBottom: '1rem' },
  formTitle: { color: '#e2e8f0', margin: '0 0 0.25rem', fontSize: '1rem' },
  formNote: { color: '#64748b', fontSize: '0.8rem', margin: '0 0 1rem' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1rem' },
  input: { background: '#1e3a5f', border: '1px solid #2d5282', color: '#e2e8f0', borderRadius: '6px', padding: '0.4rem 0.6rem', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' },
  formActions: { display: 'flex', gap: '0.5rem' },
  saveBtn: { background: '#4285f4', color: 'white', border: 'none', borderRadius: '6px', padding: '0.5rem 1.2rem', cursor: 'pointer', fontWeight: 600 },
  cancelBtn: { background: 'transparent', color: '#94a3b8', border: '1px solid #2d5282', borderRadius: '6px', padding: '0.5rem 1rem', cursor: 'pointer' },
  tableControls: { display: 'flex', marginBottom: '0.5rem' },
  toggleLabel: { display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' },
  th: { color: '#64748b', fontWeight: 600, textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: '1px solid #1e3a5f', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #0d2846' },
  td: { color: '#e2e8f0', padding: '0.5rem 0.75rem', verticalAlign: 'middle' },
  details: { marginTop: '1rem', background: '#0f3460', borderRadius: '8px', padding: '0.75rem 1rem' },
  summary: { color: '#94a3b8', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600 },
  refList: { marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  refItem: { fontSize: '0.875rem' },
  checkList: { display: 'flex', flexDirection: 'column', gap: '0.4rem', background: '#1e3a5f', borderRadius: '6px', padding: '0.6rem', maxHeight: '200px', overflowY: 'auto' },
  checkRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' },
}
