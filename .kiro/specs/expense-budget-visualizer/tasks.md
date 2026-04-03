# Implementation Plan: Expense & Budget Visualizer

## Overview

Implement a single-page expense tracker as three static files (`index.html`, `css/styles.css`, `js/app.js`). No build tools, no frameworks, no backend. Chart.js loaded from CDN. All state persisted in localStorage.

## Tasks

- [x] 1. Create the HTML skeleton (`index.html`)
  - Create `index.html` with semantic structure: balance display at top, input form, transaction list container, chart canvas
  - Add `<script>` tag loading Chart.js from CDN (`https://cdn.jsdelivr.net/npm/chart.js`)
  - Add `<link>` to `css/styles.css` and `<script defer>` to `js/app.js`
  - Include a `<canvas id="spending-chart">` element inside the chart section
  - Include a storage-warning banner element (hidden by default)
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 2. Implement CSS layout and visual design (`css/styles.css`)
  - [x] 2.1 Write mobile-first base styles
    - Single-column stacked layout for 320px viewport
    - Touch-friendly tap targets (min 44×44 CSS px) for buttons and the delete control
    - Scrollable transaction list with `overflow-y: auto` and a fixed max-height
    - _Requirements: 7.1, 7.2, 7.3_
  - [x] 2.2 Add responsive breakpoints for wider viewports
    - Two-column layout (form + list side-by-side) at ≥768px
    - Chart expands proportionally up to 1920px
    - _Requirements: 7.1, 9.3_
  - [x] 2.3 Apply visual hierarchy and color scheme
    - Distinct typographic styles for balance, transaction entries, and form labels
    - Sufficient contrast between text and background
    - _Requirements: 9.3, 9.4_

- [x] 3. Implement `Storage` module in `js/app.js`
  - Write `Storage.isAvailable()` — feature-detects localStorage with a try/catch test write
  - Write `Storage.load()` — reads key `"ebv_transactions"`, parses JSON, returns `[]` on missing/error
  - Write `Storage.save(transactions)` — JSON.stringifies and writes; no-op on failure
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 4. Implement `Validator` module in `js/app.js`
  - Write `Validator.validate(name, amount, category)` returning `{ valid, errors[] }`
  - Reject empty name, empty/missing category, non-numeric amount, zero, and negative amounts
  - _Requirements: 1.3, 1.5_

- [x] 5. Implement `BalanceDisplay` module in `js/app.js`
  - Write `BalanceDisplay.update(total)` — formats total as currency and sets the balance element's text content
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 6. Implement `TransactionList` module in `js/app.js`
  - [x] 6.1 Write `TransactionList.render(transactions)`
    - Full re-render: clear container, then append one row per transaction showing name, formatted amount, and category
    - Each row includes a delete button with `data-id` attribute
    - _Requirements: 2.1, 2.3, 3.1_
  - [x] 6.2 Write `TransactionList.showEmpty()`
    - Renders an empty-state message ("No transactions yet") when the array is empty
    - _Requirements: 3.3_
  - [x] 6.3 Bind delete-click event delegation via `TransactionList.init(onDelete)`
    - Single listener on the list container; reads `data-id` and calls `onDelete(id)`
    - _Requirements: 3.2_

- [x] 7. Implement `ChartManager` module in `js/app.js`
  - [x] 7.1 Write `ChartManager.init(canvasId)`
    - Guard against `window.Chart` being undefined (CDN failure); show error message in chart container if missing
    - Create a `new Chart(...)` pie instance with labels `["Food","Transport","Fun"]` and distinct colors
    - _Requirements: 5.1, 5.5_
  - [x] 7.2 Write `ChartManager.update(categoryTotals)`
    - Push new data values into `chart.data.datasets[0].data` and call `chart.update()`
    - _Requirements: 5.2, 5.3_
  - [x] 7.3 Write `ChartManager.showEmpty()`
    - Display a no-data placeholder (e.g., overlay text) when all category totals are zero
    - _Requirements: 5.4_

- [x] 8. Implement `InputForm` module in `js/app.js`
  - Write `InputForm.init(onSubmit)` — binds the form's `submit` event; calls `Validator.validate`, shows errors via `InputForm.showError`, or calls `onSubmit` on success
  - Write `InputForm.reset()` — clears all fields to default empty state
  - Write `InputForm.showError(msg)` / `InputForm.clearError()` — renders/removes inline error message
  - _Requirements: 1.1, 1.3, 1.4, 1.5_

- [x] 9. Implement `AppController` and wire everything together in `js/app.js`
  - [x] 9.1 Write `AppController._recalculate()`
    - Derive `balance` and `categoryTotals` from the in-memory `transactions` array
    - Call `BalanceDisplay.update`, `TransactionList.render` (or `showEmpty`), and `ChartManager.update` (or `showEmpty`) in one pass
    - _Requirements: 4.2, 4.3, 5.2, 5.3, 9.2_
  - [x] 9.2 Write `AppController.addTransaction(name, amount, category)`
    - Generate id via `crypto.randomUUID()` with `Date.now()+Math.random()` fallback
    - Push to state array, call `Storage.save`, call `_recalculate`, call `InputForm.reset`
    - _Requirements: 1.2, 1.4, 6.1_
  - [x] 9.3 Write `AppController.deleteTransaction(id)`
    - Filter id from state array, call `Storage.save`, call `_recalculate`
    - _Requirements: 3.2, 6.2_
  - [x] 9.4 Write `AppController.init()`
    - Call `Storage.isAvailable()`; if unavailable show warning banner
    - Load transactions from `Storage.load()`, initialize all modules, call `_recalculate`
    - _Requirements: 6.3, 6.4, 2.2_
  - [x] 9.5 Bootstrap: call `AppController.init()` on `DOMContentLoaded`
    - _Requirements: 8.2, 9.1_

- [x] 10. Implement `MonthlySummary` module in `js/app.js`
  - Write `MonthlySummary.render(transactions)` — group transactions by "Month YYYY" using `timestamp`, display total amount and count per group
  - Write `MonthlySummary.show()` / `MonthlySummary.hide()` — toggle visibility of the summary section
  - Add a toggle button in `index.html` to show/hide the Monthly Summary view
  - WHEN transactions are added or deleted and the summary is visible, re-render it via `AppController._recalculate()`
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 11. Implement `SortControl` module in `js/app.js`
  - Add a sort `<select>` dropdown to `index.html` with options: Amount (Low→High), Amount (High→Low), Category (A–Z)
  - Write `SortControl.init(onChange)` — bind change listener, call `onChange` with the selected sort key
  - Write `SortControl.apply(transactions)` — return a sorted copy without mutating the original array
  - Wire into `AppController._recalculate()` so the list always re-renders with the active sort applied
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 12. Implement `ThemeManager` module in `js/app.js`
  - Write `ThemeManager.init()` — read `"ebv_theme"` from localStorage (default `"light"`), apply on boot
  - Write `ThemeManager.toggle()` — flip theme, persist to localStorage, call `ThemeManager.apply()`
  - Write `ThemeManager.apply(theme)` — add/remove `"dark"` class on `<body>`
  - Add CSS variables in `css/styles.css` for both light and dark themes; use `body.dark` selector overrides
  - Add a Theme_Toggle button in `index.html`
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 13. Final checkpoint — open `index.html` in Chrome, Firefox, Edge, and Safari
  - Verify add/delete flow, balance updates, chart updates, and localStorage persistence across page reloads
  - Verify monthly summary groups correctly and updates on add/delete
  - Verify sort options reorder the list without affecting stored data
  - Verify dark/light toggle applies immediately and persists across reloads
  - Ensure all interactive controls meet 44×44 px touch target size
  - Ensure no horizontal scrolling at 320px viewport width
  - _Requirements: 8.6, 7.1, 7.3, 9.1, 9.2, 10.5, 11.4, 12.2_

## Notes

- No test setup is required (NFR-1); all verification is done by opening `index.html` directly in a browser
- Tasks build incrementally — Storage and Validator have no DOM dependencies and should be implemented first
- `AppController._recalculate` is the single update path; all state mutations must go through it
- Derived state (balance, categoryTotals, monthly groups) is never stored — always recomputed from the transactions array
- Sort order is view-only; never persisted to localStorage
- Theme preference is persisted under key `"ebv_theme"`
