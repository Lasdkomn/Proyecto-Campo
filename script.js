// ==========================================
// 1. IMPORTACIONES Y CONFIGURACIÓN FIREBASE
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue, remove, push } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// TUS CREDENCIALES (Piscina Florangel)
const firebaseConfig = {
  apiKey: "AIzaSyAbVB5CcSGgtOY856Wv_nNdJP-z2oD3X_k",
  authDomain: "piscinaflorangel.firebaseapp.com",
  databaseURL: "https://piscinaflorangel-default-rtdb.firebaseio.com",
  projectId: "piscinaflorangel",
  storageBucket: "piscinaflorangel.firebasestorage.app",
  messagingSenderId: "305089524402",
  appId: "1:305089524402:web:2467f46840b9c981004fab"
};

// Inicializar App
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ==========================================
// 2. VARIABLES DEL DOM
// ==========================================
// Calendario y Listas
const calendar = document.getElementById('calendar');
const monthYear = document.getElementById('monthYear');
const historyList = document.getElementById('historyList');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');

// Modales
const resModal = document.getElementById('reservationModal');
const expModal = document.getElementById('expenseModal');

// Formulario Reservas
const dateInput = document.getElementById('selectedDate');
const nameInput = document.getElementById('name');
const phoneInput = document.getElementById('phone');
const priceInput = document.getElementById('price');
const peopleInput = document.getElementById('people');
const timeInput = document.getElementById('time');
const statusInput = document.getElementById('status'); 
const resForm = document.getElementById('reservationForm');

// Formulario Gastos
const expenseIdInput = document.getElementById('expenseId');
const expenseNameInput = document.getElementById('expenseName');
const expenseAmountInput = document.getElementById('expenseAmount');
const expenseForm = document.getElementById('expenseForm');
const btnDeleteExpense = document.getElementById('btnDeleteExpense');
const expensesList = document.getElementById('expensesList');

// Dashboard
const dashboardSection = document.getElementById('dashboard-section');
const yearFilter = document.getElementById('yearFilter');
const monthIncomeEl = document.getElementById('monthIncome');
const yearIncomeEl = document.getElementById('yearIncome');
const totalIncomeEl = document.getElementById('totalIncome');

// 4 CAJAS FINANCIERAS (Sección Gastos)
const realProfitEl = document.getElementById('realProfit'); // Ganancia Real
const grossIncomeEl = document.getElementById('grossIncome'); // Total Dinero
const totalExpensesEl = document.getElementById('totalExpenses'); // Gastos
const totalMovementEl = document.getElementById('totalMovement'); // Movimiento Total (Nuevo)

// Variables Globales
let currentDate = new Date();
let bookings = {}; 
let expenses = {}; 
let barChartInstance = null;
let pieChartInstance = null;
let selectedDashboardYear = new Date().getFullYear(); 

// ==========================================
// 3. CONEXIÓN REALTIME
// ==========================================

// A) Escuchar Reservas
const bookingsRef = ref(db, 'bookings');
onValue(bookingsRef, (snapshot) => {
    bookings = snapshot.val() || {}; 
    renderCalendar();
    updateHistory();
    populateYearFilter();
    calculateFinances(); 
});

// B) Escuchar Gastos
const expensesRef = ref(db, 'expenses');
onValue(expensesRef, (snapshot) => {
    expenses = snapshot.val() || {};
    renderExpensesList();
    calculateFinances(); 
});

// ==========================================
// 4. CÁLCULOS FINANCIEROS (4 RECUADROS)
// ==========================================
function calculateFinances() {
    let totalGrossIncome = 0; // Total Dinero (Ingreso Bruto)
    let totalExpenseSum = 0;  // Gastos Totales

    // 1. Sumar Reservas Pagadas
    Object.values(bookings).forEach(item => {
        if (item.status === true) {
            totalGrossIncome += (parseInt(item.price) || 0);
        }
    });

    // 2. Sumar Gastos
    Object.values(expenses).forEach(item => {
        totalExpenseSum += (parseInt(item.amount) || 0);
    });

    // 3. Calcular Ganancia Real (Bolsillo)
    const netProfit = totalGrossIncome - totalExpenseSum;

    // 4. Calcular Movimiento Total (Flujo total manejado)
    const totalMovement = totalGrossIncome + totalExpenseSum;

    // 5. Mostrar en pantalla
    grossIncomeEl.innerText = `$${totalGrossIncome.toLocaleString()}`; 
    totalExpensesEl.innerText = `$${totalExpenseSum.toLocaleString()}`; 
    realProfitEl.innerText = `$${netProfit.toLocaleString()}`; 
    totalMovementEl.innerText = `$${totalMovement.toLocaleString()}`; // Nuevo

    // Colores dinámicos
    if (netProfit < 0) {
        realProfitEl.style.color = '#c0392b'; // Rojo si hay pérdidas
    } else {
        realProfitEl.style.color = '#27ae60'; // Verde si hay ganancia
    }

    if (window.getComputedStyle(dashboardSection).display !== 'none') {
        updateDashboard(false);
    }
}

// ==========================================
// 5. HISTORIAL INTELIGENTE
// ==========================================

// Lógica para mostrar/ocultar buscador según la opción elegida
statusFilter.addEventListener('change', (e) => {
    if (e.target.value === 'name') {
        searchInput.style.display = 'block'; // Mostrar input
        searchInput.focus();
    } else {
        searchInput.style.display = 'none'; // Ocultar input
        searchInput.value = ""; // Limpiar texto al cambiar de modo
    }
    updateHistory();
});

function updateHistory() {
    historyList.innerHTML = "";
    const searchTerm = searchInput.value.toLowerCase();
    const filterType = statusFilter.value; // 'all', 'paid', 'pending', 'name'

    const listArray = Object.keys(bookings).map(date => ({ date, ...bookings[date] }));
    
    // 1. FILTRAR
    const filteredList = listArray.filter(item => {
        if (filterType === 'name') {
            return item.name.toLowerCase().includes(searchTerm);
        } else if (filterType === 'paid') {
            return item.status === true;
        } else if (filterType === 'pending') {
            return item.status === false; // o undefined
        }
        return true; // 'all' (Muestra todo)
    });

    // 2. ORDENAR CRONOLÓGICAMENTE (Por fecha de reserva)
    filteredList.sort((a, b) => new Date(a.date) - new Date(b.date));

    if (filteredList.length === 0) {
        historyList.innerHTML = "<p style='text-align:center; color:#888'>No hay reservas encontradas.</p>";
        return;
    }

    filteredList.forEach(item => {
        const li = document.createElement('li');
        li.classList.add('history-item');
        
        const statusIcon = item.status === true ? '✅ Lista' : '⏳ Espera';
        
        li.innerHTML = `
            <strong>${item.name} <span style="float:right; font-size:0.8em;">${statusIcon}</span></strong>
            <small>📞 ${item.phone || '-'}</small>
            <span>📅 ${item.date} | ⏰ ${item.time}</span><br>
            <span>👥 ${item.people} | 💰 $${item.price}</span>
        `;
        
        li.addEventListener('click', () => {
             const parts = item.date.split('-'); 
             const dateObj = new Date(parts[0], parts[1]-1, parts[2]);
             openBookingModal(item.date, dateObj);
        });
        historyList.appendChild(li);
    });
}

searchInput.addEventListener('input', updateHistory);

// ==========================================
// 6. GESTIÓN DE GASTOS
// ==========================================
function renderExpensesList() {
    expensesList.innerHTML = "";
    const listArray = Object.keys(expenses).map(key => ({ id: key, ...expenses[key] }));
    
    // Ordenar gastos: Lo más nuevo arriba
    listArray.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (listArray.length === 0) {
        expensesList.innerHTML = "<p style='text-align:center; color:#888'>No hay gastos.</p>";
        return;
    }

    listArray.forEach(item => {
        const li = document.createElement('li');
        li.classList.add('expense-item');
        li.innerHTML = `
            <div class="expense-info">
                <strong>${item.name}</strong>
                <span>📅 ${item.date}</span>
            </div>
            <div class="expense-amount">-$${parseInt(item.amount).toLocaleString()}</div>
        `;
        li.addEventListener('click', () => openExpenseModal(item));
        expensesList.appendChild(li);
    });
}

window.openExpenseModal = (item = null) => {
    expModal.style.display = 'flex';
    if (item) {
        expenseIdInput.value = item.id;
        expenseNameInput.value = item.name;
        expenseAmountInput.value = item.amount;
        btnDeleteExpense.style.display = 'block';
    } else {
        expenseForm.reset();
        expenseIdInput.value = "";
        btnDeleteExpense.style.display = 'none';
    }
}

expenseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = expenseIdInput.value;
    const todayStr = new Date().toLocaleDateString('es-CL');
    const data = { 
        name: expenseNameInput.value, 
        amount: expenseAmountInput.value, 
        date: id ? expenses[id].date : todayStr 
    };

    if (id) set(ref(db, 'expenses/' + id), data);
    else push(expensesRef, data);
    expModal.style.display = 'none';
});

btnDeleteExpense.addEventListener('click', () => {
    const id = expenseIdInput.value;
    if (id && confirm("¿Eliminar gasto?")) {
        remove(ref(db, 'expenses/' + id));
        expModal.style.display = 'none';
    }
});

// ==========================================
// 7. ANIMACIÓN DASHBOARD
// ==========================================
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) updateDashboard(true); 
    });
}, { threshold: 0.3 });
observer.observe(dashboardSection);

// ==========================================
// 8. CALENDARIO
// ==========================================
function renderCalendar() {
    calendar.innerHTML = "";
    monthYear.style.animation = 'none';
    monthYear.offsetHeight; 
    monthYear.style.animation = 'fadeInDown 0.5s ease';

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    monthYear.innerText = `${monthNames[month]} ${year}`;

    let firstDayIndex = new Date(year, month, 1).getDay();
    if (firstDayIndex === 0) firstDayIndex = 6;
    else firstDayIndex = firstDayIndex - 1;

    const lastDay = new Date(year, month + 1, 0).getDate();
    const today = new Date(); today.setHours(0,0,0,0);

    for (let i = 0; i < firstDayIndex; i++) {
        calendar.appendChild(document.createElement('div'));
    }

    for (let i = 1; i <= lastDay; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('day');
        dayDiv.innerText = i;
        dayDiv.style.animationDelay = `${i * 0.02}s`;

        const dateKey = `${year}-${month + 1}-${i}`;
        const thisDate = new Date(year, month, i);

        if (thisDate < today) dayDiv.classList.add('past-day');

        if (bookings[dateKey]) {
            bookings[dateKey].status === true ? dayDiv.classList.add('paid') : dayDiv.classList.add('occupied');
        }

        if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dayDiv.classList.add('current-day');
        }

        dayDiv.addEventListener('click', () => openBookingModal(dateKey, thisDate));
        calendar.appendChild(dayDiv);
    }
}

// ==========================================
// 9. DASHBOARD (GRÁFICOS)
// ==========================================
function updateDashboard(animate = false) {
    let totalIncome = 0, monthIncome = 0, yearIncome = 0;
    let monthlyData = new Array(12).fill(0);
    let paidCount = 0, pendingCount = 0;
    const today = new Date(); const currentMonth = today.getMonth();

    Object.keys(bookings).forEach(key => {
        const item = bookings[key];
        const price = parseInt(item.price) || 0;
        const itemDate = new Date(key);
        const itemYear = itemDate.getFullYear();

        if (item.status === true) totalIncome += price;

        if (itemYear === selectedDashboardYear) {
            if (item.status === true) {
                paidCount++;
                yearIncome += price;
                monthlyData[itemDate.getMonth()] += price;
                if (itemYear === today.getFullYear() && itemDate.getMonth() === currentMonth) monthIncome += price;
            } else {
                pendingCount++;
            }
        }
    });

    monthIncomeEl.innerText = `$${monthIncome.toLocaleString()}`;
    yearIncomeEl.innerText = `$${yearIncome.toLocaleString()}`;
    totalIncomeEl.innerText = `$${totalIncome.toLocaleString()}`;

    const barCtx = document.getElementById('barChart').getContext('2d');
    const pieCtx = document.getElementById('pieChart').getContext('2d');
    const animationConfig = animate ? { duration: 2000, easing: 'easeOutQuart' } : false;

    if (barChartInstance) barChartInstance.destroy();
    if (pieChartInstance) pieChartInstance.destroy();

    barChartInstance = new Chart(barCtx, {
        type: 'bar',
        data: { labels: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'], datasets: [{ label: 'Ingresos', data: monthlyData, backgroundColor: '#0077b6', borderRadius: 5 }] },
        options: { responsive: true, maintainAspectRatio: false, animation: animationConfig, plugins: { legend: {display:false}, title: {display:true, text: `Ingresos ${selectedDashboardYear}`} }, scales: { y: {beginAtZero:true}, x: {grid:{display:false}} } }
    });

    pieChartInstance = new Chart(pieCtx, {
        type: 'doughnut',
        data: { labels: ['Lista', 'Espera'], datasets: [{ data: [paidCount, pendingCount], backgroundColor: ['#2ecc71', '#ff6b6b'], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, animation: animationConfig, cutout: '60%', plugins: { title: {display:true, text: `Estado ${selectedDashboardYear}`} } }
    });
}

function populateYearFilter() {
    const years = new Set([new Date().getFullYear()]);
    Object.keys(bookings).forEach(k => !isNaN(new Date(k)) && years.add(new Date(k).getFullYear()));
    const sorted = Array.from(years).sort((a,b)=>b-a);
    const curr = yearFilter.value; yearFilter.innerHTML = "";
    sorted.forEach(y => { const o = document.createElement('option'); o.value=y; o.innerText=y; if(y===selectedDashboardYear) o.selected=true; yearFilter.appendChild(o); });
    if(curr && Array.from(yearFilter.options).some(o=>o.value===curr)) yearFilter.value=curr;
}

yearFilter.addEventListener('change', (e) => { selectedDashboardYear = parseInt(e.target.value); updateDashboard(true); });

// ==========================================
// 10. MODAL & VALIDACIONES
// ==========================================
window.openBookingModal = (dateKey, dateObj) => {
    const today = new Date(); today.setHours(0,0,0,0);
    const checkDate = new Date(dateObj); checkDate.setHours(0,0,0,0);
    const exists = bookings[dateKey];

    if (checkDate < today && !exists) { alert("⛔ No se puede reservar en el pasado."); return; }

    resModal.style.display = "flex";
    document.getElementById('modalDateTitle').innerText = `Reserva: ${dateKey}`;
    dateInput.value = dateKey;

    if (exists) {
        nameInput.value = exists.name;
        phoneInput.value = exists.phone || '';
        priceInput.value = exists.price;
        peopleInput.value = exists.people;
        timeInput.value = exists.time;
        statusInput.checked = exists.status === true;
    } else {
        resForm.reset();
        dateInput.value = dateKey;
        statusInput.checked = false;
    }
}

window.closeModalFunc = (id) => document.getElementById(id).style.display = 'none';
window.onclick = (e) => { if(e.target.classList.contains('modal')) e.target.style.display = 'none'; }

resForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!/^[a-zA-Z\sñÑáéíóúÁÉÍÓÚ]+$/.test(nameInput.value)) return alert("⚠️ Nombre solo letras.");
    if (phoneInput.value && !/^[0-9]+$/.test(phoneInput.value)) return alert("⚠️ Teléfono solo números.");
    
    const key = dateInput.value;
    set(ref(db, 'bookings/' + key), {
        name: nameInput.value, phone: phoneInput.value, price: priceInput.value,
        people: peopleInput.value, time: timeInput.value, status: statusInput.checked
    }).then(() => resModal.style.display = "none").catch(err => alert(err.message));
});

document.getElementById('btnDelete').addEventListener('click', () => {
    const key = dateInput.value;
    if(bookings[key] && confirm("¿Eliminar?")) remove(ref(db, 'bookings/' + key)).then(()=>resModal.style.display="none");
});

document.getElementById('prevMonth').addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth()-1); renderCalendar(); });
document.getElementById('nextMonth').addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth()+1); renderCalendar(); });
window.goToSection = (id) => document.getElementById(id).scrollIntoView({behavior:'smooth'});

// INICIO
renderCalendar();
