import { useRef, useState } from 'react'
import AI_IMPORT_PROMPT from '../../lib/aiImportPrompt'
import { formatPercent } from '../../lib/compute'
import type { AppData, RateYear, ShareEvent } from '../../lib/types'
import type { UseNotificationsResult } from '../../hooks/useNotifications'

interface Props {
  data: AppData
  onUpdate: (updater: (prev: AppData) => AppData) => void
  onImport: (raw: unknown) => Promise<void>
  notifications: UseNotificationsResult
  onSignOut: () => void
  userName?: string
}

export function SettingsTab({
  data,
  onUpdate,
  onImport,
  notifications,
  onSignOut,
  userName,
}: Props) {
  const [section, setSection] = useState<string | null>(null)
  const [importJson, setImportJson] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState(false)
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Current price form
  const [price, setPrice] = useState(data.currentPrice.toString())

  // Rate year form
  const [rateForm, setRateForm] = useState<RateYear>({
    year: new Date().getFullYear(),
    rate: 0,
  })

  // Share event form
  const [shareForm, setShareForm] = useState<Omit<ShareEvent, 'id'>>({
    date: '',
    vestedDelta: 0,
    label: '',
  })

  function handlePriceUpdate(e: React.FormEvent) {
    e.preventDefault()
    const p = parseFloat(price)
    if (isNaN(p) || p <= 0) return
    onUpdate((prev) => ({
      ...prev,
      currentPrice: p,
      asOfDate: new Date().toISOString().split('T')[0]!,
      priceHistory: [
        ...prev.priceHistory.filter(
          (h) => h.date !== new Date().toISOString().split('T')[0],
        ),
        { date: new Date().toISOString().split('T')[0]!, price: p },
      ],
    }))
  }

  function handleAddRate(e: React.FormEvent) {
    e.preventDefault()
    onUpdate((prev) => {
      const filtered = prev.ratesByYear.filter(
        (r) => r.year !== rateForm.year,
      )
      return { ...prev, ratesByYear: [...filtered, rateForm].sort((a, b) => a.year - b.year) }
    })
    setRateForm({ year: rateForm.year + 1, rate: rateForm.rate })
  }

  function handleDeleteRate(year: number) {
    onUpdate((prev) => ({
      ...prev,
      ratesByYear: prev.ratesByYear.filter((r) => r.year !== year),
    }))
  }

  function handleAddShareEvent(e: React.FormEvent) {
    e.preventDefault()
    onUpdate((prev) => ({
      ...prev,
      shareEvents: [
        ...prev.shareEvents,
        { ...shareForm, id: `se-${Date.now()}` },
      ],
    }))
    setShareForm({ date: '', vestedDelta: 0, label: '' })
  }

  function handleExport() {
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stock-tracker-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setImportJson((ev.target?.result as string) ?? '')
    }
    reader.readAsText(file)
  }

  async function handleImport() {
    setImportError(null)
    setImportSuccess(false)
    try {
      const raw: unknown = JSON.parse(importJson)
      await onImport(raw)
      setImportSuccess(true)
      setImportJson('')
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Invalid JSON')
    }
  }

  async function handleCopyPrompt() {
    try {
      await navigator.clipboard.writeText(AI_IMPORT_PROMPT)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select text
    }
  }

  const toggle = (s: string) => setSection(section === s ? null : s)

  return (
    <div style={styles.container}>
      <div style={styles.userBar}>
        {userName && <span style={styles.userName}>Signed in as {userName}</span>}
        <button style={styles.signOutBtn} onClick={onSignOut}>
          Sign Out
        </button>
      </div>

      {/* Current Price */}
      <Section title="Current Share Price" open={section === 'price'} onToggle={() => toggle('price')}>
        <form onSubmit={handlePriceUpdate} style={styles.row}>
          <input
            type="number"
            value={price}
            step="0.01"
            min={0}
            onChange={(e) => setPrice(e.target.value)}
            style={{ ...styles.input, width: '120px' }}
            data-testid="price-input"
          />
          <button type="submit" style={styles.saveBtn}>
            Update
          </button>
        </form>
        <p style={styles.hint}>
          Currently ${data.currentPrice.toFixed(2)} as of {data.asOfDate}
        </p>
      </Section>

      {/* Rate History */}
      <Section
        title="Annual Rate History"
        open={section === 'rates'}
        onToggle={() => toggle('rates')}
      >
        <p style={styles.hint}>
          Enter the rate offered for new loans each year. Used to compute
          annual interest capitalization.
        </p>
        <form onSubmit={handleAddRate} style={{ ...styles.row, marginBottom: '0.75rem' }}>
          <input
            type="number"
            value={rateForm.year}
            min={2000}
            max={2100}
            onChange={(e) => setRateForm({ ...rateForm, year: +e.target.value })}
            style={{ ...styles.input, width: '80px' }}
          />
          <input
            type="number"
            value={rateForm.rate}
            step="0.0001"
            min={0}
            max={1}
            placeholder="0.037"
            onChange={(e) => setRateForm({ ...rateForm, rate: +e.target.value })}
            style={{ ...styles.input, width: '100px' }}
          />
          <button type="submit" style={styles.saveBtn}>
            Add Year
          </button>
        </form>
        <div style={styles.rateList}>
          {[...data.ratesByYear]
            .sort((a, b) => b.year - a.year)
            .map((r) => (
              <div key={r.year} style={styles.rateRow}>
                <span style={styles.rateYear}>{r.year}</span>
                <span style={styles.rateVal}>{formatPercent(r.rate)}</span>
                <button
                  style={styles.deleteBtn}
                  onClick={() => handleDeleteRate(r.year)}
                >
                  ✕
                </button>
              </div>
            ))}
        </div>
      </Section>

      {/* Share Events */}
      <Section
        title="Share Events"
        open={section === 'share-events'}
        onToggle={() => toggle('share-events')}
      >
        <form onSubmit={handleAddShareEvent} style={styles.formGrid}>
          <FormField label="Date">
            <input
              type="date"
              value={shareForm.date}
              onChange={(e) => setShareForm({ ...shareForm, date: e.target.value })}
              required
              style={styles.input}
            />
          </FormField>
          <FormField label="Shares (+ vested, - returned)">
            <input
              type="number"
              value={shareForm.vestedDelta}
              step="0.01"
              onChange={(e) =>
                setShareForm({ ...shareForm, vestedDelta: +e.target.value })
              }
              required
              style={styles.input}
            />
          </FormField>
          <FormField label="Label">
            <input
              type="text"
              value={shareForm.label}
              onChange={(e) => setShareForm({ ...shareForm, label: e.target.value })}
              required
              style={styles.input}
              placeholder="e.g. Vesting period 1 — 2018 Purchase"
            />
          </FormField>
          <div style={{ alignSelf: 'flex-end' }}>
            <button type="submit" style={styles.saveBtn}>
              Add Event
            </button>
          </div>
        </form>
      </Section>

      {/* Notifications */}
      <Section
        title="Notifications"
        open={section === 'notifications'}
        onToggle={() => toggle('notifications')}
      >
        <p style={styles.hint}>
          Permission:{' '}
          <strong style={permissionColor(notifications.permission)}>
            {notifications.permission}
          </strong>
          {notifications.periodicSyncRegistered && (
            <span style={{ color: '#4ade80', marginLeft: '0.5rem' }}>
              · Background sync active
            </span>
          )}
        </p>
        {notifications.permission !== 'granted' && (
          <button
            style={styles.saveBtn}
            onClick={() => void notifications.requestPermission()}
            data-testid="enable-notifications-btn"
          >
            Enable Notifications
          </button>
        )}
        <p style={styles.notesText}>
          Notifications fire on vesting dates, loan due dates, and interest
          compounding dates (July 15). On Android/Chrome, background
          notifications work even when the app is closed. On iOS, open the
          app to check for events.
        </p>
      </Section>

      {/* Import with AI */}
      <Section
        title="Import with AI"
        open={section === 'ai-import'}
        onToggle={() => toggle('ai-import')}
      >
        <div style={styles.aiSteps}>
          <p style={styles.hint}>
            Use Claude or ChatGPT to convert your stock documents into an
            importable JSON file:
          </p>
          <ol style={styles.stepList}>
            <li>Click <strong>Copy AI Prompt</strong> below</li>
            <li>Open <a href="https://claude.ai" target="_blank" rel="noopener noreferrer" style={styles.link}>Claude.ai</a> or <a href="https://chatgpt.com" target="_blank" rel="noopener noreferrer" style={styles.link}>ChatGPT</a></li>
            <li>Upload your stock program documents (PDFs, screenshots, emails)</li>
            <li>Paste the prompt and send</li>
            <li>Copy the JSON response and paste it in the box below</li>
            <li>Click <strong>Import</strong></li>
          </ol>
        </div>
        <button
          style={{ ...styles.saveBtn, marginBottom: '1rem', background: copied ? '#10b981' : '#6366f1' }}
          onClick={() => void handleCopyPrompt()}
          data-testid="copy-ai-prompt-btn"
        >
          {copied ? '✓ Copied!' : 'Copy AI Prompt'}
        </button>
        <textarea
          value={importJson}
          onChange={(e) => setImportJson(e.target.value)}
          placeholder="Paste the JSON response from the AI here…"
          style={styles.textarea}
          rows={8}
          data-testid="import-json-textarea"
        />
        {importError && <p style={styles.errorText}>{importError}</p>}
        {importSuccess && (
          <p style={styles.successText}>Data imported successfully!</p>
        )}
        <button
          style={styles.saveBtn}
          onClick={() => void handleImport()}
          disabled={!importJson.trim()}
          data-testid="import-json-btn"
        >
          Import
        </button>
      </Section>

      {/* Export / Import file */}
      <Section
        title="Export & Import"
        open={section === 'export'}
        onToggle={() => toggle('export')}
      >
        <p style={styles.hint}>
          Export your data as JSON for backup, then re-import on any device.
        </p>
        <div style={styles.row}>
          <button style={styles.saveBtn} onClick={handleExport} data-testid="export-btn">
            Export JSON
          </button>
          <button
            style={{ ...styles.saveBtn, background: '#10b981' }}
            onClick={() => fileInputRef.current?.click()}
          >
            Import from file
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleFileImport}
            style={{ display: 'none' }}
            data-testid="import-file-input"
          />
        </div>
        {importJson && (
          <>
            {importError && <p style={styles.errorText}>{importError}</p>}
            {importSuccess && (
              <p style={styles.successText}>Data imported successfully!</p>
            )}
            <button
              style={{ ...styles.saveBtn, marginTop: '0.5rem' }}
              onClick={() => void handleImport()}
              data-testid="confirm-file-import-btn"
            >
              Confirm Import
            </button>
          </>
        )}
      </Section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Section({
  title,
  open,
  onToggle,
  children,
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div style={sectionStyles.wrapper}>
      <button style={sectionStyles.header} onClick={onToggle}>
        <span style={sectionStyles.title}>{title}</span>
        <span style={sectionStyles.chevron}>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div style={sectionStyles.body}>{children}</div>}
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

function permissionColor(p: string): React.CSSProperties {
  if (p === 'granted') return { color: '#4ade80' }
  if (p === 'denied') return { color: '#f87171' }
  return { color: '#f59e0b' }
}

const sectionStyles: Record<string, React.CSSProperties> = {
  wrapper: { background: '#0f3460', borderRadius: '10px', marginBottom: '0.75rem', overflow: 'hidden' },
  header: { width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1rem', background: 'transparent', border: 'none', cursor: 'pointer', color: '#e2e8f0' },
  title: { fontWeight: 600, fontSize: '0.95rem' },
  chevron: { color: '#64748b', fontSize: '0.75rem' },
  body: { padding: '0 1rem 1rem' },
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '1rem', maxWidth: '700px', margin: '0 auto' },
  userBar: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' },
  userName: { color: '#94a3b8', fontSize: '0.85rem' },
  signOutBtn: { background: 'transparent', color: '#f87171', border: '1px solid #f8717144', borderRadius: '6px', padding: '0.3rem 0.7rem', cursor: 'pointer', fontSize: '0.8rem' },
  row: { display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' },
  input: { background: '#1e3a5f', border: '1px solid #2d5282', color: '#e2e8f0', borderRadius: '6px', padding: '0.4rem 0.6rem', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' },
  saveBtn: { background: '#4285f4', color: 'white', border: 'none', borderRadius: '6px', padding: '0.45rem 1rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap' },
  deleteBtn: { background: 'transparent', color: '#f87171', border: 'none', cursor: 'pointer', fontSize: '0.8rem' },
  hint: { color: '#64748b', fontSize: '0.8rem', margin: '0 0 0.6rem' },
  rateList: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  rateRow: { display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#1e3a5f', borderRadius: '6px', padding: '0.3rem 0.6rem' },
  rateYear: { color: '#e2e8f0', fontWeight: 700, minWidth: '2.5rem' },
  rateVal: { color: '#4ade80', flex: 1 },
  textarea: { width: '100%', background: '#1e3a5f', border: '1px solid #2d5282', color: '#e2e8f0', borderRadius: '6px', padding: '0.6rem', fontSize: '0.85rem', fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box', display: 'block' },
  errorText: { color: '#f87171', fontSize: '0.8rem', margin: '0.4rem 0', background: 'rgba(239,68,68,0.1)', padding: '0.4rem 0.6rem', borderRadius: '4px' },
  successText: { color: '#4ade80', fontSize: '0.8rem', margin: '0.4rem 0' },
  aiSteps: { marginBottom: '0.75rem' },
  stepList: { color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.8, paddingLeft: '1.2rem', margin: '0.5rem 0 0' },
  link: { color: '#60a5fa' },
  notesText: { color: '#64748b', fontSize: '0.8rem', marginTop: '0.75rem', lineHeight: 1.5 },
}
