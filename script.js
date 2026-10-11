// Global Data
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let monthlyBudget = parseFloat(localStorage.getItem('monthlyBudget')) || 0;
let categoryChart, trendChart;
let isEditing = false; // Track edit mode

// Allocation Percentages — Editable by User
let allocationPcts = {
    savings: 3,
    food: 5,
    transport: 10,
    bills: 40,
    shopping: 15,
    entertainment: 7,
    other: 20
};

// DOM Elements
const form = document.getElementById('transaction-form');
const list = document.getElementById('transaction-list');
const searchInput = document.getElementById('search-input');
const filterType = document.getElementById('filter-type');
const setBudgetBtn = document.getElementById('set-budget-btn');
const clearAllBtn = document.getElementById('clear-all-btn');
const toggleEditBtn = document.getElementById('toggle-edit-btn');
const applyAllocationBtn = document.getElementById('apply-allocation-btn');
const setTotalBudgetBtn = document.getElementById('set-total-budget-btn');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    loadAllocationPcts();
    initCharts();
    renderAll();
    setDefaultDate();
    updateTotalPercentage();
    updateAllocatedAmounts(); // Show calculated amounts if budget exists
    
    // Auto-update total percentage & amounts when editing
    document.querySelectorAll('.alloc-row input').forEach(input => {
        input.addEventListener('input', () => {
            updateTotalPercentage();
            updateAllocatedAmounts();
        });
    });
});

function setDefaultDate() {
    document.getElementById('date').valueAsDate = new Date();
}

// Load saved percentages
function loadAllocationPcts() {
    const saved = localStorage.getItem('allocationPcts');
    if (saved) {
        allocationPcts = JSON.parse(saved);
    }
    Object.keys(allocationPcts).forEach(key => {
        const el = document.getElementById(`pct-${key}`);
        if (el) el.value = allocationPcts[key];
    });
}

// 🆕 Toggle Edit Mode
toggleEditBtn.addEventListener('click', () => {
    isEditing = !isEditing;
    
    document.querySelectorAll('.alloc-row input').forEach(input => {
        input.disabled = !isEditing;
    });
    
    toggleEditBtn.textContent = isEditing ? '💾 Save' : '✏️ Edit';
    toggleEditBtn.classList.toggle('success', isEditing);
    toggleEditBtn.classList.toggle('secondary', !isEditing);
    
    if (!isEditing) {
        // Save when exiting edit mode
        Object.keys(allocationPcts).forEach(key => {
            const val = parseFloat(document.getElementById(`pct-${key}`).value) || 0;
            allocationPcts[key] = val;
        });
        localStorage.setItem('allocationPcts', JSON.stringify(allocationPcts));
        updateAllocatedAmounts();
    }
});

// Update total percentage display
function updateTotalPercentage() {
    let total = 0;
    Object.keys(allocationPcts).forEach(key => {
        const val = parseFloat(document.getElementById(`pct-${key}`).value) || 0;
        total += val;
        allocationPcts[key] = val;
    });
    document.getElementById('total-pct').textContent = `${total.toFixed(1)}%`;
    
    const totalEl = document.getElementById('total-pct');
    if (Math.abs(total - 100) > 0.5) {
        totalEl.style.color = 'var(--warning)';
    } else {
        totalEl.style.color = 'var(--success)';
    }
}

// 🆕 Update calculated amounts next to each percentage
function updateAllocatedAmounts() {
    const totalBudget = parseFloat(document.getElementById('alloc-total-budget').value) || 0;
    if (totalBudget <= 0) {
        Object.keys(allocationPcts).forEach(key => {
            const el = document.getElementById(`amt-${key}`);
            if (el) el.textContent = '—';
        });
        return;
    }
    
    Object.keys(allocationPcts).forEach(key => {
        const amount = (totalBudget * allocationPcts[key]) / 100;
        const el = document.getElementById(`amt-${key}`);
        if (el) el.textContent = formatCurrency(amount);
    });
}

// Set Total Budget
setTotalBudgetBtn.addEventListener('click', () => {
    const budgetInput = parseFloat(document.getElementById('alloc-total-budget').value);
    if (!budgetInput || budgetInput <= 0) {
        alert('⚠️ Ilagay muna ang tamang halaga ng budget!');
        return;
    }
    updateAllocatedAmounts();
    alert(`✅ Kabuuang Budget: ${formatCurrency(budgetInput)} — makikita na ang halaga sa bawat kategorya!`);
});

// Apply Allocation
applyAllocationBtn.addEventListener('click', () => {
    const budgetInput = parseFloat(document.getElementById('alloc-total-budget').value);
    if (!budgetInput || budgetInput <= 0) {
        alert('⚠️ Ilagay muna ang Kabuuang Budget sa itaas bago mag-apply!');
        return;
    }

    // Save percentages
    localStorage.setItem('allocationPcts', JSON.stringify(allocationPcts));
    
    // Calculate breakdown
    const breakdown = {};
    Object.keys(allocationPcts).forEach(key => {
        breakdown[key] = (budgetInput * allocationPcts[key]) / 100;
    });

    localStorage.setItem('allocatedBreakdown', JSON.stringify(breakdown));
    renderBreakdown(breakdown);
    
    // Set main budget
    monthlyBudget = budgetInput;
    localStorage.setItem('monthlyBudget', monthlyBudget);
    updateBudgetUI();
    
    alert('✅ Budget allocation applied successfully!');
});

// Render breakdown
function renderBreakdown(breakdown) {
    const container = document.getElementById('breakdown-list');
    const display = document.getElementById('allocated-breakdown');
    
    const labels = {
        savings: 'Savings',
        food: 'Food',
        transport: 'Transportation',
        bills: 'Bills & Utilities',
        shopping: 'Shopping',
        entertainment: 'Entertainment',
        other: 'Other'
    };
    
    container.innerHTML = Object.keys(breakdown).map(key => `
        <div class="breakdown-item">
            <h4>${labels[key]}</h4>
            <p class="amount">${formatCurrency(breakdown[key])}</p>
            <p class="pct">${allocationPcts[key]}%</p>
        </div>
    `).join('');
    
    display.style.display = 'block';
}

// Original Budget Set — Still Works
setBudgetBtn.addEventListener('click', () => {
    const amount = parseFloat(document.getElementById('budget-amount').value);
    if (!amount || amount <= 0) {
        alert('Please enter a valid budget amount.');
        return;
    }
    monthlyBudget = amount;
    localStorage.setItem('monthlyBudget', monthlyBudget);
    document.getElementById('budget-amount').value = '';
    updateBudgetUI();
});

// Budget Remaining = Budget + Total Income - Total Expenses
function updateBudgetUI() {
    const totalInc = getTotalIncome();
    const totalExp = getTotalExpenses();
    const totalAvailable = monthlyBudget + totalInc;
    const remaining = totalAvailable - totalExp;
    const percentSpent = totalAvailable > 0 ? Math.min((totalExp / totalAvailable) * 100, 100) : 0;

    document.getElementById('budget-remaining').textContent = formatCurrency(remaining);
    document.getElementById('budget-progress').style.width = `${percentSpent}%`;
    
    const progressBar = document.getElementById('budget-progress');
    if (percentSpent >= 90) progressBar.style.background = 'var(--danger)';
    else if (percentSpent >= 70) progressBar.style.background = 'var(--warning)';
    else progressBar.style.background = 'var(--success)';

    const status = document.getElementById('budget-status');
    if (monthlyBudget === 0 && totalInc === 0) {
        status.textContent = 'Set your budget or add income to start tracking!';
    } else if (remaining < 0) {
        status.textContent = `⚠️ Overspent by ${formatCurrency(Math.abs(remaining))}`;
    } else {
        status.textContent = `${percentSpent.toFixed(1)}% used of total available funds`;
    }
}

// Add Transaction
form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const transaction = {
        id: Date.now(),
        desc: document.getElementById('desc').value.trim(),
        amount: parseFloat(document.getElementById('amount').value),
        type: document.getElementById('type').value,
        category: document.getElementById('category').value,
        date: document.getElementById('date').value
    };

    transactions.unshift(transaction);
    saveData();
    renderAll();
    form.reset();
    setDefaultDate();
});

// Render All
function renderAll() {
    renderTransactionList();
    updateSummary();
    updateBudgetUI();
    updateCharts();
    
    const savedBreakdown = localStorage.getItem('allocatedBreakdown');
    if (savedBreakdown) {
        renderBreakdown(JSON.parse(savedBreakdown));
    }
}

function renderTransactionList() {
    const search = searchInput.value.toLowerCase();
    const typeFilter = filterType.value;
    
    const filtered = transactions.filter(t => {
        const matchSearch = t.desc.toLowerCase().includes(search) || t.category.includes(search);
        const matchType = typeFilter === 'all' || t.type === typeFilter;
        return matchSearch && matchType;
    });

    list.innerHTML = filtered.map(t => `
        <tr class="${t.type === 'income' ? 'income-row' : 'expense-row'}">
            <td>${formatDate(t.date)}</td>
            <td>${escapeHtml(t.desc)}</td>
            <td>${capitalize(t.category)}</td>
            <td>${capitalize(t.type)}</td>
            <td class="${t.type === 'income' ? 'text-success' : 'text-danger'}">
                ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}
            </td>
            <td>
                <button class="btn danger delete-btn" onclick="deleteTrans(${t.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

searchInput.addEventListener('input', renderTransactionList);
filterType.addEventListener('change', renderTransactionList);

// Summary
function updateSummary() {
    const totalInc = getTotalIncome();
    const totalExp = getTotalExpenses();
    
    document.getElementById('total-income').textContent = formatCurrency(totalInc);
    document.getElementById('total-expenses').textContent = formatCurrency(totalExp);
    document.getElementById('balance').textContent = formatCurrency(totalInc - totalExp);
}

function getTotalIncome() {
    return transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
}

function getTotalExpenses() {
    return transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
}

// Delete & Clear
function deleteTrans(id) {
    if (confirm('Delete this transaction?')) {
        transactions = transactions.filter(t => t.id !== id);
        saveData();
        renderAll();
    }
}

clearAllBtn.addEventListener('click', () => {
    if (confirm('⚠️ Clear ALL transactions? This cannot be undone!')) {
        transactions = [];
        localStorage.removeItem('transactions');
        localStorage.removeItem('allocatedBreakdown');
        renderAll();
        document.getElementById('allocated-breakdown').style.display = 'none';
    }
});

// Charts
function initCharts() {
    const catCtx = document.getElementById('category-chart').getContext('2d');
    categoryChart = new Chart(catCtx, {
        type: 'doughnut',
        data: { labels: [], datasets: [{ data: [], backgroundColor: [
            '#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#8b5cf6','#64748b'
        ]}] },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });

    const trendCtx = document.getElementById('trend-chart').getContext('2d');
    trendChart = new Chart(trendCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [
                { label: 'Income', data: [], backgroundColor: '#16a34a' },
                { label: 'Expenses', data: [], backgroundColor: '#dc2626' }
            ]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });
}

function updateCharts() {
    const catTotals = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
        catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
    });
    categoryChart.data.labels = Object.keys(catTotals).map(capitalize);
    categoryChart.data.datasets[0].data = Object.values(catTotals);
    categoryChart.update();

    const monthGroups = {};
    transactions.forEach(t => {
        const month = new Date(t.date).toLocaleDateString('en-PH', {year:'numeric', month:'short'});
        if (!monthGroups[month]) monthGroups[month] = {income:0, expense:0};
        monthGroups[month][t.type] += t.amount;
    });

    const sortedMonths = Object.keys(monthGroups).sort((a,b) => new Date(a) - new Date(b));
    trendChart.data.labels = sortedMonths;
    trendChart.data.datasets[0].data = sortedMonths.map(m => monthGroups[m].income);
    trendChart.data.datasets[1].data = sortedMonths.map(m => monthGroups[m].expense);
    trendChart.update();
}

// Storage
function saveData() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

// Helpers
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-PH');
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}