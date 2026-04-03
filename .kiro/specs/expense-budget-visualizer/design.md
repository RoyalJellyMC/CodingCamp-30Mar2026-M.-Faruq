# Design Document: Expense & Budget Visualizer

## Overview

The Expense & Budget Visualizer is a single-page web application delivered as a static file bundle (one HTML, one CSS, one JS). It runs entirely in the browser with no backend — all state is persisted in `localStorage`. The user can add and delete spending transactions, see a running balance, browse a scrollable history list, and view a Chart.js pie chart that breaks spending down by category (Food, Transport, Fun).

Key design goals:
- Zero dependencies beyond Chart.js (CDN)
- No build step — open `index.html` directly in any modern browser
- Mobile-first responsive layout (320 px → 1920 px)
- All UI updates are synchronous and in-place (no page reloads)

---

## Architecture

The app follows a simple **MVC-lite** pattern implemented in a single `js/app.js` module:

```
┌─────────────────────────────────────────────────────┐
│                     index.html                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │  Input_Form  │  │  Tx_List     │  │  Chart    │ │
│  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘ │
│         │                 │                │        │
│         └────────┬────────┘                │        │
│                  ▼                         │        │
│           js/app.js                        │        │
│  ┌────────────────────────────────────┐    │        │
│  │  State (in-memory array)           │    │        │
│  │  Storage (localStorage adapter)   │    │        │
│  │  Validator (input checks)         │    │        │
│  │  Renderer (DOM updates)           │────┘        │
│  │  ChartManager (Chart.js wrapper)  │             │
│  └────────────────────────────────────┘            │
└─────────────────────────────────────────────────────┘
```

Data flow for every user action:
1. User interacts with the DOM (form submit / delete click)
2. `app.js` validates input (Validator)
3. State array is mutated (add / remove)
4. Storage is written synchronously (Storage)
5. Renderer updates Balance, Transaction_List, and ChartManager in one pass

---

## Components and Interfaces

### InputForm

Handles the add-transaction form.

```js
// Public surface
InputForm.init()          // bind submit listener
InputForm.reset()         // clear all fields
InputForm.showError(msg)  // display inline validation error
InputForm.clearError()    // remove error message
```

### TransactionList

Renders and manages the scrollable list.

```js
TransactionList.init()              // bind delete-click delegation
TransactionList.render(transactions) // full re-render from state array
TransactionList.showEmpty()          // render empty-state message
```

### BalanceDisplay

Single responsibility: keep the balance `<span>` in sync.

```js
BalanceDisplay.update(total) // set text content to formatted currency
```

### ChartManager

Thin wrapper around a Chart.js `Pie` instance.

```js
ChartManager.init(canvasId)          // create Chart instance
ChartManager.update(categoryTotals)  // call chart.data update + chart.update()
ChartManager.showEmpty()             // display no-data placeholder
```

### Storage

Adapter over `localStorage` with error handling.

```js
Storage.load()           // returns Transaction[] or [] on error/missing
Storage.save(transactions) // JSON.stringify and write; no-op on failure
Storage.isAvailable()    // feature-detect localStorage
```

### Validator

Pure functions — no DOM side-effects.

```js
Validator.validate(name, amount, category)
// returns { valid: boolean, errors: string[] }
```

### MonthlySummary

Groups transactions by calendar month and renders totals.

```js
MonthlySummary.render(transactions) // group by "Month YYYY", show total + count per month
MonthlySummary.show()               // make the summary section visible
MonthlySummary.hide()               // hide the summary section
```

### SortControl

Manages the active sort order for the Transaction_List.

```js
SortControl.init(onChange)          // bind change listener; calls onChange(sortKey) on selection
SortControl.getActive()             // returns current sort key: "amount-asc" | "amount-desc" | "category-az"
SortControl.apply(transactions)     // returns a sorted copy of the array (does not mutate)
```

### ThemeManager

Manages dark/light mode via a CSS class on `<body>` and persists preference.

```js
ThemeManager.init()                 // load saved preference from localStorage, apply on boot
ThemeManager.toggle()               // flip between "light" and "dark", persist to localStorage
ThemeManager.apply(theme)           // add/remove "dark" class on <body>
```

### AppController

Orchestrates all components; owns the in-memory state array.

```js
AppController.init()           // boot sequence: load storage, render all
AppController.addTransaction(name, amount, category)
AppController.deleteTransaction(id)
AppController._recalculate()   // recompute balance + category totals, push to renderers
AppController.showMonthlySummary()  // render and show MonthlySummary
AppController.hideMonthlySummary()  // hide MonthlySummary
```

---

## Data Models

### Transaction

```js
/**
 * @typedef {Object} Transaction
 * @property {string} id        - UUID (crypto.randomUUID or Date.now fallback)
 * @property {string} name      - Item description (non-empty string)
 * @property {number} amount    - Positive number (stored as float)
 * @property {string} category  - One of: "Food" | "Transport" | "Fun"
 * @property {number} timestamp - Unix ms (Date.now()) for ordering
 */
```

### CategoryTotals

```js
/**
 * @typedef {Object} CategoryTotals
 * @property {number} Food
 * @property {number} Transport
 * @property {number} Fun
 */
```

### Storage Schema

Key: `"ebv_transactions"` — JSON array of `Transaction` objects.
Key: `"ebv_theme"` — `"light"` or `"dark"` string.

```json
[
  {
    "id": "1718000000000",
    "name": "Coffee",
    "amount": 3.50,
    "category": "Food",
    "timestamp": 1718000000000
  }
]
```

### Derived State

Both `balance` and `categoryTotals` are always derived from the canonical `transactions` array — they are never stored independently.

```js
// balance
const balance = transactions.reduce((sum, t) => sum + t.amount, 0);

// categoryTotals
const categoryTotals = transactions.reduce((acc, t) => {
  acc[t.category] = (acc[t.category] || 0) + t.amount;
  return acc;
}, { Food: 0, Transport: 0, Fun: 0 });
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Valid transaction submission grows state

*For any* valid (non-empty name, positive numeric amount, valid category) transaction submitted via `AppController.addTransaction`, the in-memory transactions array length should increase by exactly 1, the balance should increase by the transaction's amount, and the transaction should appear in the rendered list.

**Validates: Requirements 1.2, 2.3, 4.2, 5.2**

---

### Property 2: Empty-field validation rejects submission

*For any* combination of missing fields (name empty, amount empty, or category unselected), `Validator.validate` should return `{ valid: false }` with a non-empty `errors` array identifying each missing field.

**Validates: Requirements 1.3**

---

### Property 3: Invalid amount validation rejects submission

*For any* amount value that is non-numeric, zero, or negative, `Validator.validate` should return `{ valid: false }` with an error message indicating a valid positive number is required.

**Validates: Requirements 1.5**

---

### Property 4: Form resets after successful submission

*For any* valid transaction submission, after `AppController.addTransaction` completes, all Input_Form fields (name, amount, category) should be reset to their default empty/unselected state.

**Validates: Requirements 1.4**

---

### Property 5: Transaction list renders all required fields

*For any* array of transactions passed to `TransactionList.render`, every transaction's name, formatted amount, and category should appear in the rendered DOM output, and each entry should contain a delete control.

**Validates: Requirements 2.1, 3.1**

---

### Property 6: Storage add round-trip restores state

*For any* set of transactions saved via `Storage.save`, calling `Storage.load` should return an array that is deeply equal to the saved array (same ids, names, amounts, categories, timestamps).

**Validates: Requirements 2.2, 6.1, 6.3**

---

### Property 7: Storage delete round-trip reflects removal

*For any* transaction deleted via `AppController.deleteTransaction`, calling `Storage.load` afterward should return an array that does not contain the deleted transaction's id.

**Validates: Requirements 3.2, 6.2, 6.3**

---

### Property 8: Delete removes transaction from all derived state

*For any* transaction present in the transactions array, after `AppController.deleteTransaction(id)` is called, the transaction should be absent from the state array, the balance should decrease by exactly that transaction's amount, and the category total for that transaction's category should decrease by that amount.

**Validates: Requirements 3.2, 4.3, 5.3**

---

### Property 9: Empty state displays correct zero values (edge case)

*For any* app state where the transactions array is empty (either initially or after all transactions are deleted), the balance should be 0, the Transaction_List should display an empty-state message, and the Chart should display a no-data placeholder.

**Validates: Requirements 3.3, 4.4, 5.4**

---

### Property 10: Storage error produces graceful fallback (edge case)

*For any* condition where `localStorage` is unavailable or contains unparseable JSON, `Storage.load` should return an empty array without throwing, and the app should display a warning message to the user.

**Validates: Requirements 6.4**

---

### Property 11: Monthly summary totals match transaction data

*For any* array of transactions, the sum of all monthly totals in `MonthlySummary` should equal the overall balance, and the sum of all monthly transaction counts should equal the total number of transactions.

**Validates: Requirements 10.2, 10.3**

---

### Property 12: Sort does not mutate stored data

*For any* sort key applied via `SortControl.apply`, the returned array should be a sorted copy — the original transactions array in Storage should remain in insertion order.

**Validates: Requirements 11.3**

---

### Property 13: Theme persists across reload

*For any* theme selected via `ThemeManager.toggle`, `Storage.load` for key `"ebv_theme"` should return the selected theme value, and on next `ThemeManager.init` the same theme should be applied.

**Validates: Requirements 12.3, 12.4**

---

## Error Handling

| Scenario | Handling |
|---|---|
| `localStorage` unavailable (private mode, quota exceeded) | `Storage.isAvailable()` returns false; app runs in-memory only; warning banner shown |
| `localStorage` contains invalid JSON | `JSON.parse` wrapped in try/catch; returns `[]`; warning banner shown |
| `crypto.randomUUID` unavailable (old Safari) | Fallback: `Date.now() + Math.random()` as id |
| Chart.js CDN fails to load | `window.Chart` check on init; show error message in chart container |
| Amount field receives non-numeric input | Validator catches before state mutation; inline error shown |
| Duplicate id collision | Statistically impossible with UUID; no special handling needed |

All error states are non-fatal — the app degrades gracefully and remains usable.

---

## Testing Strategy

### Dual Testing Approach

Both unit tests and property-based tests are required. They are complementary:
- Unit tests catch concrete bugs at specific inputs and integration points
- Property-based tests verify universal correctness across the full input space

### Unit Tests

Focus areas:
- `Validator.validate` with specific known-good and known-bad inputs
- `Storage.load` when localStorage returns `null`, invalid JSON, and valid JSON
- `AppController._recalculate` with a fixed set of transactions
- `TransactionList.render` with an empty array (empty-state message)
- `ChartManager.update` with all-zero category totals (empty-state placeholder)
- DOM structure: balance element exists, form fields exist, canvas element exists

### Property-Based Tests

**Library**: [fast-check](https://github.com/dubzzz/fast-check) (loaded via CDN or npm for test runner only — not bundled into the app).

**Configuration**: Each property test runs a minimum of **100 iterations**.

Each test must include a comment tag in the format:
`// Feature: expense-budget-visualizer, Property N: <property_text>`

| Property | Test Description | Arbitraries |
|---|---|---|
| P1 | Valid submission grows state | `fc.string({ minLength: 1 })`, `fc.float({ min: 0.01, max: 10000 })`, `fc.constantFrom("Food","Transport","Fun")` |
| P2 | Empty-field combos rejected | `fc.subarray(["name","amount","category"], { minLength: 1 })` — set each selected field to empty |
| P3 | Invalid amounts rejected | `fc.oneof(fc.constant(0), fc.float({ max: 0 }), fc.string())` |
| P4 | Form resets after submit | Same arbitraries as P1; check DOM field values after add |
| P5 | List renders all fields | `fc.array(transactionArbitrary, { minLength: 1 })` |
| P6 | Storage add round-trip | `fc.array(transactionArbitrary)` |
| P7 | Storage delete round-trip | `fc.array(transactionArbitrary, { minLength: 1 })`, pick random id to delete |
| P8 | Delete updates all derived state | `fc.array(transactionArbitrary, { minLength: 1 })`, pick random transaction to delete |
| P9 | Empty state correctness | Fixed input: empty array (edge case — single example) |
| P10 | Storage error fallback | Mock `localStorage.getItem` to throw / return garbage string |

### Test File Location

Since the app has no build tooling, tests are run in a separate test harness:
- `tests/app.test.js` — imports logic extracted from `js/app.js` (pure functions only)
- `tests/index.html` — test runner page that loads fast-check from CDN and runs all tests

Pure functions (`Validator.validate`, `Storage.load/save`, balance/category derivation) are exported or extracted so they can be tested without a full DOM. DOM-dependent tests use a minimal JSDOM setup or run in-browser via the test runner page.
