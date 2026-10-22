"use strict";

        /* ========================================================
           GOODFUNDS — SINGLE-FILE DEMO APPLICATION
           All information is stored locally in this browser.
           No real financial transactions are performed.
        ======================================================== */

        const STORAGE_KEY = "goodfunds_complete_demo_v1";

        const defaultData = {
            user: { name: "Goodnews User", email: "user@example.com" },
            budget: 300000,
            available: 300000,
            savings: [
                { id: 1, name: "New Laptop", target: 300000, current: 80000 },
                { id: 2, name: "Travel Fund", target: 500000, current: 120000 }
            ],
            investments: [
                { id: 3, name: "Demo Stocks", invested: 100000, value: 110000 },
                { id: 4, name: "Demo Investment", invested: 50000, value: 55000 }
            ],
            expenses: [
                { id: 5, description: "Food", amount: 15000, category: "Food", date: "2026-10-01" },
                { id: 6, description: "Transport", amount: 8000, category: "Transport", date: "2026-10-02" },
                { id: 7, description: "Shopping", amount: 20000, category: "Shopping", date: "2026-10-04" },
                { id: 8, description: "Bills", amount: 12000, category: "Bills", date: "2026-10-05" }
            ],
            transfers: [],
            loans: [],
            notifications: true
        };

        function loadData() {
            try {
                const saved = localStorage.getItem(STORAGE_KEY);
                if (!saved) return structuredClone(defaultData);
                const parsed = JSON.parse(saved);
                return {
                    ...structuredClone(defaultData),
                    ...parsed,
                    user: { ...defaultData.user, ...(parsed.user || {}) }
                };
            } catch (error) {
                return structuredClone(defaultData);
            }
        }

        let data = loadData();
        let currentPage = "dashboard";
        let authMode = "login";
        let modalAction = null;
        let toastTimer = null;

        function saveData() {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        }

        function money(value) {
            return new Intl.NumberFormat("en-NG", {
                style: "currency",
                currency: "NGN",
                maximumFractionDigits: 2
            }).format(Number(value) || 0);
        }

        function numberValue(value) {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : 0;
        }

        function escapeHTML(value) {
            return String(value ?? "").replace(/[&<>"']/g, char => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            })[char]);
        }

        function toast(message) {
            const element = document.getElementById("toast");
            element.textContent = message;
            element.classList.add("show");
            clearTimeout(toastTimer);
            toastTimer = setTimeout(() => element.classList.remove("show"), 3000);
        }

        function totalExpenses() {
            return data.expenses.reduce((sum, item) => sum + item.amount, 0);
        }

        function totalSavings() {
            return data.savings.reduce((sum, item) => sum + item.current, 0);
        }

        function totalInvested() {
            return data.investments.reduce((sum, item) => sum + item.invested, 0);
        }

        function investmentValue() {
            return data.investments.reduce((sum, item) => sum + item.value, 0);
        }

        function totalLoanBalance() {
            return data.loans
                .filter(loan => loan.status === "Active")
                .reduce((sum, loan) => sum + loan.balance, 0);
        }

        function today() {
            return new Date().toISOString().slice(0, 10);
        }

        function pageHeader(title, description) {
            return `<h1 class="page-title">${title}</h1>
          <p class="page-subtitle">${description}</p>`;
        }

        function statCard(label, value, icon, note = "") {
            return `<div class="card">
    <div class="stat-top">
      <span class="stat-label">${label}</span>
      <span class="stat-icon">${icon}</span>
    </div>
    <div class="stat-value">${value}</div>
    <div class="stat-note">${note}</div>
  </div>`;
        }

        function emptyState(message) {
            return `<div class="empty">${message}</div>`;
        }

        function enterApp() {  showPage("dashboard"); }

        function showPage(page) {
            const validPages = ["dashboard", "banking", "savings", "investments", "loans", "transfers", "profile"];
            currentPage = validPages.includes(page) ? page : "dashboard";

            document.querySelectorAll(".nav-item[data-page], .bottom-nav button[data-page]")
                .forEach(button => button.classList.toggle("active", button.dataset.page === currentPage));

            const titles = {
                dashboard: "Dashboard",
                banking: "Banking",
                savings: "Savings",
                investments: "Investments",
                loans: "Loans",
                transfers: "Transfers",
                profile: "Profile & Settings"
            };

            document.getElementById("topbarTitle").textContent = titles[currentPage];
            document.getElementById("sidebar").classList.remove("open");
            renderPage();
        }

        function renderPage() {
            const content = document.getElementById("content");
            const pages = {
                dashboard: renderDashboard,
                banking: renderBanking,
                savings: renderSavings,
                investments: renderInvestments,
                loans: renderLoans,
                transfers: renderTransfers,
                profile: renderProfile
            };
            content.innerHTML = pages[currentPage]();
            updateUserLabels();
        }

        function updateUserLabels() {
            const name = data.user.name || "Goodnews User";
            document.getElementById("sidebarName").textContent = name;
            document.getElementById("sidebarAvatar").textContent = name.trim().charAt(0).toUpperCase() || "G";
            document.getElementById("topProfile").textContent = name.trim().charAt(0).toUpperCase() || "G";
        }

        /* ========================================================
           DASHBOARD
        ======================================================== */

        function renderDashboard() {
            const spent = totalExpenses();
            const budgetProgress = data.budget > 0 ? Math.min(100, spent / data.budget * 100) : 0;
            const recent = [...data.expenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
            const goal = data.savings[0];
            const goalProgress = goal && goal.target > 0 ? Math.min(100, goal.current / goal.target * 100) : 0;

            return `
    <div class="welcome">
      <h1>Welcome back, ${escapeHTML(data.user.name.split(" ")[0])} 👋</h1>
      <p>Here is your financial overview for today.</p>
    </div>

    <div class="grid stats">
      <div class="card balance-card">
        <div class="stat-top"><span class="stat-label">Available Balance</span><span class="stat-icon">₦</span></div>
        <div class="stat-value">${money(data.available)}</div>
        <div class="stat-note">Demo account balance</div>
      </div>
      ${statCard("Total Savings", money(totalSavings()), "♧", "Across your savings goals")}
      ${statCard("Investments Value", money(investmentValue()), "↗", `Invested: ${money(totalInvested())}`)}
      ${statCard("Active Loan Balance", money(totalLoanBalance()), "▣", "Outstanding demo loans")}
    </div>

    <h3 class="quick-title">Quick actions</h3>
    <div class="grid quick-actions">
      <button class="quick-action" data-go="transfers"><span class="stat-icon">⇄</span><strong>Send Money</strong></button>
      <button class="quick-action" data-go="banking"><span class="stat-icon">▣</span><strong>Banking</strong></button>
      <button class="quick-action" data-go="savings"><span class="stat-icon">♧</span><strong>Save Money</strong></button>
      <button class="quick-action" data-go="loans"><span class="stat-icon">₦</span><strong>Explore Loans</strong></button>
    </div>

    <div class="grid two-col">
      <section class="card">
        <div class="section-heading">
          <div><h3>Monthly Budget</h3><p>Track your spending</p></div>
          <button class="btn btn-outline btn-small" data-go="banking">Manage</button>
        </div>
        <div style="display:flex;justify-content:space-between;gap:12px;align-items:center">
          <div><div class="muted" style="font-size:11px">Total budget</div><strong style="font-size:22px">${money(data.budget)}</strong></div>
          <span class="pill">${budgetProgress.toFixed(0)}% used</span>
        </div>
        <div class="progress-track" style="margin-top:18px"><div class="progress-bar" style="width:${budgetProgress}%"></div></div>
        <div class="progress-line"><span class="muted">Spent: ${money(spent)}</span><strong>${money(Math.max(0, data.budget - spent))} left</strong></div>
        <div class="notice">Budget tracking is a planning tool; it does not move money from your account.</div>
      </section>

      <section class="card">
        <div class="section-heading">
          <div><h3>Savings Goal</h3><p>Your first goal</p></div>
          <button class="btn btn-outline btn-small" data-go="savings">View goals</button>
        </div>
        ${goal ? `
          <div style="font-size:15px;font-weight:800;margin:14px 0 6px">${escapeHTML(goal.name)}</div>
          <div class="progress-line"><span class="muted">${money(goal.current)} saved</span><strong>${money(goal.target)}</strong></div>
          <div class="progress-track"><div class="progress-bar" style="width:${goalProgress}%"></div></div>
          <p class="muted" style="font-size:11px;margin-top:12px">${goalProgress.toFixed(0)}% of your goal completed</p>
        ` : emptyState("Create a savings goal to get started.")}
      </section>
    </div>

    <section class="card" style="margin-top:20px">
      <div class="section-heading"><div><h3>Recent Expenses</h3><p>Your latest recorded expenses</p></div><button class="btn btn-outline btn-small" data-go="banking">View all</button></div>
      ${recent.length ? `
        <div class="table-wrap"><table>
          <thead><tr><th>DESCRIPTION</th><th>CATEGORY</th><th>DATE</th><th>AMOUNT</th></tr></thead>
          <tbody>${recent.map(item => `<tr>
            <td><strong>${escapeHTML(item.description)}</strong></td>
            <td>${escapeHTML(item.category)}</td>
            <td>${escapeHTML(item.date)}</td>
            <td class="red-text"><strong>−${money(item.amount)}</strong></td>
          </tr>`).join("")}</tbody>
        </table></div>
      ` : emptyState("No expenses recorded yet.")}
    </section>
  `;
        }

        /* ========================================================
           BANKING AND EXPENSE RECORDING
        ======================================================== */

        function renderBanking() {
            return `
    ${pageHeader("Banking & Budget", "Manage your demo balance, set your monthly budget and record expenses.")}
    <div class="grid stats">
      ${statCard("Available Balance", money(data.available), "₦", "Demo account")}
      ${statCard("Monthly Budget", money(data.budget), "▤", "Your planned spending limit")}
      ${statCard("Expenses Recorded", money(totalExpenses()), "↘", `${data.expenses.length} entries`)}
      ${statCard("Budget Remaining", money(Math.max(0, data.budget - totalExpenses())), "✓", "Based on recorded expenses")}
    </div>
    <div class="grid two-col">
      <section class="card">
        <div class="section-heading"><h3>Set Monthly Budget</h3></div>
        <form id="budgetForm">
          <div class="form-group"><label for="budgetAmount">Monthly budget (₦)</label><input id="budgetAmount" type="number" min="0" step="100" value="${data.budget}" required></div>
          <button class="btn" type="submit">Save Budget</button>
        </form>
        <div class="notice">Changing this budget only updates your planner; it does not affect your account balance.</div>
      </section>
      <section class="card">
        <div class="section-heading"><h3>Record an Expense</h3></div>
        <form id="expenseForm">
          <div class="form-group"><label for="expenseDescription">Description</label><input id="expenseDescription" required maxlength="80" placeholder="e.g. Groceries"></div>
          <div class="form-row">
            <div class="form-group"><label for="expenseAmount">Amount (₦)</label><input id="expenseAmount" type="number" min="1" step="0.01" required placeholder="5000"></div>
            <div class="form-group"><label for="expenseCategory">Category</label><select id="expenseCategory"><option>Food</option><option>Transport</option><option>Bills</option><option>Shopping</option><option>Education</option><option>Health</option><option>Other</option></select></div>
          </div>
          <div class="form-group"><label for="expenseDate">Date</label><input id="expenseDate" type="date" value="${today()}" required></div>
          <button class="btn" type="submit">Add Expense</button>
        </form>
      </section>
    </div>
    <section class="card" style="margin-top:20px">
      <div class="section-heading"><h3>Expense History</h3><span class="pill">${data.expenses.length} records</span></div>
      ${data.expenses.length ? `<div class="table-wrap"><table><thead><tr><th>DESCRIPTION</th><th>CATEGORY</th><th>DATE</th><th>AMOUNT</th><th>ACTION</th></tr></thead><tbody>
      ${[...data.expenses].sort((a, b) => b.date.localeCompare(a.date)).map(item => `<tr>
        <td><strong>${escapeHTML(item.description)}</strong></td><td>${escapeHTML(item.category)}</td><td>${escapeHTML(item.date)}</td>
        <td class="red-text"><strong>${money(item.amount)}</strong></td>
        <td><button class="btn btn-danger btn-small" data-delete-expense="${item.id}">Delete</button></td>
      </tr>`).join("")}
      </tbody></table></div>` : emptyState("No expenses recorded yet.")}
    </section>
  `;
        }

        /* ========================================================
           SAVINGS
        ======================================================== */

        function renderSavings() {
            return `
    ${pageHeader("Your Savings", "Create savings goals and track your progress. All amounts are demo records.")}
    <div class="grid stats">
      ${statCard("Total Saved", money(totalSavings()), "♧", "Across all goals")}
      ${statCard("Savings Goals", String(data.savings.length), "◎", "Goals you're tracking")}
      ${statCard("Total Targets", money(data.savings.reduce((s, g) => s + g.target, 0)), "⌖", "Combined goal targets")}
      ${statCard("Still to Save", money(data.savings.reduce((s, g) => s + Math.max(0, g.target - g.current), 0)), "↗", "Remaining across goals")}
    </div>
    <div class="grid two-col">
      <section class="card">
        <div class="section-heading"><h3>Create a Savings Goal</h3></div>
        <form id="savingsForm">
          <div class="form-group"><label for="goalName">Goal name</label><input id="goalName" maxlength="60" required placeholder="e.g. New Laptop"></div>
          <div class="form-row">
            <div class="form-group"><label for="goalTarget">Target (₦)</label><input id="goalTarget" type="number" min="1" required placeholder="300000"></div>
            <div class="form-group"><label for="goalCurrent">Already saved (₦)</label><input id="goalCurrent" type="number" min="0" value="0" required></div>
          </div>
          <button class="btn" type="submit">Create Goal</button>
        </form>
      </section>
      <section class="card">
        <div class="section-heading"><h3>Add to Savings Goal</h3></div>
        ${data.savings.length ? `<form id="addSavingsForm">
          <div class="form-group"><label for="savingsGoal">Choose goal</label><select id="savingsGoal">${data.savings.map(g => `<option value="${g.id}">${escapeHTML(g.name)}</option>`).join("")}</select></div>
          <div class="form-group"><label for="savingsAmount">Amount to record (₦)</label><input id="savingsAmount" type="number" min="1" step="0.01" required placeholder="10000"></div>
          <button class="btn" type="submit">Record Savings</button>
          <p class="muted" style="font-size:11px;line-height:1.6">This updates your demo savings record only. No money is transferred.</p>
        </form>` : emptyState("Create a goal first.")}
      </section>
    </div>
    <h3 class="quick-title">Your Goals</h3>
    <div class="grid page-grid">
      ${data.savings.map(g => {
                const progress = g.target > 0 ? Math.min(100, g.current / g.target * 100) : 0;
                return `<section class="card">
          <div class="section-heading"><span class="stat-icon">♧</span><button class="btn btn-danger btn-small" data-delete-goal="${g.id}">Delete</button></div>
          <h3 style="font-size:17px;margin:10px 0">${escapeHTML(g.name)}</h3>
          <div class="stat-value">${money(g.current)}</div>
          <div class="progress-line"><span class="muted">Target ${money(g.target)}</span><strong>${progress.toFixed(0)}%</strong></div>
          <div class="progress-track"><div class="progress-bar" style="width:${progress}%"></div></div>
          <p class="muted" style="font-size:11px;margin-bottom:0">${money(Math.max(0, g.target - g.current))} remaining</p>
        </section>`;
            }).join("")}
    </div>
    ${data.savings.length ? "" : emptyState("Your savings goals will appear here.")}
  `;
        }

        /* ========================================================
           INVESTMENTS
        ======================================================== */

        function renderInvestments() {
            const profit = investmentValue() - totalInvested();
            return `
    ${pageHeader("Investments", "Track hypothetical investments and their recorded values. These are not live market prices.")}
    <div class="grid stats">
      ${statCard("Total Invested", money(totalInvested()), "↗", "Recorded contributions")}
      ${statCard("Current Value", money(investmentValue()), "▥", "Your entered valuations")}
      ${statCard("Profit / Loss", money(profit), "⌁", "Based on entered values")}
      ${statCard("Investment Plans", String(data.investments.length), "▤", "Tracked investments")}
    </div>
    <div class="grid two-col">
      <section class="card">
        <div class="section-heading"><h3>Add an Investment</h3></div>
        <form id="investmentForm">
          <div class="form-group"><label for="investmentName">Investment name</label><input id="investmentName" maxlength="60" required placeholder="e.g. Stocks"></div>
          <div class="form-row">
            <div class="form-group"><label for="investmentAmount">Amount invested (₦)</label><input id="investmentAmount" type="number" min="1" step="0.01" required placeholder="100000"></div>
            <div class="form-group"><label for="investmentValue">Current value (₦)</label><input id="investmentValue" type="number" min="0" step="0.01" required placeholder="110000"></div>
          </div>
          <button class="btn" type="submit">Add Investment</button>
        </form>
        <div class="notice">GoodFunds demo does not execute trades or connect to investment providers.</div>
      </section>
      <section class="card">
        <div class="section-heading"><h3>Investment Summary</h3></div>
        <div class="progress-line"><span class="muted">Total contributions</span><strong>${money(totalInvested())}</strong></div>
        <div class="progress-line"><span class="muted">Recorded value</span><strong>${money(investmentValue())}</strong></div>
        <div class="progress-line"><span class="muted">Net change</span><strong class="${profit >= 0 ? 'green-text' : 'red-text'}">${profit >= 0 ? '+' : '−'}${money(Math.abs(profit))}</strong></div>
        <div class="notice">Investment returns can be negative. Past performance does not guarantee future results.</div>
      </section>
    </div>
    <section class="card" style="margin-top:20px">
      <div class="section-heading"><h3>Your Investments</h3></div>
      ${data.investments.length ? `<div class="table-wrap"><table><thead><tr><th>INVESTMENT</th><th>INVESTED</th><th>CURRENT VALUE</th><th>GAIN / LOSS</th><th>ACTION</th></tr></thead><tbody>
      ${data.investments.map(i => {
                const change = i.value - i.invested;
                return `<tr><td><strong>${escapeHTML(i.name)}</strong></td><td>${money(i.invested)}</td><td>${money(i.value)}</td><td class="${change >= 0 ? 'green-text' : 'red-text'}">${change >= 0 ? '+' : '−'}${money(Math.abs(change))}</td><td><button class="btn btn-danger btn-small" data-delete-investment="${i.id}">Delete</button></td></tr>`;
            }).join("")}
      </tbody></table></div>` : emptyState("Add an investment to start tracking it.")}
    </section>
  `;
        }

        /* ========================================================
           LOANS — CALCULATOR, APPLICATION, ACTIVE LOANS, HISTORY
        ======================================================== */

        function calculateLoan(amount, months) {
            const principal = Math.max(0, numberValue(amount));
            const period = Math.max(1, numberValue(months));
            const rate = 0.05; // Illustrative demo fee, not a real lender quote.
            const interest = principal * rate;
            const total = principal + interest;
            return {
                principal,
                months: period,
                interest,
                total,
                monthly: total / period
            };
        }

        function renderLoans() {
            const active = data.loans.filter(l => l.status === "Active");
            const paid = data.loans.filter(l => l.status === "Completed");
            const outstanding = totalLoanBalance();
            const totalBorrowed = data.loans.reduce((s, l) => s + l.amount, 0);
            const amount = Math.min(500000, Math.max(10000, numberValue(document.getElementById("loanAmount")?.value || 200000)));
            const months = numberValue(document.getElementById("loanMonths")?.value || 6);
            const calc = calculateLoan(amount, months);

            return `
    ${pageHeader("Loans", "Explore the demo loan calculator, review repayment estimates and track your loan records.")}
    <section class="loan-hero">
      <div style="font-size:11px;color:#d4f5e2;font-weight:800;letter-spacing:1.5px;margin-bottom:12px">GOODFUNDS LOANS</div>
      <h2>Move closer to your goals.</h2>
      <p>Use this demo calculator to estimate a loan and repayment plan. Approval, interest, eligibility and terms for a real loan would depend on a licensed lender.</p>
      <button class="btn" data-scroll-loan>Calculate a Loan ↓</button>
    </section>

    <div class="grid loan-metrics">
      ${statCard("Outstanding Balance", money(outstanding), "₦", "Active demo loans")}
      ${statCard("Total Loan Records", String(data.loans.length), "▤", "Active and completed")}
      ${statCard("Total Amount Recorded", money(totalBorrowed), "↗", "Demo applications")}
    </div>

    <div class="grid two-col" id="loanCalculator">
      <section class="card">
        <div class="section-heading"><div><h3>Loan Calculator</h3><p>Choose an amount and repayment period.</p></div><span class="stat-icon">₦</span></div>
        <form id="loanForm">
          <div class="form-group">
            <label for="loanAmount">Loan amount (₦)</label>
            <input id="loanAmount" type="number" min="10000" max="500000" step="1000" value="${amount}" required>
            <div class="progress-line"><span class="muted">₦10,000 minimum</span><span class="muted">₦500,000 maximum</span></div>
            <input class="range" id="loanRange" type="range" min="10000" max="500000" step="1000" value="${amount}" aria-label="Adjust loan amount">
          </div>
          <div class="form-group">
            <label for="loanMonths">Repayment period</label>
            <select id="loanMonths">
              <option value="3" ${months === 3 ? "selected" : ""}>3 months</option>
              <option value="6" ${months === 6 ? "selected" : ""}>6 months</option>
              <option value="9" ${months === 9 ? "selected" : ""}>9 months</option>
              <option value="12" ${months === 12 ? "selected" : ""}>12 months</option>
            </select>
          </div>
          <div class="notice">Illustrative calculation only: a flat 5% demo fee is used for demonstration and is not a real offer or APR.</div>
          <button class="btn btn-full" type="submit">Review Loan Application</button>
        </form>
      </section>

      <section class="card">
        <div class="section-heading"><div><h3>Repayment Estimate</h3><p>Updates when you change the loan amount.</p></div></div>
        <div class="calc-result" id="loanResults">
          <div class="result-line"><span class="muted">Loan amount</span><strong>${money(calc.principal)}</strong></div>
          <div class="result-line"><span class="muted">Demo fee (5%)</span><strong>${money(calc.interest)}</strong></div>
          <div class="result-line"><span class="muted">Repayment period</span><strong>${calc.months} months</strong></div>
          <div class="result-line total"><span>Estimated monthly payment</span><strong>${money(calc.monthly)}</strong></div>
          <div class="result-line"><span class="muted">Total repayment</span><strong>${money(calc.total)}</strong></div>
        </div>
        <p class="muted" style="font-size:11px;line-height:1.7">Actual loan terms may include other charges, eligibility checks and different repayment schedules.</p>
      </section>
    </div>

    <h3 class="quick-title">Loan options</h3>
    <div class="grid loan-types">
      <div class="loan-type"><div class="type-icon">⌂</div><strong>Personal Loans</strong><p>For everyday personal needs.</p></div>
      <div class="loan-type"><div class="type-icon">▤</div><strong>Education Loans</strong><p>For education-related expenses.</p></div>
      <div class="loan-type"><div class="type-icon">⌑</div><strong>Car Loans</strong><p>Plan for vehicle expenses.</p></div>
      <div class="loan-type"><div class="type-icon">▣</div><strong>Business Loans</strong><p>Plan business funding needs.</p></div>
    </div>

    <section class="card" style="margin-top:22px">
      <div class="section-heading"><div><h3>Active Loans</h3><p>Applications accepted in this demo appear here.</p></div></div>
      ${active.length ? `<div class="table-wrap"><table><thead><tr><th>LOAN</th><th>AMOUNT</th><th>BALANCE</th><th>MONTHLY PAYMENT</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>
      ${active.map(l => `<tr>
        <td><strong>${escapeHTML(l.name)}</strong><br><small class="muted">${escapeHTML(l.date)}</small></td>
        <td>${money(l.amount)}</td><td>${money(l.balance)}</td><td>${money(l.monthly)}</td><td><span class="pill pending">Demo active</span></td>
        <td><button class="btn btn-small" data-repay-loan="${l.id}">Record payment</button></td>
      </tr>`).join("")}
      </tbody></table></div>` : emptyState("You have no active demo loans. Use the calculator above to create an application record.")}
    </section>

    <section class="card" style="margin-top:20px">
      <div class="section-heading"><h3>Loan History</h3></div>
      ${data.loans.length ? `<div class="table-wrap"><table><thead><tr><th>LOAN</th><th>AMOUNT</th><th>PERIOD</th><th>DATE</th><th>STATUS</th></tr></thead><tbody>
      ${[...data.loans].sort((a, b) => b.id - a.id).map(l => `<tr>
        <td><strong>${escapeHTML(l.name)}</strong></td><td>${money(l.amount)}</td><td>${l.months} months</td><td>${escapeHTML(l.date)}</td>
        <td><span class="pill ${l.status === "Completed" ? "" : "pending"}">${escapeHTML(l.status)}</span></td>
      </tr>`).join("")}
      </tbody></table></div>` : emptyState("Your loan history will appear here.")}
    </section>
  `;
        }

        function openLoanApplication() {
            const amount = numberValue(document.getElementById("loanAmount")?.value);
            const months = numberValue(document.getElementById("loanMonths")?.value);
            if (amount < 10000 || amount > 500000 || ![3, 6, 9, 12].includes(months)) {
                toast("Enter an amount between ₦10,000 and ₦500,000 and choose a valid repayment period.");
                return;
            }

            const calc = calculateLoan(amount, months);
            openModal(
                "Review demo loan application",
                "This records a sample application in your browser only. It does not submit a real loan request.",
                `<div class="calc-result">
      <div class="result-line"><span>Loan amount</span><strong>${money(calc.principal)}</strong></div>
      <div class="result-line"><span>Illustrative 5% fee</span><strong>${money(calc.interest)}</strong></div>
      <div class="result-line"><span>Repayment period</span><strong>${months} months</strong></div>
      <div class="result-line total"><span>Monthly estimate</span><strong>${money(calc.monthly)}</strong></div>
      <div class="result-line"><span>Total repayment estimate</span><strong>${money(calc.total)}</strong></div>
    </div>
    <div class="form-group"><label for="loanPurpose">Loan purpose</label><select id="loanPurpose"><option>Personal needs</option><option>Education</option><option>Car purchase</option><option>Business</option><option>Other</option></select></div>
    <div class="notice">Demo only. No credit check, approval, disbursement or real financial application will occur.</div>`,
                () => {
                    const purpose = document.getElementById("loanPurpose")?.value || "Personal needs";
                    const loan = {
                        id: Date.now(),
                        name: purpose,
                        amount: calc.principal,
                        balance: calc.total,
                        monthly: calc.monthly,
                        interest: calc.interest,
                        months,
                        date: today(),
                        status: "Active"
                    };
                    data.loans.push(loan);
                    saveData();
                    closeModal();
                    renderPage();
                    toast("Demo loan application record created.");
                },
                "Create demo record"
            );
        }

        /* ========================================================
           TRANSFERS — SIMULATED
        ======================================================== */

        function renderTransfers() {
            return `
    ${pageHeader("Transfers", "Create simulated transfer records. No real money will be sent or received.")}
    <div class="grid page-grid">
      <section class="card">
        <div class="section-heading"><div><h3>Send Money</h3><p>Demo transfer form</p></div><span class="stat-icon">⇄</span></div>
        <div class="calc-result"><div class="result-line"><span class="muted">Demo available balance</span><strong>${money(data.available)}</strong></div></div>
        <form id="transferForm">
          <div class="form-group"><label for="recipientName">Recipient name</label><input id="recipientName" maxlength="80" required placeholder="Recipient name"></div>
          <div class="form-group"><label for="recipientAccount">Recipient account / reference</label><input id="recipientAccount" maxlength="40" required placeholder="Demo reference only"></div>
          <div class="form-group"><label for="transferAmount">Amount (₦)</label><input id="transferAmount" type="number" min="1" step="0.01" required placeholder="10000"></div>
          <div class="form-group"><label for="transferNote">Description (optional)</label><input id="transferNote" maxlength="100" placeholder="What is this transfer for?"></div>
          <button class="btn btn-full" type="submit">Review Demo Transfer</button>
        </form>
        <div class="notice">This is not connected to a bank or payment provider. Never enter real banking credentials.</div>
      </section>
      <section class="card">
        <div class="section-heading"><h3>Transfer Activity</h3></div>
        ${data.transfers.length ? `<div class="table-wrap"><table><thead><tr><th>RECIPIENT</th><th>AMOUNT</th><th>DATE</th><th>STATUS</th></tr></thead><tbody>
          ${[...data.transfers].reverse().map(t => `<tr><td><strong>${escapeHTML(t.name)}</strong><br><small class="muted">${escapeHTML(t.reference)}</small></td><td>${money(t.amount)}</td><td>${escapeHTML(t.date)}</td><td><span class="pill pending">Demo only</span></td></tr>`).join("")}
        </tbody></table></div>` : emptyState("No demo transfers recorded.")}
      </section>
    </div>
  `;
        }

        function reviewTransfer() {
            const name = document.getElementById("recipientName").value.trim();
            const reference = document.getElementById("recipientAccount").value.trim();
            const amount = numberValue(document.getElementById("transferAmount").value);
            const note = document.getElementById("transferNote").value.trim();

            if (!name || !reference || amount <= 0) {
                toast("Complete the recipient details and enter a valid amount.");
                return;
            }
            if (amount > data.available) {
                toast("The demo balance is not enough for this transfer.");
                return;
            }

            openModal(
                "Review demo transfer",
                "Confirm that you want to add this simulated transfer to your local activity.",
                `<div class="calc-result">
      <div class="result-line"><span>Recipient</span><strong>${escapeHTML(name)}</strong></div>
      <div class="result-line"><span>Reference</span><strong>${escapeHTML(reference)}</strong></div>
      <div class="result-line"><span>Description</span><strong>${escapeHTML(note || "Not provided")}</strong></div>
      <div class="result-line total"><span>Amount</span><strong>${money(amount)}</strong></div>
    </div><div class="notice">This will only update your demo data in this browser; it will not send money.</div>`,
                () => {
                    data.transfers.push({
                        id: Date.now(), name, reference, amount, note,
                        date: today()
                    });
                    data.available -= amount;
                    saveData();
                    closeModal();
                    renderPage();
                    toast("Demo transfer recorded. No money was sent.");
                },
                "Record demo transfer"
            );
        }

        /* ========================================================
           PROFILE AND SETTINGS
        ======================================================== */

        function renderProfile() {
            return `
    ${pageHeader("Profile & Settings", "Manage your demo profile and local application preferences.")}
    <div class="grid page-grid">
      <section class="card">
        <div class="section-heading"><h3>Personal Information</h3><span class="stat-icon">♙</span></div>
        <form id="profileForm">
          <div class="form-group"><label for="profileName">Full name</label><input id="profileName" maxlength="80" required value="${escapeHTML(data.user.name)}"></div>
          <div class="form-group"><label for="profileEmail">Email address</label><input id="profileEmail" type="email" required value="${escapeHTML(data.user.email)}"></div>
          <button class="btn" type="submit">Save Profile</button>
        </form>
      </section>
      <section class="card">
        <div class="section-heading"><h3>Application Settings</h3><span class="stat-icon">⚙</span></div>
        <div class="progress-line"><span>Notifications</span><strong>${data.notifications ? "Enabled" : "Disabled"}</strong></div>
        <button class="btn btn-outline" id="toggleNotifications">${data.notifications ? "Turn off notifications" : "Turn on notifications"}</button>
        <div class="notice">These preferences are stored in this browser only. They do not change a bank account or external service.</div>
        <button class="btn btn-danger" id="resetDemo">Reset demo data</button>
      </section>
    </div>
    <section class="card" style="margin-top:20px">
      <h3 style="margin-top:0">About GoodFunds</h3>
      <p class="muted" style="font-size:12px;line-height:1.8">GoodFunds — Bank • Save • Invest • Grow. This standalone version is a frontend demonstration that stores sample information locally. It is not a licensed bank, lender or investment service, and it does not process real payments.</p>
      <div class="notice">Security note: never store passwords, BVN, NIN, card numbers or sensitive banking information in this demo.</div>
    </section>
  `;
        }

        /* ========================================================
           MODAL
        ======================================================== */

        function openModal(title, description, bodyHTML, onConfirm, confirmLabel = "Confirm") {
            document.getElementById("modalTitle").textContent = title;
            document.getElementById("modalDescription").textContent = description;
            document.getElementById("modalBody").innerHTML = bodyHTML;
            document.getElementById("modalConfirm").textContent = confirmLabel;
            modalAction = onConfirm;
            document.getElementById("modalBackdrop").classList.add("show");
        }

        function closeModal() {
            document.getElementById("modalBackdrop").classList.remove("show");
            document.getElementById("modalBody").innerHTML = "";
            modalAction = null;
        }

        document.getElementById("modalCancel").addEventListener("click", closeModal);
        document.getElementById("modalConfirm").addEventListener("click", () => {
            if (typeof modalAction === "function") modalAction();
        });
        document.getElementById("modalBackdrop").addEventListener("click", event => {
            if (event.target.id === "modalBackdrop") closeModal();
        });

        /* ========================================================
           APP-WIDE CLICK HANDLERS
        ======================================================== */

        document.addEventListener("click", event => {
            const nav = event.target.closest("[data-page]");
            if (nav) {
                showPage(nav.dataset.page);
                return;
            }

            const go = event.target.closest("[data-go]");
            if (go) {
                showPage(go.dataset.go);
                return;
            }

            if (event.target.closest("[data-scroll-loan]")) {
                document.getElementById("loanCalculator")?.scrollIntoView({ behavior: "smooth", block: "start" });
                return;
            }

            const expenseDelete = event.target.closest("[data-delete-expense]");
            if (expenseDelete) {
                const id = Number(expenseDelete.dataset.deleteExpense);
                openModal("Delete expense?", "This removes the selected entry from your local demo records.", "<div class='notice'>This action cannot be undone.</div>", () => {
                    data.expenses = data.expenses.filter(item => item.id !== id);
                    saveData(); closeModal(); renderPage(); toast("Expense deleted.");
                }, "Delete");
                return;
            }

            const goalDelete = event.target.closest("[data-delete-goal]");
            if (goalDelete) {
                const id = Number(goalDelete.dataset.deleteGoal);
                openModal("Delete savings goal?", "This removes the goal from your demo records.", "", () => {
                    data.savings = data.savings.filter(item => item.id !== id);
                    saveData(); closeModal(); renderPage(); toast("Savings goal deleted.");
                }, "Delete");
                return;
            }

            const investmentDelete = event.target.closest("[data-delete-investment]");
            if (investmentDelete) {
                const id = Number(investmentDelete.dataset.deleteInvestment);
                openModal("Delete investment?", "This removes the investment record from the demo.", "", () => {
                    data.investments = data.investments.filter(item => item.id !== id);
                    saveData(); closeModal(); renderPage(); toast("Investment record deleted.");
                }, "Delete");
                return;
            }

            const repay = event.target.closest("[data-repay-loan]");
            if (repay) {
                const id = Number(repay.dataset.repayLoan);
                const loan = data.loans.find(l => l.id === id);
                if (!loan) return;

                const payment = Math.min(loan.monthly, loan.balance);
                openModal(
                    "Record a demo loan payment?",
                    "This only changes your local loan record. No payment is taken from a bank account.",
                    `<div class="calc-result">
        <div class="result-line"><span>Current balance</span><strong>${money(loan.balance)}</strong></div>
        <div class="result-line"><span>Illustrative payment</span><strong>${money(payment)}</strong></div>
        <div class="result-line total"><span>Remaining balance</span><strong>${money(Math.max(0, loan.balance - payment))}</strong></div>
      </div>`,
                    () => {
                        loan.balance = Math.max(0, loan.balance - payment);
                        if (loan.balance < 0.01) {
                            loan.balance = 0;
                            loan.status = "Completed";
                        }
                        saveData(); closeModal(); renderPage(); toast("Demo loan payment recorded.");
                    },
                    "Record payment"
                );
            }
        });

        document.getElementById("menuButton").addEventListener("click", () => {
            document.getElementById("sidebar").classList.toggle("open");
        });

        document.getElementById("topProfile").addEventListener("click", () => showPage("profile"));

        document.getElementById("notificationButton").addEventListener("click", () => {
            toast(data.notifications ? "No new notifications." : "Notifications are turned off.");
        });

        /* ========================================================
           FORM HANDLERS
        ======================================================== */

        document.addEventListener("submit", event => {
            const form = event.target;
            event.preventDefault();

            if (form.id === "budgetForm") {
                const budget = numberValue(document.getElementById("budgetAmount").value);
                if (budget < 0) return toast("Budget cannot be negative.");
                data.budget = budget;
                saveData(); renderPage(); toast("Monthly budget saved.");
            }

            if (form.id === "expenseForm") {
                const description = document.getElementById("expenseDescription").value.trim();
                const amount = numberValue(document.getElementById("expenseAmount").value);
                const category = document.getElementById("expenseCategory").value;
                const date = document.getElementById("expenseDate").value;
                if (!description || amount <= 0 || !date) return toast("Enter a description, valid amount and date.");
                data.expenses.push({ id: Date.now(), description, amount, category, date });
                saveData(); renderPage(); toast("Expense recorded.");
            }

            if (form.id === "savingsForm") {
                const name = document.getElementById("goalName").value.trim();
                const target = numberValue(document.getElementById("goalTarget").value);
                const current = numberValue(document.getElementById("goalCurrent").value);
                if (!name || target <= 0 || current < 0) return toast("Enter a valid goal name and amounts.");
                data.savings.push({ id: Date.now(), name, target, current });
                saveData(); renderPage(); toast("Savings goal created.");
            }

            if (form.id === "addSavingsForm") {
                const id = Number(document.getElementById("savingsGoal").value);
                const amount = numberValue(document.getElementById("savingsAmount").value);
                const goal = data.savings.find(g => g.id === id);
                if (!goal || amount <= 0) return toast("Choose a goal and enter a valid amount.");
                goal.current += amount;
                saveData(); renderPage(); toast("Savings record updated.");
            }

            if (form.id === "investmentForm") {
                const name = document.getElementById("investmentName").value.trim();
                const invested = numberValue(document.getElementById("investmentAmount").value);
                const value = numberValue(document.getElementById("investmentValue").value);
                if (!name || invested <= 0 || value < 0) return toast("Enter a name and valid amounts.");
                data.investments.push({ id: Date.now(), name, invested, value });
                saveData(); renderPage(); toast("Investment record added.");
            }

            if (form.id === "loanForm") {
                openLoanApplication();
            }

            if (form.id === "transferForm") {
                reviewTransfer();
            }

            if (form.id === "profileForm") {
                const name = document.getElementById("profileName").value.trim();
                const email = document.getElementById("profileEmail").value.trim();
                if (!name || !email) return toast("Enter a valid name and email.");
                data.user.name = name;
                data.user.email = email;
                saveData(); renderPage(); toast("Profile saved.");
            }
        });

        /* ========================================================
           LOAN CALCULATOR LIVE UPDATES
        ======================================================== */

        document.addEventListener("input", event => {
            if (event.target.id === "loanRange") {
                const amount = document.getElementById("loanAmount");
                if (amount) amount.value = event.target.value;
                updateLoanResults();
            }

            if (event.target.id === "loanAmount") {
                const amount = numberValue(event.target.value);
                const range = document.getElementById("loanRange");
                if (range && amount >= 10000 && amount <= 500000) range.value = amount;
                updateLoanResults();
            }
        });

        document.addEventListener("change", event => {
            if (event.target.id === "loanMonths") updateLoanResults();
        });

        function updateLoanResults() {
            const amountElement = document.getElementById("loanAmount");
            const monthsElement = document.getElementById("loanMonths");
            const results = document.getElementById("loanResults");
            if (!amountElement || !monthsElement || !results) return;

            const amount = numberValue(amountElement.value);
            const months = numberValue(monthsElement.value);
            const calc = calculateLoan(amount, months);

            results.innerHTML = `
    <div class="result-line"><span class="muted">Loan amount</span><strong>${money(calc.principal)}</strong></div>
    <div class="result-line"><span class="muted">Demo fee (5%)</span><strong>${money(calc.interest)}</strong></div>
    <div class="result-line"><span class="muted">Repayment period</span><strong>${calc.months} months</strong></div>
    <div class="result-line total"><span>Estimated monthly payment</span><strong>${money(calc.monthly)}</strong></div>
    <div class="result-line"><span class="muted">Total repayment</span><strong>${money(calc.total)}</strong></div>
  `;
        }

        /* ========================================================
           PROFILE SETTINGS AND DEMO RESET
        ======================================================== */

        document.addEventListener("click", event => {
            if (event.target.id === "toggleNotifications") {
                data.notifications = !data.notifications;
                saveData(); renderPage();
                toast(data.notifications ? "Notifications enabled." : "Notifications disabled.");
            }

            if (event.target.id === "resetDemo") {
                openModal(
                    "Reset GoodFunds demo?",
                    "All locally saved demo changes will be deleted and the sample data restored.",
                    "<div class='notice'>Your demo expense entries, savings changes, transfers, investments and loan records will be reset.</div>",
                    () => {
                        data = structuredClone(defaultData);
                        saveData(); closeModal(); showPage("dashboard"); toast("Demo data reset.");
                    },
                    "Reset demo"
                );
            }
        });

        /* ========================================================
           START DASHBOARD
        ======================================================== */
        if (!sessionStorage.getItem("goodfundsToken")) {
            window.location.href = "login.html";
        } else {
            updateUserLabels();
            enterApp();
        }

