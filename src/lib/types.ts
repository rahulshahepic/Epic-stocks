// ---------------------------------------------------------------------------
// Core domain types — no personal data hardcoded here
// All instances of AppData live only in Google Drive appDataFolder
// ---------------------------------------------------------------------------

export type GrantType =
  | 'Purchase'
  | 'Catch-Up Purchase'
  | 'Bonus'
  | 'Catch-Up Bonus'

export type LoanType = 'Purchase' | 'Tax'

export interface Grant {
  id: string
  year: number
  type: GrantType
  /** Total shares granted */
  shares: number
  /** Price per share at grant */
  price: number
  /** ISO date string — first vesting date */
  vestStart: string
  /** Total number of vesting periods */
  vestPeriods: number
  /** Number of vesting periods already passed at time of data entry */
  passedPeriods: number
}

/**
 * A principal or tax loan entered by the user.
 * Interest loans are derived dynamically by computeAllLoans().
 */
export interface BaseLoan {
  id: string
  grantId: string
  /** Year the grant was exercised */
  grantYear: number
  grantType: GrantType
  loanType: LoanType
  /** Principal amount in dollars */
  amount: number
  /** Annual interest rate as a decimal (e.g. 0.037 for 3.7%) */
  rate: number
  /** ISO date string — loan due date */
  due: string
}

/** A refinance event replaces one or more base loans with new terms */
export interface RefinanceEvent {
  id: string
  /** ISO date string */
  date: string
  /** IDs of BaseLoan entries this event replaces */
  replacesLoanIds: string[]
  /** New annual rate as a decimal */
  newRate: number
  /** New due date as ISO date string */
  newDue: string
}

/** The rate Epic offered for new loans in a given year */
export interface RateYear {
  year: number
  /** Annual rate as a decimal */
  rate: number
}

export interface ShareEvent {
  id: string
  /** ISO date string */
  date: string
  /** Positive = vested/received, negative = repaid/exchanged */
  vestedDelta: number
  label: string
}

export interface PricePoint {
  /** ISO date string */
  date: string
  price: number
}

/** Root document stored in Google Drive appDataFolder */
export interface AppData {
  /** Schema version for future migrations */
  schemaVersion: number
  currentPrice: number
  /** ISO date string of last price update */
  asOfDate: string
  grants: Grant[]
  /** Only principal/tax loans — interest loans are derived */
  baseLoans: BaseLoan[]
  /** Epic's offered rate per year, used to compute interest compounding */
  ratesByYear: RateYear[]
  refinanceEvents: RefinanceEvent[]
  shareEvents: ShareEvent[]
  priceHistory: PricePoint[]
  /** Notification preference: 'granted' | 'denied' | 'pending' */
  notificationPreference?: 'granted' | 'denied' | 'pending'
}

// ---------------------------------------------------------------------------
// Derived / computed types (not stored, produced by compute.ts)
// ---------------------------------------------------------------------------

export type ComputedLoanKind = 'base' | 'interest' | 'refinance-replacement'

export interface ComputedLoan {
  id: string
  /** Display label */
  label: string
  grantYear: number
  grantType: GrantType
  loanType: LoanType
  /** Year this loan was originated */
  originYear: number
  amount: number
  rate: number
  due: string
  kind: ComputedLoanKind
  /** True if superseded by a refinance */
  superseded: boolean
  /** ID of the RefinanceEvent that created this loan, if kind === 'refinance-replacement' */
  refinanceEventId?: string
  /** ID of the BaseLoan this was derived from (for interest loans) */
  sourceBaseLoanId?: string
}

export interface PortfolioSummary {
  currentShares: number
  portfolioValue: number
  totalLoanBalance: number
  /** Portfolio value minus total loan balance */
  netValue: number
  totalAccruedInterest: number
  vestedShares: number
  unvestedShares: number
}

export interface UpcomingEvent {
  date: string
  label: string
  type: 'vesting' | 'loan-due' | 'interest-compound' | 'refinance'
}
