import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue, remove, update, push } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAbVB5CcSGgtOY856Wv_nNdJP-z2oD3X_k",
  authDomain: "piscinaflorangel.firebaseapp.com",
  databaseURL: "https://piscinaflorangel-default-rtdb.firebaseio.com",
  projectId: "piscinaflorangel",
  storageBucket: "piscinaflorangel.firebasestorage.app",
  messagingSenderId: "305089524402",
  appId: "1:305089524402:web:2467f46840b9c981004fab"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// DOM Elements
const calendar = document.getElementById('calendar');
const monthYear = document.getElementById('monthYear');
const historyList = document.getElementById('historyList');
const searchInput = document.getElementById('searchInput');
const searchWrapper = document.getElementById('searchWrapper');
const statusFilter = document.getElementById('statusFilter');
const themeBtn = document.getElementById('themeToggle');

const resModal = document.getElementById('reservationModal');
const expModal = document.getElementById('expenseModal');

const dateInput = document.getElementById('selectedDate');
const customOrderInput = document.getElementById('customOrder');
const nameInput = document.getElementById('name');
const phoneInput = document.getElementById('phone');
const priceInput = document.getElementById('price');
const peopleInput = document.getElementById('people');
const timeInput = document.getElementById('time');
const statusInput = document.getElementById('status');
const statusText = document.getElementById('statusText');
const resForm = document.getElementById('reservationForm');

const expenseIdInput = document.getElementById('expenseId');
const expenseNameInput = document.getElementById('expenseName');
const expenseAmountInput = document.getElementById('expenseAmount');
const expenseForm = document.getElementById('expenseForm');
const btnDeleteExpense = document.getElementById('btnDeleteExpense');
const expensesList = document.getElementById('expensesList');

const dashboardSection = document.getElementById('dashboard-section');
const yearFilter = document.getElementById('yearFilter');
const monthIncomeEl = document.getElementById('monthIncome');
const yearIncomeEl = document.getElementById('yearIncome');
const totalIncomeEl = document.getElementById('totalIncome');

const realProfitEl = document.getElementById('realProfit');
const grossIncomeEl = document.getElementById('grossIncome');
const totalExpensesEl = document.getElementById('totalExpenses');
const totalMovementEl = document.getElementById('totalMovement');

let currentDate = new Date();
let bookings = {};
let expenses = {};
let barChartInstance = null;
let selectedDashboardYear = new Date().getFullYear();
let sortableInstance = null;

// --- SORTABLE JS (DRAG & DROP) ---
function initSortable() {
    if (sortableInstance) sortableInstance.destroy();
    
    const el = document.getElementById('historyList');
    if (!el) return;

    sortableInstance = new Sortable(el, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        dragClass: 'sortable-drag',
        delay: 150, 
        delayOnTouchOnly: true,
        onEnd: function (evt) {
            const items = el.querySelectorAll('.history-item');
            const updates = {};
            items.forEach((item, index) => {
                const dateKey = item.dataset.id;
                updates['bookings/' + dateKey + '/customOrder'] = index;
            });
            update(ref(db), updates);
        }
    });
}

// --- UI HELPERS ---
window.toggleCard = (el) => el.classList.toggle('active');

const toggleTheme = () => {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    themeBtn.querySelector('span').innerText = next === 'dark' ? 'light_mode' : 'dark_mode';
    localStorage.setItem('theme', next);
    updateDashboard(false);
};
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
themeBtn.querySelector('span').innerText = savedTheme === 'dark' ? 'light_mode' : 'dark_mode';
themeBtn.onclick = toggleTheme;

// --- FIREBASE LISTENERS ---
const bookingsRef = ref(db, 'bookings');
onValue(bookingsRef, (snapshot) => {
    bookings = snapshot.val() || {};
    refreshAllUI();
});

const expensesRef = ref(db, 'expenses');
onValue(expensesRef, (snapshot) => {
    expenses = snapshot.val() || {};
    // Renderizar gastos y recalcular finanzas
    renderExpensesList(); 
    calculateFinances();
});

function refreshAllUI() {
    renderCalendar();
    updateHistory();
    populateYearFilter();
    calculateFinances();
    if (window.getComputedStyle(dashboardSection).display !== 'none') {
        updateDashboard(false);
    }
}

// --- FINANZAS ---
function calculateFinances() {
    let totalGross = 0; let totalExp = 0;
    
    const b = bookings || {};
    const e = expenses || {};

    Object.values(b).forEach(item => { if (item.status === true) totalGross += (parseInt(item.price) || 0); });
    Object.values(e).forEach(item => { totalExp += (parseInt(item.amount) || 0); });
    
    const netProfit = totalGross - totalExp;
    const movement = totalGross + totalExp;

    grossIncomeEl.innerText = `$${totalGross.toLocaleString()}`;
    totalExpensesEl.innerText = `$${totalExp.toLocaleString()}`;
    realProfitEl.innerText = `$${netProfit.toLocaleString()}`;
    totalMovementEl.innerText = `$${movement.toLocaleString()}`;
    realProfitEl.style.color = netProfit < 0 ? 'var(--danger)' : 'var(--success)';
    
    updateDashboardKPIText();
}

function updateDashboardKPIText() {
    let total = 0, month = 0, yearVal = 0;
    const today = new Date();
    Object.keys(bookings).forEach(key => {
        const item = bookings[key];
        const price = parseInt(item.price) || 0;
        const d = new Date(key);
        if (item.status === true) total += price;
        if (d.getFullYear() === selectedDashboardYear) {
            if (item.status === true) {
                yearVal += price;
                if (d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()) month += price;
            }
        }
    });
    monthIncomeEl.innerText = `$${month.toLocaleString()}`;
    yearIncomeEl.innerText = `$${yearVal.toLocaleString()}`;
    totalIncomeEl.innerText = `$${total.toLocaleString()}`;
}

// --- HISTORIAL ---
statusFilter.addEventListener('change', (e) => {
    if (e.target.value === 'name') { searchWrapper.style.display = 'flex'; searchInput.focus(); } 
    else { searchWrapper.style.display = 'none'; searchInput.value = ""; }
    updateHistory();
});

function updateHistory() {
    historyList.innerHTML = "";
    const term = searchInput.value.toLowerCase();
    const type = statusFilter.value;
    const list = Object.keys(bookings).map(date => ({ date, ...bookings[date] }));
    
    const filtered = list.filter(item => {
        if (type === 'name') return item.name.toLowerCase().includes(term);
        if (type === 'paid') return item.status === true;
        if (type === 'pending') return item.status === false;
        return true;
    });

    filtered.sort((a, b) => {
        const orderA = (a.customOrder !== undefined) ? a.customOrder : 999999;
        const orderB = (b.customOrder !== undefined) ? b.customOrder : 999999;
        
        if (type === 'all') {
            if (orderA !== 999999 || orderB !== 999999) return orderA - orderB;
        }
        
        return new Date(a.date) - new Date(b.date);
    });

    if (filtered.length === 0) { historyList.innerHTML = "<div style='text-align:center; padding:20px; color:var(--text-muted);'>Sin registros.</div>"; return; }

    filtered.forEach(item => {
        const li = document.createElement('li');
        li.className = 'history-item';
        li.dataset.id = item.date; 
        
        const badgeClass = item.status ? 'status-paid' : 'status-pending';
        const badgeText = item.status ? 'LISTA' : 'ESPERA';
        li.innerHTML = `
            <div><strong>${item.name}</strong><small><span class="material-icons-round" style="font-size:14px">event</span> ${item.date}</small></div>
            <div style="text-align:right"><span class="badge-status ${badgeClass}">${badgeText}</span><div style="margin-top:5px; font-weight:700">$${parseInt(item.price).toLocaleString()}</div></div>
        `;
        li.addEventListener('click', (e) => {
             if(li.classList.contains('sortable-drag')) return;
             const parts = item.date.split('-'); 
             openBookingModal(item.date, new Date(parts[0], parts[1]-1, parts[2]));
        });
        historyList.appendChild(li);
    });

    if (type === 'all') {
        initSortable();
    } else if (sortableInstance) {
        sortableInstance.destroy();
        sortableInstance = null;
    }
}
searchInput.addEventListener('input', updateHistory);

// --- GASTOS (CORRECCIÓN DE FECHAS) ---
function renderExpensesList() {
    expensesList.innerHTML = "";
    
    // Función segura para obtener timestamp de fecha
    const getExpenseTime = (exp) => {
        // 1. Si tiene timestamp guardado, úsalo
        if (exp.timestamp) return exp.timestamp;
        
        // 2. Si es string "14/12/2025" o "14-12-2025"
        if (exp.date && (exp.date.includes('/') || exp.date.includes('-'))) {
            const sep = exp.date.includes('/') ? '/' : '-';
            const parts = exp.date.split(sep);
            // Asumimos formato DD/MM/YYYY
            if (parts.length === 3) {
                return new Date(parts[2], parts[1]-1, parts[0]).getTime();
            }
        }
        return 0; // Si falla, al final
    };

    const list = Object.keys(expenses).map(key => ({ id: key, ...expenses[key] }));
    
    // Ordenar: Más reciente primero
    list.sort((a, b) => getExpenseTime(b) - getExpenseTime(a));

    if (list.length === 0) {
        expensesList.innerHTML = "<p style='text-align:center; color:#888'>No hay gastos.</p>";
        return;
    }

    list.forEach(item => {
        const li = document.createElement('li');
        li.className = 'expense-item';
        li.innerHTML = `
            <div class="expense-info">
                <strong>${item.name}</strong>
                <span>📅 ${item.date}</span>
            </div>
            <div class="expense-amount">-$${parseInt(item.amount).toLocaleString()}</div>
        `;
        li.onclick = () => openExpenseModal(item);
        expensesList.appendChild(li);
    });
}

// --- GRAFICO ANIMADO FIX CELULAR ---
function updateDashboard(animate = false) {
    setTimeout(() => {
        let monthlyData = new Array(12).fill(0);
        Object.keys(bookings).forEach(key => {
            const item = bookings[key];
            const price = parseInt(item.price) || 0;
            const d = new Date(key);
            if (d.getFullYear() === selectedDashboardYear && item.status === true) {
                monthlyData[d.getMonth()] += price;
            }
        });

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
        const textColor = isDark ? '#a0a0a0' : '#64748b';

        const ctx = document.getElementById('barChart');
        if(!ctx) return; 

        if (barChartInstance) barChartInstance.destroy();
        
        barChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'],
                datasets: [{ label: 'Ingresos', data: monthlyData, backgroundColor: '#3a86ff', borderRadius: 4 }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, 
                plugins: { legend: { display: false } },
                scales: { y: { grid: { color: gridColor }, ticks: { color: textColor } }, x: { grid: { display: false }, ticks: { color: textColor } } },
                animation: animate ? { duration: 1500, easing: 'easeOutQuart' } : false
            }
        });
    }, 200);
}

statusInput.addEventListener('change', (e) => {
    statusText.innerText = e.target.checked ? "Pagada / Lista" : "Pendiente";
    statusText.style.color = e.target.checked ? "var(--success)" : "var(--danger)";
});

window.openBookingModal = (dateKey, dateObj) => {
    const today = new Date(); today.setHours(0,0,0,0);
    const checkDate = new Date(dateObj); checkDate.setHours(0,0,0,0);
    const exists = bookings[dateKey];

    if (checkDate < today && !exists) return alert("⛔ Fecha pasada.");

    resModal.style.display = "flex"; dateInput.value = dateKey;
    if (exists) {
        nameInput.value = exists.name; phoneInput.value = exists.phone; priceInput.value = exists.price;
        peopleInput.value = exists.people; timeInput.value = exists.time; statusInput.checked = exists.status === true;
        customOrderInput.value = exists.customOrder !== undefined ? exists.customOrder : "";
    } else {
        resForm.reset(); dateInput.value = dateKey; statusInput.checked = false; customOrderInput.value = "";
    }
    statusInput.dispatchEvent(new Event('change'));
}

window.openExpenseModal = (item = null) => {
    expModal.style.display = 'flex';
    if(item) { expenseIdInput.value = item.id; expenseNameInput.value = item.name; expenseAmountInput.value = item.amount; btnDeleteExpense.style.display='block'; } 
    else { expenseForm.reset(); expenseIdInput.value=""; btnDeleteExpense.style.display='none'; }
}

window.closeModalFunc = (id) => document.getElementById(id).style.display = 'none';
window.onclick = (e) => { if(e.target.classList.contains('modal-backdrop')) e.target.style.display = 'none'; }

// --- GUARDAR RESERVA (NUEVO PRIMERO EN ARRASTRAR) ---
resForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if(!/^[a-zA-Z\sñÑáéíóúÁÉÍÓÚ]+$/.test(nameInput.value)) return alert("Nombre: solo letras");
    if(phoneInput.value && !/^[0-9]+$/.test(phoneInput.value)) return alert("Teléfono: solo números");
    
    let currentOrder;
    if (customOrderInput.value !== "") {
        currentOrder = parseInt(customOrderInput.value);
    } else {
        // NUEVA RESERVA: Buscar el orden más bajo y restar 1 para que quede primera
        const allOrders = Object.values(bookings).map(b => b.customOrder).filter(o => o !== undefined);
        const min = allOrders.length > 0 ? Math.min(...allOrders) : 0;
        currentOrder = min - 1;
    }

    set(ref(db, 'bookings/' + dateInput.value), {
        name: nameInput.value, phone: phoneInput.value, price: priceInput.value,
        people: peopleInput.value, time: timeInput.value, status: statusInput.checked,
        customOrder: currentOrder 
    }).then(() => resModal.style.display = "none");
});

document.getElementById('btnDelete').onclick = () => {
    if(bookings[dateInput.value] && confirm("¿Borrar?")) remove(ref(db, 'bookings/'+dateInput.value)).then(()=>resModal.style.display="none");
};

// --- GUARDAR GASTO (CON TIMESTAMP) ---
expenseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = expenseIdInput.value;
    const todayStr = new Date().toLocaleDateString('es-CL');
    const timestamp = Date.now();

    const data = { 
        name: expenseNameInput.value, 
        amount: expenseAmountInput.value, 
        date: id ? expenses[id].date : todayStr,
        timestamp: id ? expenses[id].timestamp : timestamp // Guardamos timestamp
    };

    if(id) set(ref(db, 'expenses/'+id), data); else push(ref(db, 'expenses'), data);
    expModal.style.display='none';
});

btnDeleteExpense.onclick = () => {
    if(confirm("¿Borrar gasto?")) remove(ref(db, 'expenses/'+expenseIdInput.value)).then(()=>expModal.style.display='none');
};

function renderCalendar() {
    calendar.innerHTML = "";
    monthYear.innerText = new Date(currentDate).toLocaleString('es-ES', { month: 'long', year: 'numeric' });
    const year = currentDate.getFullYear(); const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date(); today.setHours(0,0,0,0);

    for(let i=0; i<offset; i++) calendar.appendChild(document.createElement('div'));
    
    for(let i=1; i<=daysInMonth; i++) {
        const div = document.createElement('div');
        div.className = 'day'; div.innerText = i;
        div.style.animationDelay = `${i*0.015}s`;
        const key = `${year}-${month + 1}-${i}`;
        const thisDate = new Date(year, month, i);
        if(thisDate < today) div.classList.add('past-day');
        if(bookings[key]) div.classList.add(bookings[key].status ? 'paid' : 'occupied');
        if(i === today.getDate() && month === today.getMonth()) div.classList.add('current-day');
        div.onclick = () => openBookingModal(key, thisDate);
        calendar.appendChild(div);
    }
}

function populateYearFilter() {
    const years = new Set([new Date().getFullYear()]);
    Object.keys(bookings).forEach(k => !isNaN(new Date(k)) && years.add(new Date(k).getFullYear()));
    const sorted = Array.from(years).sort((a,b)=>b-a);
    const curr = yearFilter.value; yearFilter.innerHTML = "";
    sorted.forEach(y => { const opt = document.createElement('option'); opt.value = y; opt.innerText = y; if(y === selectedDashboardYear) opt.selected = true; yearFilter.appendChild(opt); });
    if(curr && Array.from(yearFilter.options).some(o=>o.value===curr)) yearFilter.value=curr;
}

document.getElementById('prevMonth').onclick = () => { currentDate.setMonth(currentDate.getMonth()-1); renderCalendar(); };
document.getElementById('nextMonth').onclick = () => { currentDate.setMonth(currentDate.getMonth()+1); renderCalendar(); };
yearFilter.onchange = (e) => { selectedDashboardYear = parseInt(e.target.value); updateDashboardKPIText(); updateDashboard(true); };
window.goToSection = (id) => document.getElementById(id).scrollIntoView({behavior:'smooth'});

const observer = new IntersectionObserver((e) => { e.forEach(entry => { if(entry.isIntersecting) updateDashboard(true); }); }, {threshold:0.1});
observer.observe(dashboardSection);

renderCalendar();
