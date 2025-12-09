// ==========================================
// 1. IMPORTACIONES Y CONFIGURACIÓN
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// TUS CREDENCIALES
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

// ==========================================
// 2. VARIABLES DEL DOM
// ==========================================
const calendar = document.getElementById('calendar');
const monthYear = document.getElementById('monthYear');
const modal = document.getElementById('reservationModal');
const form = document.getElementById('reservationForm');
const closeModal = document.querySelector('.close');

const dateInput = document.getElementById('selectedDate');
const nameInput = document.getElementById('name');
const phoneInput = document.getElementById('phone');
const priceInput = document.getElementById('price');
const peopleInput = document.getElementById('people');
const timeInput = document.getElementById('time');

const historyList = document.getElementById('historyList');
const searchInput = document.getElementById('searchInput');

let currentDate = new Date();
let bookings = {}; 

// ==========================================
// 3. CONEXIÓN FIREBASE
// ==========================================
const bookingsRef = ref(db, 'bookings');
onValue(bookingsRef, (snapshot) => {
    const data = snapshot.val();
    bookings = data || {}; 
    renderCalendar();
    updateHistory();
});

// ==========================================
// 4. FUNCIONES (RENDER CALENDAR CORREGIDO)
// ==========================================

function goToSection(sectionId) {
    document.getElementById(sectionId).scrollIntoView({ behavior: 'smooth' });
}

function renderCalendar() {
    calendar.innerHTML = "";
    
    monthYear.style.animation = 'none';
    monthYear.offsetHeight; 
    monthYear.style.animation = 'fadeInDown 0.5s ease';

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    monthYear.innerText = `${monthNames[month]} ${year}`;

    // --- LÓGICA CORREGIDA PARA EMPEZAR EN LUNES ---
    
    // Obtener en qué día de la semana cae el 1 del mes (0=Dom, 1=Lun...)
    let firstDayIndex = new Date(year, month, 1).getDay();
    
    // Convertir al formato Lunes=0 ... Domingo=6
    if (firstDayIndex === 0) {
        firstDayIndex = 6; // Si es Domingo (0), ahora es la posición 6
    } else {
        firstDayIndex = firstDayIndex - 1; // Restamos 1 para mover todo a la izquierda
    }
    // ----------------------------------------------

    const lastDay = new Date(year, month + 1, 0).getDate();

    // Dibujar espacios vacíos
    for (let i = 0; i < firstDayIndex; i++) {
        calendar.appendChild(document.createElement('div'));
    }

    // Dibujar días
    for (let i = 1; i <= lastDay; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('day');
        dayDiv.innerText = i;
        dayDiv.style.animationDelay = `${i * 0.03}s`;

        const dateKey = `${year}-${month + 1}-${i}`;

        if (bookings[dateKey]) {
            dayDiv.classList.add('occupied');
        }

        const today = new Date();
        if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dayDiv.classList.add('current-day');
        }

        dayDiv.addEventListener('click', () => openModal(dateKey));
        calendar.appendChild(dayDiv);
    }
}

function updateHistory() {
    historyList.innerHTML = "";
    const searchTerm = searchInput.value.toLowerCase();

    const listArray = Object.keys(bookings).map(date => {
        return { date: date, ...bookings[date] };
    });

    const filteredList = listArray.filter(item => 
        item.name.toLowerCase().includes(searchTerm)
    );

    if (filteredList.length === 0) {
        historyList.innerHTML = "<p style='text-align:center; color:#888'>No hay reservas encontradas.</p>";
        return;
    }

    filteredList.forEach(item => {
        const li = document.createElement('li');
        li.classList.add('history-item');
        li.innerHTML = `
            <strong>${item.name}</strong>
            <small>📞 ${item.phone || 'Sin número'}</small>
            <span>📅 ${item.date} | ⏰ ${item.time}</span><br>
            <span>👥 ${item.people} pers. | 💰 $${item.price}</span>
        `;
        li.addEventListener('click', () => openModal(item.date));
        historyList.appendChild(li);
    });
}

searchInput.addEventListener('input', updateHistory);

// --- MODAL ---
function openModal(dateKey) {
    modal.style.display = "flex";
    document.getElementById('modalDateTitle').innerText = `Reserva: ${dateKey}`;
    dateInput.value = dateKey;

    if (bookings[dateKey]) {
        const data = bookings[dateKey];
        nameInput.value = data.name;
        phoneInput.value = data.phone || '';
        priceInput.value = data.price;
        peopleInput.value = data.people;
        timeInput.value = data.time;
    } else {
        form.reset();
        dateInput.value = dateKey;
    }
}

closeModal.onclick = () => modal.style.display = "none";
window.onclick = (e) => { if (e.target == modal) modal.style.display = "none"; }

// --- GUARDAR ---
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const dateKey = dateInput.value;
    
    const bookingData = {
        name: nameInput.value,
        phone: phoneInput.value,
        price: priceInput.value,
        people: peopleInput.value,
        time: timeInput.value
    };

    set(ref(db, 'bookings/' + dateKey), bookingData)
        .then(() => { modal.style.display = "none"; })
        .catch((error) => { alert("Error: " + error.message); });
});

// --- ELIMINAR ---
document.getElementById('btnDelete').addEventListener('click', () => {
    const dateKey = dateInput.value;
    if(bookings[dateKey] && confirm("¿Eliminar reserva?")) {
        remove(ref(db, 'bookings/' + dateKey))
            .then(() => { modal.style.display = "none"; })
            .catch((error) => { alert("Error: " + error.message); });
    }
});

document.getElementById('prevMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
});
document.getElementById('nextMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
});

window.goToSection = goToSection;
renderCalendar(); 

