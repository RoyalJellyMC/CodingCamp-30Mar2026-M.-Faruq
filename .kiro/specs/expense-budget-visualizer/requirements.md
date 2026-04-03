# Requirements Document

## Introduction

A mobile-friendly web app that helps users track daily spending. The app displays a running total balance, a scrollable transaction history, and a pie chart visualizing spending by category. It is built as a single HTML page using vanilla JavaScript with no backend — all data is persisted in the browser's Local Storage. The app must work on modern desktop and mobile browsers and require no installation or setup.

## Glossary

- **App**: The Expense & Budget Visualizer web application.
- **Transaction**: A single spending record consisting of an item name, a monetary amount, and a category.
- **Category**: One of three predefined spending groups: Food, Transport, or Fun.
- **Balance**: The running total of all transaction amounts currently stored.
- **Transaction_List**: The scrollable UI component that displays all stored transactions.
- **Input_Form**: The UI component that accepts user input to create a new transaction.
- **Chart**: The pie chart component that visualizes spending distribution by category.
- **Storage**: The browser's Local Storage API used to persist transaction data client-side.
- **Validator**: The logic component responsible for checking that all required input fields are filled before submission.
- **Monthly_Summary**: A view that groups and totals transactions by calendar month.
- **Sort_Control**: The UI control that changes the display order of the Transaction_List.
- **Theme_Toggle**: The UI control that switches between dark and light color schemes.

## Requirements

### Requirement 1: Add a Transaction

**User Story:** As a user, I want to fill in a form with an item name, amount, and category so that I can record a new spending transaction.

#### Acceptance Criteria

1. THE Input_Form SHALL provide a text field for item name, a numeric field for amount, and a dropdown selector for category containing the options Food, Transport, and Fun.
2. WHEN the user submits the Input_Form with all fields filled, THE App SHALL add the transaction to the Transaction_List and update the Balance and Chart.
3. WHEN the user submits the Input_Form with one or more empty fields, THE Validator SHALL prevent submission and display an inline error message identifying the missing field(s).
4. WHEN a transaction is successfully added, THE Input_Form SHALL reset all fields to their default empty state.
5. WHEN the user enters a non-positive or non-numeric value in the amount field, THE Validator SHALL prevent submission and display an error message indicating a valid positive number is required.

---

### Requirement 2: Display Transaction List

**User Story:** As a user, I want to see a scrollable list of all my transactions so that I can review my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display each transaction's item name, amount, and category.
2. WHILE transactions exist in Storage, THE Transaction_List SHALL render all stored transactions on page load.
3. WHEN a new transaction is added, THE Transaction_List SHALL append the new entry without requiring a page reload.
4. THE Transaction_List SHALL be scrollable when the number of entries exceeds the visible viewport height.

---

### Requirement 3: Delete a Transaction

**User Story:** As a user, I want to delete a transaction from the list so that I can correct mistakes or remove unwanted entries.

#### Acceptance Criteria

1. THE Transaction_List SHALL display a delete control for each transaction entry.
2. WHEN the user activates the delete control for a transaction, THE App SHALL remove that transaction from Storage, the Transaction_List, the Balance, and the Chart.
3. WHEN the last transaction is deleted, THE Transaction_List SHALL display an empty state message indicating no transactions exist.

---

### Requirement 4: Display Total Balance

**User Story:** As a user, I want to see my total balance at the top of the page so that I always know my cumulative spending at a glance.

#### Acceptance Criteria

1. THE App SHALL display the Balance at the top of the page at all times.
2. WHEN a transaction is added, THE App SHALL recalculate and update the Balance immediately without a page reload.
3. WHEN a transaction is deleted, THE App SHALL recalculate and update the Balance immediately without a page reload.
4. WHILE no transactions exist, THE App SHALL display a Balance of 0.

---

### Requirement 5: Visualize Spending by Category

**User Story:** As a user, I want to see a pie chart of my spending by category so that I can understand where my money is going.

#### Acceptance Criteria

1. THE Chart SHALL render a pie chart showing the proportional spending for each category (Food, Transport, Fun) using Chart.js.
2. WHEN a transaction is added, THE Chart SHALL update to reflect the new category totals without a page reload.
3. WHEN a transaction is deleted, THE Chart SHALL update to reflect the revised category totals without a page reload.
4. WHILE no transactions exist, THE Chart SHALL display a placeholder or empty state indicating no data is available.
5. THE Chart SHALL display a legend identifying each category and its corresponding color.

---

### Requirement 6: Persist Data in Local Storage

**User Story:** As a user, I want my transactions to be saved between sessions so that I do not lose my data when I close or refresh the browser.

#### Acceptance Criteria

1. WHEN a transaction is added, THE Storage SHALL persist the updated transaction list to the browser's Local Storage immediately.
2. WHEN a transaction is deleted, THE Storage SHALL persist the updated transaction list to the browser's Local Storage immediately.
3. WHEN the App loads, THE App SHALL read all transactions from Local Storage and restore the Transaction_List, Balance, and Chart to their last saved state.
4. IF Local Storage is unavailable or returns a parse error, THEN THE App SHALL initialize with an empty transaction list and display a warning message to the user.

---

### Requirement 7: Mobile-Friendly Layout

**User Story:** As a user on a mobile device, I want the app to be usable on a small screen so that I can track spending on the go.

#### Acceptance Criteria

1. THE App SHALL use a responsive layout that adapts to screen widths from 320px to 1920px without horizontal scrolling.
2. THE Input_Form, Transaction_List, Balance, and Chart SHALL each remain fully visible and operable on a 375px wide viewport.
3. THE App SHALL use touch-friendly tap targets with a minimum size of 44x44 CSS pixels for all interactive controls.

---

### Requirement 8: Technology and File Structure Constraints

**User Story:** As a developer, I want the app to use only HTML, CSS, and vanilla JavaScript so that it requires no build tools, frameworks, or server.

#### Acceptance Criteria

1. THE App SHALL be implemented using HTML, CSS, and vanilla JavaScript with no frontend frameworks (e.g., React, Vue, Angular).
2. THE App SHALL require no backend server and SHALL be runnable by opening a single HTML file in a browser.
3. THE App SHALL load Chart.js from a CDN reference within the HTML file.
4. THE App SHALL contain exactly one CSS file located at `css/styles.css`.
5. THE App SHALL contain exactly one JavaScript file located at `js/app.js`.
6. THE App SHALL function correctly in current stable releases of Chrome, Firefox, Edge, and Safari.

---

### Requirement 10: Monthly Summary View

**User Story:** As a user, I want to see my transactions grouped by month so that I can understand my spending trends over time.

#### Acceptance Criteria

1. THE App SHALL provide a Monthly_Summary view that groups all transactions by calendar month (e.g., "March 2026").
2. THE Monthly_Summary SHALL display the total amount spent per month.
3. THE Monthly_Summary SHALL display the number of transactions per month.
4. WHEN the user navigates to the Monthly_Summary view, THE App SHALL render it without a page reload.
5. WHEN transactions are added or deleted, THE Monthly_Summary SHALL reflect the updated totals if it is currently visible.

---

### Requirement 11: Sort Transactions

**User Story:** As a user, I want to sort my transaction list by amount or category so that I can find and compare entries more easily.

#### Acceptance Criteria

1. THE App SHALL provide a Sort_Control that allows the user to sort the Transaction_List by amount (ascending or descending) or by category (A–Z).
2. WHEN the user selects a sort option, THE Transaction_List SHALL re-render in the selected order without a page reload.
3. THE sort order SHALL apply to the currently displayed Transaction_List only and SHALL NOT alter the underlying stored data order.
4. WHEN a new transaction is added, THE Transaction_List SHALL re-render respecting the currently active sort order.

---

### Requirement 12: Dark/Light Mode Toggle

**User Story:** As a user, I want to switch between dark and light color schemes so that I can use the app comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE App SHALL provide a Theme_Toggle control that switches between a dark and a light color scheme.
2. WHEN the user activates the Theme_Toggle, THE App SHALL apply the selected theme to all visible UI components immediately without a page reload.
3. THE App SHALL persist the user's theme preference in Local Storage so that the selected theme is restored on the next page load.
4. THE App SHALL default to the light theme if no preference has been stored.
5. Both the dark and light themes SHALL maintain sufficient contrast between text and background to remain readable.

---

### Requirement 9: Performance and Visual Design

**User Story:** As a user, I want the app to load quickly and look clean so that using it feels effortless.

#### Acceptance Criteria

1. THE App SHALL render the initial page, including all stored transactions, within 2 seconds on a standard broadband connection.
2. WHEN the user interacts with the Input_Form, Transaction_List, or Chart, THE App SHALL reflect the change in the UI within 100 milliseconds.
3. THE App SHALL apply a consistent visual hierarchy with distinct typographic styles for the Balance, transaction entries, and form labels.
4. THE App SHALL use a color scheme that provides sufficient contrast between text and background to remain readable in typical lighting conditions.
