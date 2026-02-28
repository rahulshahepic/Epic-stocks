import { useState } from 'react'
import { formatCurrency, formatDate } from '../../lib/compute'
import type { AppData, Grant, GrantType } from '../../lib/types'

interface Props {
  data: AppData
  onUpdate: (updater: (prev: AppData) => AppData) => void
}

type FormState = Omit<Grant, 'id'>

const GRANT_TYPES: GrantType[] = [
  'Purchase',
  'Catch-Up Purchase',
  'Bonus',
  'Catch-Up Bonus',
]

const DEFAULT_FORM: FormState = {
  year: new Date().getFullYear(),
  type: 'Purchase',
  shares: 0,
  price: 0,
  vestStart: '',
  vestPeriods: 5,
  passedPeriods: 0,
}

export function GrantsTab({ data, onUpdate }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [editId, setEditId] = useState<string | null>(null)

  const sorted = [...data.grants].sort(
    (a, b) => a.year - b.year || a.type.localeCompare(b.type),
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onUpdate((prev) => {
      if (editId) {
        return {
          ...prev,
          grants: prev.grants.map((g) =>
            g.id === editId ? { ...form, id: editId } : g,
          ),
        }
      }
      return {
        ...prev,
        grants: [
          ...prev.grants,
          { ...form, id: `grant-${Date.now()}` },
        ],
      }
    })
    setShowForm(false)
    setEditId(null)
    setForm(DEFAULT_FORM)
  }

  function handleEdit(grant: Grant) {
    const { id, ...rest } = grant
    setEditId(id)
    setForm(rest)
    setShowForm(true)
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this grant?')) return
    onUpdate((prev) => ({
      ...prev,
      grants: prev.grants.filter((g) => g.id !== id),
      baseLoans: prev.baseLoans.filter((l) => l.grantId !== id),
    }))
  }

  const progressStyle = (g: Grant) => {
    const pct = Math.min(100, (g.passedPeriods / g.vestPeriods) * 100)
    return {
      width: `${pct}%`,
      height: '4px',
      background: '#4ade80',
      borderRadius: '2px',
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.heading}>Grants</h2>
        <button
          style={styles.addBtn}
          onClick={() => {
            setEditId(null)
            setForm(DEFAULT_FORM)
            setShowForm(true)
          }}
          data-testid="add-grant-btn"
        >
          + Add Grant
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <h3 style={styles.formTitle}>{editId ? 'Edit Grant' : 'Add Grant'}</h3>
          <div style={styles.formGrid}>
            <Field label="Year">
              <input
                type="number"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: +e.target.value })}
                required
                style={styles.input}
              />
            </Field>
            <Field label="Type">
              <select
                value={form.type}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value as GrantType })
                }
                style={styles.input}
              >
                {GRANT_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Shares">
              <input
                type="number"
                value={form.shares}
                onChange={(e) => setForm({ ...form, shares: +e.target.value })}
                required
                min={1}
                style={styles.input}
              />
            </Field>
            <Field label="Grant Price ($)">
              <input
                type="number"
                value={form.price}
                step="0.01"
                onChange={(e) => setForm({ ...form, price: +e.target.value })}
                required
                min={0}
                style={styles.input}
              />
            </Field>
            <Field label="Vest Start">
              <input
                type="date"
                value={form.vestStart}
                onChange={(e) =>
                  setForm({ ...form, vestStart: e.target.value })
                }
                required
                style={styles.input}
              />
            </Field>
            <Field label="Vest Periods">
              <input
                type="number"
                value={form.vestPeriods}
                onChange={(e) =>
                  setForm({ ...form, vestPeriods: +e.target.value })
                }
                required
                min={1}
                style={styles.input}
              />
            </Field>
            <Field label="Passed Periods">
              <input
                type="number"
                value={form.passedPeriods}
                onChange={(e) =>
                  setForm({ ...form, passedPeriods: +e.target.value })
                }
                required
                min={0}
                style={styles.input}
              />
            </Field>
          </div>
          <div style={styles.formActions}>
            <button type="submit" style={styles.saveBtn}>
              {editId ? 'Save' : 'Add'}
            </button>
            <button
              type="button"
              style={styles.cancelBtn}
              onClick={() => {
                setShowForm(false)
                setEditId(null)
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {sorted.length === 0 ? (
        <p style={styles.empty}>No grants added yet.</p>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                {['Year', 'Type', 'Shares', 'Price', 'Vest Start', 'Vesting', ''].map(
                  (h) => (
                    <th key={h} style={styles.th}>
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {sorted.map((g) => (
                <tr key={g.id} style={styles.tr}>
                  <td style={styles.td}>{g.year}</td>
                  <td style={styles.td}>
                    <span style={grantTypeBadge(g.type)}>{g.type}</span>
                  </td>
                  <td style={styles.td}>{g.shares.toLocaleString()}</td>
                  <td style={styles.td}>{formatCurrency(g.price)}</td>
                  <td style={styles.td}>{formatDate(g.vestStart)}</td>
                  <td style={styles.td}>
                    <div style={styles.progressBg}>
                      <div style={progressStyle(g)} />
                    </div>
                    <span style={styles.progressLabel}>
                      {g.passedPeriods}/{g.vestPeriods}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <button
                      style={styles.editBtn}
                      onClick={() => handleEdit(g)}
                    >
                      Edit
                    </button>
                    <button
                      style={styles.deleteBtn}
                      onClick={() => handleDelete(g.id)}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label style={fieldStyles.label}>
      <span style={fieldStyles.text}>{label}</span>
      {children}
    </label>
  )
}

const fieldStyles: Record<string, React.CSSProperties> = {
  label: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  text: { color: '#94a3b8', fontSize: '0.8rem' },
}

function grantTypeBadge(type: GrantType): React.CSSProperties {
  const colors: Record<GrantType, string> = {
    Purchase: '#3b82f6',
    'Catch-Up Purchase': '#6366f1',
    Bonus: '#10b981',
    'Catch-Up Bonus': '#14b8a6',
  }
  return {
    background: colors[type] + '22',
    color: colors[type],
    borderRadius: '4px',
    padding: '0.1rem 0.4rem',
    fontSize: '0.78rem',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '1rem', maxWidth: '900px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' },
  heading: { color: '#e2e8f0', margin: 0, fontSize: '1.2rem' },
  addBtn: { background: '#4285f4', color: 'white', border: 'none', borderRadius: '6px', padding: '0.4rem 0.9rem', cursor: 'pointer', fontSize: '0.9rem' },
  form: { background: '#0f3460', borderRadius: '10px', padding: '1.25rem', marginBottom: '1rem' },
  formTitle: { color: '#e2e8f0', margin: '0 0 1rem', fontSize: '1rem' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1rem' },
  input: { background: '#1e3a5f', border: '1px solid #2d5282', color: '#e2e8f0', borderRadius: '6px', padding: '0.4rem 0.6rem', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' },
  formActions: { display: 'flex', gap: '0.5rem' },
  saveBtn: { background: '#4285f4', color: 'white', border: 'none', borderRadius: '6px', padding: '0.5rem 1.2rem', cursor: 'pointer', fontWeight: 600 },
  cancelBtn: { background: 'transparent', color: '#94a3b8', border: '1px solid #2d5282', borderRadius: '6px', padding: '0.5rem 1rem', cursor: 'pointer' },
  empty: { color: '#64748b', textAlign: 'center', padding: '2rem' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' },
  th: { color: '#64748b', fontWeight: 600, textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: '1px solid #1e3a5f', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #0d2846' },
  td: { color: '#e2e8f0', padding: '0.6rem 0.75rem', verticalAlign: 'middle' },
  progressBg: { background: '#1e3a5f', borderRadius: '2px', height: '4px', width: '80px', marginBottom: '2px' },
  progressLabel: { color: '#64748b', fontSize: '0.75rem' },
  editBtn: { background: 'transparent', color: '#60a5fa', border: 'none', cursor: 'pointer', fontSize: '0.8rem', padding: '0.1rem 0.3rem' },
  deleteBtn: { background: 'transparent', color: '#f87171', border: 'none', cursor: 'pointer', fontSize: '0.8rem', padding: '0.1rem 0.3rem' },
}
