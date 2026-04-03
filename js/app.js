/**
 * Expense & Budget Visualizer — js/app.js
 *
 * Modules (added incrementally):
 *   Storage      — localStorage adapter (Task 3)
 *   Validator    — input validation (Task 4)
 *   BalanceDisplay — balance rendering (Task 5)
 *   TransactionList — list rendering (Task 6)
 *   ChartManager — Chart.js wrapper (Task 7)
 *   InputForm    — form handling (Task 8)
 *   AppController — orchestrator (Task 9)
 *   MonthlySummary — monthly grouping (Task 10)
 *   SortControl  — sort order (Task 11)
 *   ThemeManager — dark/light mode (Task 12)
 */

'use strict';

/* ─────────────────────────────────────────────
   Storage
   Adapter over localStorage with error handling.
   Keys:
     "ebv_transactions" — JSON array of Transaction objects
     "ebv_theme"        — "light" | "dark"
   ───────────────────────────────────────────── */
const Storage = {
  /**
   * Feature-detects localStorage availability.
   * Performs a test write/read/remove inside a try/catch so that
   * SecurityError (private mode) and QuotaExceededError are both caught.
   * @returns {boolean}
   */
  isAvailable() {
    try {
      const testKey = '__ebv_test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      return true;
    } catch (_) {
      return false;
    }
  },

  /**
   * Reads and parses the stored transaction list.
   * Returns an empty array when the key is missing or the value is
   * unparseable — never throws.
   * @returns {Transaction[]}
   */
  load() {
    try {
      const raw = localStorage.getItem('ebv_transactions');
      if (raw === null) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  },

  /**
   * Serialises the transaction array and writes it to localStorage.
   * Silently no-ops on any failure (quota exceeded, storage unavailable).
   * @param {Transaction[]} transactions
   */
  save(transactions) {
    try {
      localStorage.setItem('ebv_transactions', JSON.stringify(transactions));
    } catch (_) {
      // no-op — app continues in-memory only
    }
  },
};

/* ─────────────────────────────────────────────
   Validator
   Pure input validation — no DOM side-effects.
   ───────────────────────────────────────────── */
const Validator = {
  /**
   * Validates the three transaction fields.
   * @param {string} name
   * @param {*} amount
   * @param {string} category
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validate(name, amount, category) {
    const errors = [];

    // Validate name
    if (!name || String(name).trim() === '') {
      errors.push('Item name is required.');
    }

    // Validate category
    const validCategories = ['Food', 'Transport', 'Fun'];
    if (!category || !validCategories.includes(category)) {
      errors.push('Category is required.');
    }

    // Validate amount
    const num = Number(amount);
    if (amount === '' || amount === null || amount === undefined || isNaN(num)) {
      errors.push('Amount must be a valid number.');
    } else if (num <= 0) {
      errors.push('Amount must be a positive number greater than zero.');
    }

    return { valid: errors.length === 0, errors };
  },
};

/* ─────────────────────────────────────────────
   BalanceDisplay
   Single responsibility: keep the balance <span> in sync.
   Requirement: 4.1, 4.2, 4.3, 4.4
   ───────────────────────────────────────────── */
const BalanceDisplay = {
  /**
   * Formats total as USD currency and updates the balance element's text content.
   * Defaults to $0.00 when total is 0 or falsy.
   * @param {number} total
   */
  update(total) {
    const el = document.getElementById('balance-display');
    if (!el) return;
    const amount = typeof total === 'number' && isFinite(total) ? total : 0;
    el.textContent = amount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  },
};

/* ─────────────────────────────────────────────
   TransactionList
   Renders and manages the scrollable transaction list.
   Requirements: 2.1, 2.3, 3.1, 3.2, 3.3
   ───────────────────────────────────────────── */
const TransactionList = {
  /**
   * Binds a single delegated click listener on the list container.
   * Reads data-id from the clicked delete button and calls onDelete(id).
   * @param {function(string): void} onDelete
   */
  init(onDelete) {
    const container = document.getElementById('transaction-list');
    if (!container) return;
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.delete-btn');
      if (!btn) return;
      const id = btn.dataset.id;
      if (id) onDelete(id);
    });
  },

  /**
   * Full re-render: clears the container and appends one row per transaction.
   * Each row shows name, formatted amount, category, and a delete button.
   * Calls showEmpty() when the array is empty.
   * @param {Transaction[]} transactions
   */
  render(transactions) {
    const container = document.getElementById('transaction-list');
    if (!container) return;

    container.innerHTML = '';

    if (!transactions || transactions.length === 0) {
      this.showEmpty();
      return;
    }

    transactions.forEach((tx) => {
      const li = document.createElement('li');
      li.className = 'transaction-item';
      li.dataset.id = tx.id;

      const formattedAmount = (typeof tx.amount === 'number' ? tx.amount : 0)
        .toLocaleString('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

      li.innerHTML = `
        <span class="tx-name">${tx.name}</span>
        <span class="tx-amount">${formattedAmount}</span>
        <span class="tx-category">${tx.category}</span>
        <button class="delete-btn" type="button" data-id="${tx.id}" aria-label="Delete ${tx.name}">Delete</button>
      `;

      container.appendChild(li);
    });
  },

  /**
   * Renders an empty-state message when there are no transactions.
   */
  showEmpty() {
    const container = document.getElementById('transaction-list');
    if (!container) return;

    container.innerHTML = '';
    const li = document.createElement('li');
    li.className = 'transaction-empty';
    li.textContent = 'No transactions yet';
    container.appendChild(li);
  },
};

/* ─────────────────────────────────────────────
   ChartManager
   Thin wrapper around a Chart.js Pie instance.
   Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
   ───────────────────────────────────────────── */
const ChartManager = {
  /** @type {Chart|null} */
  _chart: null,

  /**
   * Creates the Chart.js pie instance on the given canvas.
   * Guards against window.Chart being undefined (CDN failure).
   * @param {string} canvasId
   */
  init(canvasId) {
    const container = document.querySelector('.chart-container');

    // Guard: Chart.js CDN may have failed to load
    if (typeof window.Chart === 'undefined') {
      if (container) {
        const errMsg = document.createElement('p');
        errMsg.className = 'chart-error';
        errMsg.textContent = 'Chart could not be loaded. Please check your internet connection.';
        container.appendChild(errMsg);
      }
      return;
    }

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    this._chart = new window.Chart(canvas, {
      type: 'pie',
      data: {
        labels: ['Food', 'Transport', 'Fun'],
        datasets: [
          {
            data: [0, 0, 0],
            backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
            borderColor: ['#FF6384', '#36A2EB', '#FFCE56'],
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
          },
        },
      },
    });

    // Show empty placeholder on initial render (no data yet)
    this.showEmpty();
  },

  /**
   * Updates the chart with new category totals and re-renders.
   * Hides the empty placeholder when there is data; shows it when all totals are zero.
   * @param {{ Food: number, Transport: number, Fun: number }} categoryTotals
   */
  update(categoryTotals) {
    if (!this._chart) return;

    const values = [
      categoryTotals.Food || 0,
      categoryTotals.Transport || 0,
      categoryTotals.Fun || 0,
    ];

    this._chart.data.datasets[0].data = values;
    this._chart.update();

    const hasData = values.some((v) => v > 0);
    if (hasData) {
      this._hideEmpty();
    } else {
      this.showEmpty();
    }
  },

  /**
   * Displays the no-data placeholder and hides the canvas.
   * Called when all category totals are zero.
   */
  showEmpty() {
    const emptyEl = document.getElementById('chart-empty');
    const canvas = this._chart ? this._chart.canvas : null;

    if (emptyEl) emptyEl.hidden = false;
    if (canvas) canvas.style.display = 'none';
  },

  /**
   * Hides the no-data placeholder and shows the canvas.
   * @private
   */
  _hideEmpty() {
    const emptyEl = document.getElementById('chart-empty');
    const canvas = this._chart ? this._chart.canvas : null;

    if (emptyEl) emptyEl.hidden = true;
    if (canvas) canvas.style.display = '';
  },
};

/* ─────────────────────────────────────────────
   InputForm
   Handles the add-transaction form: binding, validation,
   error display, and field reset.
   Requirements: 1.1, 1.3, 1.4, 1.5
   ───────────────────────────────────────────── */
const InputForm = {
  /**
   * Binds the form's submit event.
   * On submit: reads field values, calls Validator.validate,
   * shows errors via showError, or calls onSubmit(name, amount, category) on success.
   * @param {function(string, number, string): void} onSubmit
   */
  init(onSubmit) {
    const form = document.getElementById('transaction-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = (document.getElementById('item-name') || {}).value || '';
      const amountRaw = (document.getElementById('item-amount') || {}).value || '';
      const category = (document.getElementById('item-category') || {}).value || '';

      const { valid, errors } = Validator.validate(name, amountRaw, category);

      if (!valid) {
        this.showError(errors.join(' '));
        return;
      }

      this.clearError();
      onSubmit(name.trim(), Number(amountRaw), category);
    });
  },

  /**
   * Clears all form fields back to their default empty state.
   */
  reset() {
    const nameEl = document.getElementById('item-name');
    const amountEl = document.getElementById('item-amount');
    const categoryEl = document.getElementById('item-category');

    if (nameEl) nameEl.value = '';
    if (amountEl) amountEl.value = '';
    if (categoryEl) categoryEl.value = '';

    this.clearError();
  },

  /**
   * Displays an inline validation error message.
   * @param {string} msg
   */
  showError(msg) {
    const el = document.getElementById('form-error');
    if (!el) return;
    el.textContent = msg;
  },

  /**
   * Removes the inline validation error message.
   */
  clearError() {
    const el = document.getElementById('form-error');
    if (!el) return;
    el.textContent = '';
  },
};

/* ─────────────────────────────────────────────
   MonthlySummary
   Groups transactions by calendar month and renders totals.
   Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
   ───────────────────────────────────────────── */
const MonthlySummary = {
  /**
   * Groups transactions by "Month YYYY" using each transaction's timestamp,
   * then renders total amount and count per group into the summary content element.
   * Groups are displayed in reverse-chronological order (newest month first).
   * @param {Transaction[]} transactions
   */
  render(transactions) {
    const content = document.getElementById('monthly-summary-content');
    if (!content) return;

    content.innerHTML = '';

    if (!transactions || transactions.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'summary-empty';
      empty.textContent = 'No transactions yet';
      content.appendChild(empty);
      return;
    }

    // Group by "Month YYYY"
    const groups = {};
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    transactions.forEach((tx) => {
      const date = new Date(tx.timestamp);
      const key = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      if (!groups[key]) {
        groups[key] = { total: 0, count: 0, sortKey: tx.timestamp };
      }
      groups[key].total += tx.amount;
      groups[key].count += 1;
      // Keep the latest timestamp for sorting
      if (tx.timestamp > groups[key].sortKey) {
        groups[key].sortKey = tx.timestamp;
      }
    });

    // Sort groups newest-first
    const sortedKeys = Object.keys(groups).sort(
      (a, b) => groups[b].sortKey - groups[a].sortKey
    );

    sortedKeys.forEach((monthKey) => {
      const { total, count } = groups[monthKey];

      const formattedTotal = total.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      const row = document.createElement('div');
      row.className = 'summary-row';
      row.innerHTML = `
        <span class="summary-month">${monthKey}</span>
        <span class="summary-total">${formattedTotal}</span>
        <span class="summary-count">${count} transaction${count !== 1 ? 's' : ''}</span>
      `;
      content.appendChild(row);
    });
  },

  /**
   * Makes the monthly summary section visible.
   */
  show() {
    const section = document.getElementById('monthly-summary-section');
    if (section) section.hidden = false;
  },

  /**
   * Hides the monthly summary section.
   */
  hide() {
    const section = document.getElementById('monthly-summary-section');
    if (section) section.hidden = true;
  },
};

/* ─────────────────────────────────────────────
   SortControl
   Manages the active sort order for the Transaction_List.
   Requirements: 11.1, 11.2, 11.3, 11.4
   ───────────────────────────────────────────── */
const SortControl = {
  /** @type {string} */
  _active: 'default',

  /**
   * Binds a change listener on the sort select element.
   * Calls onChange() whenever the user selects a new sort option.
   * @param {function(): void} onChange
   */
  init(onChange) {
    const select = document.getElementById('sort-select');
    if (!select) return;
    select.addEventListener('change', () => {
      this._active = select.value;
      onChange();
    });
  },

  /**
   * Returns the currently active sort key.
   * @returns {"default"|"amount-asc"|"amount-desc"|"category-az"}
   */
  getActive() {
    return this._active;
  },

  /**
   * Returns a sorted copy of the transactions array based on the active sort key.
   * Does NOT mutate the original array.
   * "default" preserves insertion order (newest first by timestamp).
   * @param {Transaction[]} transactions
   * @returns {Transaction[]}
   */
  apply(transactions) {
    const copy = transactions.slice();
    switch (this._active) {
      case 'amount-asc':
        return copy.sort((a, b) => a.amount - b.amount);
      case 'amount-desc':
        return copy.sort((a, b) => b.amount - a.amount);
      case 'category-az':
        return copy.sort((a, b) => a.category.localeCompare(b.category));
      default:
        // "default" — newest first by timestamp
        return copy.sort((a, b) => b.timestamp - a.timestamp);
    }
  },
};

/* ─────────────────────────────────────────────
   ThemeManager
   Manages dark/light mode via a CSS class on <body>.
   Persists preference under key "ebv_theme".
   Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
   ───────────────────────────────────────────── */
const ThemeManager = {
  /**
   * Reads the saved theme from localStorage (default "light") and applies it.
   */
  init() {
    let theme = 'light';
    try {
      const stored = localStorage.getItem('ebv_theme');
      if (stored === 'dark' || stored === 'light') {
        theme = stored;
      }
    } catch (_) {
      // localStorage unavailable — fall back to light
    }
    this.apply(theme);
  },

  /**
   * Flips the current theme between "light" and "dark",
   * persists the new value to localStorage, and applies it.
   */
  toggle() {
    const isDark = document.body.classList.contains('dark');
    const next = isDark ? 'light' : 'dark';
    try {
      localStorage.setItem('ebv_theme', next);
    } catch (_) {
      // no-op if storage unavailable
    }
    this.apply(next);
  },

  /**
   * Adds or removes the "dark" class on <body> to activate the theme.
   * @param {"light"|"dark"} theme
   */
  apply(theme) {
    if (theme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  },
};

/* ─────────────────────────────────────────────
   AppController
   Orchestrates all components; owns the in-memory state array.
   Requirements: 1.2, 1.4, 2.2, 3.2, 4.2, 4.3, 5.2, 5.3, 6.1, 6.2, 6.3, 6.4, 8.2, 9.1, 9.2
   ───────────────────────────────────────────── */
const AppController = {
  /** @type {Transaction[]} */
  _transactions: [],

  /**
   * Recomputes balance and categoryTotals from the in-memory transactions array,
   * then pushes updates to all renderers in one pass.
   * Also re-renders MonthlySummary if visible, and applies SortControl ordering.
   */
  _recalculate() {
    const transactions = this._transactions;

    // Derive balance
    const balance = transactions.reduce((sum, t) => sum + t.amount, 0);

    // Derive categoryTotals
    const categoryTotals = transactions.reduce(
      (acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      },
      { Food: 0, Transport: 0, Fun: 0 }
    );

    // Update balance display
    BalanceDisplay.update(balance);

    // Apply sort if SortControl is available, then render list
    let displayList = transactions;
    if (typeof SortControl !== 'undefined' && typeof SortControl.apply === 'function') {
      displayList = SortControl.apply(transactions);
    }

    if (displayList.length === 0) {
      TransactionList.showEmpty();
    } else {
      TransactionList.render(displayList);
    }

    // Update chart
    const hasData = Object.values(categoryTotals).some((v) => v > 0);
    if (hasData) {
      ChartManager.update(categoryTotals);
    } else {
      ChartManager.showEmpty();
    }

    // Re-render MonthlySummary if it is currently visible (Task 10 stub)
    if (typeof MonthlySummary !== 'undefined' && typeof MonthlySummary.render === 'function') {
      const summarySection = document.getElementById('monthly-summary-section');
      if (summarySection && !summarySection.hidden) {
        MonthlySummary.render(transactions);
      }
    }
  },

  /**
   * Creates a new transaction, persists it, and updates all UI.
   * @param {string} name
   * @param {number} amount
   * @param {string} category
   */
  addTransaction(name, amount, category) {
    // Generate id — prefer crypto.randomUUID, fall back to Date.now + Math.random
    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : String(Date.now() + Math.random());

    /** @type {Transaction} */
    const transaction = {
      id,
      name: String(name).trim(),
      amount: Number(amount),
      category,
      timestamp: Date.now(),
    };

    this._transactions.push(transaction);
    Storage.save(this._transactions);
    this._recalculate();
    InputForm.reset();
  },

  /**
   * Removes a transaction by id, persists the change, and updates all UI.
   * @param {string} id
   */
  deleteTransaction(id) {
    this._transactions = this._transactions.filter((t) => t.id !== id);
    Storage.save(this._transactions);
    this._recalculate();
  },

  /**
   * Boot sequence: checks storage availability, loads persisted data,
   * initialises all modules, and triggers the first render.
   */
  init() {
    // Show warning banner if localStorage is unavailable
    if (!Storage.isAvailable()) {
      const banner = document.getElementById('storage-warning');
      if (banner) banner.hidden = false;
    }

    // Load persisted transactions
    this._transactions = Storage.load();

    // Initialise ThemeManager if available (Task 12 stub)
    if (typeof ThemeManager !== 'undefined' && typeof ThemeManager.init === 'function') {
      ThemeManager.init();
    }

    // Initialise chart
    ChartManager.init('spending-chart');

    // Initialise transaction list with delete handler
    TransactionList.init((id) => this.deleteTransaction(id));

    // Initialise input form with add handler
    InputForm.init((name, amount, category) =>
      this.addTransaction(name, amount, category)
    );

    // Initialise SortControl if available (Task 11 stub)
    if (typeof SortControl !== 'undefined' && typeof SortControl.init === 'function') {
      SortControl.init(() => this._recalculate());
    }

    // Wire monthly summary toggle if available (Task 10 stub)
    const summaryToggle = document.getElementById('monthly-summary-toggle');
    if (summaryToggle) {
      summaryToggle.addEventListener('click', () => {
        if (typeof MonthlySummary !== 'undefined') {
          const summarySection = document.getElementById('monthly-summary-section');
          if (summarySection && summarySection.hidden) {
            MonthlySummary.render(this._transactions);
            MonthlySummary.show();
            summaryToggle.textContent = 'Hide Monthly Summary';
          } else {
            MonthlySummary.hide();
            summaryToggle.textContent = 'Show Monthly Summary';
          }
        }
      });
    }

    // Wire theme toggle if available (Task 12 stub)
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        if (typeof ThemeManager !== 'undefined' && typeof ThemeManager.toggle === 'function') {
          ThemeManager.toggle();
        }
      });
    }

    // Initial render
    this._recalculate();
  },
};

/* ─────────────────────────────────────────────
   Bootstrap
   Kick off AppController.init() once the DOM is ready.
   Requirements: 8.2, 9.1
   ───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  AppController.init();
});
