/**
 * A prompt that users can copy and paste into Claude or ChatGPT along with
 * their stock program documents to generate a valid import JSON.
 *
 * Safe to commit — contains only schema documentation, no personal data.
 */

export const AI_IMPORT_PROMPT = `You are helping extract structured data from stock program documents.

I will share documents related to my stock program (grants, loans, vesting schedules, etc.).
Please read all documents carefully and output ONLY a single JSON object matching the schema below.
Do not include any explanation, markdown code fences, or prose — just the raw JSON.

SCHEMA:
{
  "schemaVersion": 1,
  "currentPrice": <current share price as a number, e.g. 2.85>,
  "asOfDate": "<YYYY-MM-DD of when price was last updated>",
  "grants": [
    {
      "id": "<unique string, e.g. 'grant-2018-purchase'>",
      "year": <year of grant, e.g. 2018>,
      "type": "<one of: 'Purchase', 'Catch-Up Purchase', 'Bonus', 'Catch-Up Bonus'>",
      "shares": <total shares in this grant, e.g. 500>,
      "price": <share price at grant date, e.g. 1.99>,
      "vestStart": "<ISO date of first vesting, e.g. '2019-07-01'>",
      "vestPeriods": <total number of vesting periods, typically 5 for annual>,
      "passedPeriods": <number of vesting periods already past>
    }
  ],
  "baseLoans": [
    {
      "id": "<unique string, e.g. 'loan-2018-purchase-principal'>",
      "grantId": "<id of the grant this loan is for>",
      "grantYear": <year of the grant>,
      "grantType": "<same as grant type above>",
      "loanType": "<one of: 'Purchase', 'Tax'>",
      "amount": <loan principal in dollars, e.g. 995.00>,
      "rate": <annual interest rate as decimal, e.g. 0.0086 for 0.86%>,
      "due": "<ISO due date, e.g. '2029-07-01'>"
    }
  ],
  "ratesByYear": [
    { "year": 2018, "rate": 0.0086 },
    { "year": 2019, "rate": 0.0091 }
    // add one entry per year you have data for
  ],
  "refinanceEvents": [
    // leave as [] if no refinances have occurred
    {
      "id": "<unique string>",
      "date": "<ISO date of refinance>",
      "replacesLoanIds": ["<id of base loan being replaced>"],
      "newRate": <new annual rate as decimal>,
      "newDue": "<new due date as ISO date>"
    }
  ],
  "shareEvents": [
    {
      "id": "<unique string>",
      "date": "<ISO date>",
      "vestedDelta": <number of shares; positive = received, negative = returned>,
      "label": "<human-readable description, e.g. 'Vesting period 1 — 2018 Purchase'>"
    }
  ],
  "priceHistory": [
    { "date": "<ISO date>", "price": <share price> }
    // include historical price points if available
  ]
}

IMPORTANT NOTES:
- "baseLoans" should only contain the ORIGINAL principal and tax loans.
  Do NOT include interest loans — the app computes those automatically from "ratesByYear".
- If a loan has been refinanced, include the original loan in "baseLoans" AND add a
  "refinanceEvents" entry that references it. Do NOT modify the original loan's rate or due date.
- All dates must be in YYYY-MM-DD format.
- All rates must be decimals (e.g. 3.7% = 0.037, not 3.7).
- IDs must be unique strings within their array.
- If you are unsure about a value, use your best estimate and add a comment
  (as a separate "notes" field at the top level — the app will ignore unknown fields).

Please extract all grants and loans from the documents I provide.`

export default AI_IMPORT_PROMPT
