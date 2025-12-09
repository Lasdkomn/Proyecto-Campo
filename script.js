// ==========================================
// 1. IMPORTACIONES Y CONFIGURACIÓN FIREBASE
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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
const calendar = document.getElementById('calendar');
const monthYear = document.getElementById('monthYear');
const modal = document.getElementById('reservationModal');
const form = document.getElementById('reservationForm');
const closeModal = document.querySelector('.close');

// Inputs Formulario
const dateInput = document.getElementById('selectedDate');
const nameInput = document.getElementById('name');
const phoneInput = document.getElementById('phone');
const priceInput = document.getElementById('price');
const peopleInput = document.getElementById('people');
const timeInput = document.getElementById('time');
const statusInput = document.getElementById('status'); // Checkbox "Pagado"

// Historial y Filtros
const historyList = document.getElementById('historyList');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');

// Dashboard & Estadísticas
const dashboardSection = document.getElementById('dashboard-section');
const yearFilter = document.getElementById('yearFilter');
const monthIncomeEl = document.getElementById('monthIncome');
const yearIncomeEl = document.getElementById('yearIncome');
const totalIncomeEl = document.getElementById('totalIncome');

// Variables de Estado
let currentDate = new Date();
let bookings = {}; 
let barChartInstance = null;
let pieChartInstance = null;
let selectedDashboardYear = new Date().getFullYear(); 

// ==========================================
// 3. CONEXIÓN REALTIME (El Corazón de la App)
// ==========================================
const bookingsRef = ref(db, 'bookings');

onValue(bookingsRef, (snapshot) => {
    const data = snapshot.val();
    bookings = data || {}; 
    
    // Al recibir datos, actualizamos las vistas
    renderCalendar();
    updateHistory();
    populateYearFilter(); 
    
    // Solo actualizamos dashboard si ya es visible para no cortar animación
    // (El observer se encarga de la primera carga)
});

// ==========================================
// 4. ANIMACIONES (Intersection Observer)
// ==========================================
// Detecta cuando bajas a la sección de estadísticas para animar los gráficos
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            updateDashboard(true); // true = forzar animación
        }
    });
}, { threshold: 0.3 });

observer.observe(dashboardSection);

// Evento: Cambio de año en el dashboard
yearFilter.addEventListener('change', (e) => {
    selectedDashboardYear = parseInt(e.target.value);
    updateDashboard(true); 
});

// ==========================================
// 5. LÓGICA DEL CALENDARIO
// ==========================================
function renderCalendar() {
    calendar.innerHTML = "";
    
    // Reiniciar animación del título
    monthYear.style.animation = 'none';
    monthYear.offsetHeight; 
    monthYear.style.animation = 'fadeInDown 0.5s ease';

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    monthYear.innerText = `${monthNames[month]} ${year}`;

    // LÓGICA: SEMANA EMPIEZA EN LUNES
    let firstDayIndex = new Date(year, month, 1).getDay();
    // Ajuste: Domingo(0)->6, Lunes(1)->0...
    if (firstDayIndex === 0) firstDayIndex = 6;
    else firstDayIndex = firstDayIndex - 1;

    const lastDay = new Date(year, month + 1, 0).getDate();
    
    // Preparar fecha de hoy para comparaciones (sin hora)
    const today = new Date();
    today.setHours(0,0,0,0);

    // Días vacíos previos
    for (let i = 0; i < firstDayIndex; i++) {
        calendar.appendChild(document.createElement('div'));
    }

    // Días del mes
    for (let i = 1; i <= lastDay; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('day');
        dayDiv.innerText = i;
        
        // Retraso progresivo para animación cascada
        dayDiv.style.animationDelay = `${i * 0.02}s`;

        const dateKey = `${year}-${month + 1}-${i}`;
        const thisDate = new Date(year, month, i); // Fecha del día actual del bucle

        // ESTILOS VISUALES
        // 1. Si es día pasado
        if (thisDate < today) {
            dayDiv.classList.add('past-day');
        }

        // 2. Si hay reserva
        if (bookings[dateKey]) {
            if (bookings[dateKey].status === true) {
                dayDiv.classList.add('paid'); // Verde
            } else {
                dayDiv.classList.add('occupied'); // Rojo
            }
        }

        // 3. Si es hoy
        if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dayDiv.classList.add('current-day');
        }

        // Click pasando el objeto Date para validación
        dayDiv.addEventListener('click', () => openModal(dateKey, thisDate));
        calendar.appendChild(dayDiv);
    }
}

// ==========================================
// 6. HISTORIAL Y BÚSQUEDA
// ==========================================
function updateHistory() {
    historyList.innerHTML = "";
    const searchTerm = searchInput.value.toLowerCase();
    const filterType = statusFilter.value; // 'all', 'paid', 'pending'

    const listArray = Object.keys(bookings).map(date => {
        return { date: date, ...bookings[date] };
    });

    // 1. FILTRADO
    const filteredList = listArray.filter(item => {
        // Por nombre
        const matchName = item.name.toLowerCase().includes(searchTerm);
        // Por estado
        let matchStatus = true;
        if (filterType === 'paid') matchStatus = item.status === true;
        if (filterType === 'pending') matchStatus = item.status === false;
        
        return matchName && matchStatus;
    });

    // 2. ORDENAMIENTO (Alfabético por Cliente)
    filteredList.sort((a, b) => {
        return a.name.localeCompare(b.name);
    });

    if (filteredList.length === 0) {
        historyList.innerHTML = "<p style='text-align:center; color:#888'>No se encontraron datos.</p>";
        return;
    }

    filteredList.forEach(item => {
        const li = document.createElement('li');
        li.classList.add('history-item');
        
        const statusIcon = item.status === true ? '✅' : '⏳';
        
        li.innerHTML = `
            <strong>${item.name} <span style="float:right;">${statusIcon}</span></strong>
            <small>📞 ${item.phone || '-'}</small>
            <span>📅 ${item.date} | ⏰ ${item.time}</span><br>
            <span>👥 ${item.people} | 💰 $${item.price}</span>
        `;
        // Al hacer click, calculamos la fecha para pasarla a la validación
        li.addEventListener('click', () => {
            const parts = item.date.split('-'); // asumiendo YYYY-M-D
            const dateObj = new Date(parts[0], parts[1]-1, parts[2]);
            openModal(item.date, dateObj);
        });
        historyList.appendChild(li);
    });
}

// Eventos de filtro
searchInput.addEventListener('input', updateHistory);
statusFilter.addEventListener('change', updateHistory);

// ==========================================
// 7. DASHBOARD Y GRÁFICOS
// ==========================================
function populateYearFilter() {
    const years = new Set();
    years.add(new Date().getFullYear());

    Object.keys(bookings).forEach(key => {
        const d = new Date(key);
        if(!isNaN(d)) years.add(d.getFullYear());
    });

    const sortedYears = Array.from(years).sort((a,b) => b - a);
    const currentVal = yearFilter.value; 
    
    yearFilter.innerHTML = "";
    sortedYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.innerText = year;
        if (year === selectedDashboardYear) option.selected = true;
        yearFilter.appendChild(option);
    });

    if (currentVal && Array.from(yearFilter.options).some(o => o.value === currentVal)) {
        yearFilter.value = currentVal;
    }
}

function updateDashboard(animate = false) {
    let totalIncome = 0;
    let monthIncome = 0;
    let yearIncome = 0;
    let monthlyData = new Array(12).fill(0); 
    let paidCount = 0;
    let pendingCount = 0;

    const today = new Date();
    const currentMonth = today.getMonth();

    Object.keys(bookings).forEach(key => {
        const item = bookings[key];
        const price = parseInt(item.price) || 0;
        const itemDate = new Date(key);
        const itemYear = itemDate.getFullYear();
        const itemMonth = itemDate.getMonth();

        // Total Histórico (Solo Pagados)
        if (item.status === true) totalIncome += price;

        // Filtrar por Año Seleccionado
        if (itemYear === selectedDashboardYear) {
            if (item.status === true) {
                paidCount++;
                yearIncome += price;
                monthlyData[itemMonth] += price;
                
                // Si es el año actual y mes actual
                if (itemYear === new Date().getFullYear() && itemMonth === currentMonth) {
                    monthIncome += price;
                }
            } else {
                pendingCount++;
            }
        }
    });

    // Actualizar Textos
    monthIncomeEl.innerText = `$${monthIncome.toLocaleString()}`;
    yearIncomeEl.innerText = `$${yearIncome.toLocaleString()}`;
    totalIncomeEl.innerText = `$${totalIncome.toLocaleString()}`;

    // Configurar Gráficos
    const barCtx = document.getElementById('barChart').getContext('2d');
    const pieCtx = document.getElementById('pieChart').getContext('2d');
    const animationConfig = animate ? { duration: 2000, easing: 'easeOutQuart' } : false;

    if (barChartInstance) barChartInstance.destroy();
    if (pieChartInstance) pieChartInstance.destroy();

    // Gráfico Barras
    barChartInstance = new Chart(barCtx, {
        type: 'bar',
        data: {
            labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
            datasets: [{
                label: `Ingresos`,
                data: monthlyData,
                backgroundColor: '#0077b6',
                borderRadius: 5,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, animation: animationConfig,
            plugins: { legend: { display: false }, title: { display: true, text: `Ingresos ${selectedDashboardYear}` } },
            scales: { y: { beginAtZero: true, grid: { color: '#f0f0f0' } }, x: { grid: { display: false } } }
        }
    });

    // Gráfico Torta
    pieChartInstance = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
            labels: ['Pagadas', 'Pendientes'],
            datasets: [{
                data: [paidCount, pendingCount],
                backgroundColor: ['#2ecc71', '#ff6b6b'],
                hoverOffset: 10, borderWidth: 0
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, animation: animationConfig, cutout: '60%',
            plugins: { title: { display: true, text: `Estado ${selectedDashboardYear}` } }
        }
    });
}

// ==========================================
// 8. MODAL, FORMULARIO Y VALIDACIONES
// ==========================================
function openModal(dateKey, dateObj = null) {
    // Si no se pasa el objeto fecha (ej: desde el historial), se calcula
    if (!dateObj) {
        const parts = dateKey.split('-');
        dateObj = new Date(parts[0], parts[1]-1, parts[2]);
    }

    const today = new Date();
    today.setHours(0,0,0,0);
    const checkDate = new Date(dateObj);
    checkDate.setHours(0,0,0,0);

    const exists = bookings[dateKey];
    const isPast = checkDate < today;

    // VALIDACIÓN: No crear en pasado
    if (isPast && !exists) {
        alert("⛔ No se pueden crear reservas en fechas pasadas.");
        return;
    }

    modal.style.display = "flex";
    document.getElementById('modalDateTitle').innerText = `Reserva: ${dateKey}`;
    dateInput.value = dateKey;

    if (exists) {
        const data = bookings[dateKey];
        nameInput.value = data.name;
        phoneInput.value = data.phone || '';
        priceInput.value = data.price;
        peopleInput.value = data.people;
        timeInput.value = data.time;
        statusInput.checked = data.status === true;
    } else {
        form.reset();
        dateInput.value = dateKey;
        statusInput.checked = false;
    }
}

closeModal.onclick = () => modal.style.display = "none";
window.onclick = (e) => { if (e.target == modal) modal.style.display = "none"; }

// SUBMIT CON VALIDACIONES REGEX
form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // 1. Validar Nombre (Solo letras, espacios y tildes)
    const nameVal = nameInput.value;
    const nameRegex = /^[a-zA-Z\sñÑáéíóúÁÉÍÓÚ]+$/; 
    if (!nameRegex.test(nameVal)) {
        alert("⚠️ El nombre solo debe contener letras.");
        return;
    }

    // 2. Validar Teléfono (Solo números)
    const phoneVal = phoneInput.value;
    const phoneRegex = /^[0-9]+$/;
    if (phoneVal !== "" && !phoneRegex.test(phoneVal)) {
        alert("⚠️ El teléfono solo debe contener números.");
        return;
    }

    const dateKey = dateInput.value;
    
    const bookingData = {
        name: nameInput.value,
        phone: phoneInput.value,
        price: priceInput.value,
        people: peopleInput.value,
        time: timeInput.value,
        status: statusInput.checked
    };

    set(ref(db, 'bookings/' + dateKey), bookingData)
        .then(() => { modal.style.display = "none"; })
        .catch((error) => { alert("Error: " + error.message); });
});

// Eliminar
document.getElementById('btnDelete').addEventListener('click', () => {
    const dateKey = dateInput.value;
    if(bookings[dateKey] && confirm("¿Eliminar reserva?")) {
        remove(ref(db, 'bookings/' + dateKey))
            .then(() => { modal.style.display = "none"; })
            .catch((error) => { alert("Error: " + error.message); });
    }
});

// Navegación Meses
document.getElementById('prevMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
});
document.getElementById('nextMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
});

// Navegación Global (para HTML onclick)
window.goToSection = (sectionId) => {
    document.getElementById(sectionId).scrollIntoView({ behavior: 'smooth' });
}

// Iniciar
renderCalendar();
 

