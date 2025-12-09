// ==========================================
// 1. IMPORTACIONES Y CONFIGURACIÓN (CON TUS DATOS REALES)
// ==========================================
// Usamos las URL completas (CDN) para que funcione en el navegador sin instalar nada extra
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// TUS CREDENCIALES DE PISCINA FLORANGEL
const firebaseConfig = {
  apiKey: "AIzaSyAbVB5CcSGgtOY856Wv_nNdJP-z2oD3X_k",
  authDomain: "piscinaflorangel.firebaseapp.com",
  databaseURL: "https://piscinaflorangel-default-rtdb.firebaseio.com",
  projectId: "piscinaflorangel",
  storageBucket: "piscinaflorangel.firebasestorage.app",
  messagingSenderId: "305089524402",
  appId: "1:305089524402:web:2467f46840b9c981004fab"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ==========================================
// 2. VARIABLES DEL DOM (ELEMENTOS HTML)
// ==========================================
const calendar = document.getElementById('calendar');
const monthYear = document.getElementById('monthYear');
const modal = document.getElementById('reservationModal');
const form = document.getElementById('reservationForm');
const closeModal = document.querySelector('.close');

// Inputs del formulario
const dateInput = document.getElementById('selectedDate');
const nameInput = document.getElementById('name');
const phoneInput = document.getElementById('phone'); // Campo de teléfono
const priceInput = document.getElementById('price');
const peopleInput = document.getElementById('people');
const timeInput = document.getElementById('time');

// Lista e historial
const historyList = document.getElementById('historyList');
const searchInput = document.getElementById('searchInput');

// Variables de estado
let currentDate = new Date();
let bookings = {}; // Aquí se guardan los datos descargados de la nube

// ==========================================
// 3. CONEXIÓN EN TIEMPO REAL (ESCUCHAR DATOS)
// ==========================================
// Esto descarga los datos automáticamente cuando abres la página
// y se actualiza solo si alguien más hace un cambio.
const bookingsRef = ref(db, 'bookings');
onValue(bookingsRef, (snapshot) => {
    const data = snapshot.val();
    bookings = data || {}; // Si no hay datos, usa objeto vacío
    
    // Al recibir datos, actualizamos pantalla
    renderCalendar();
    updateHistory();
});

// ==========================================
// 4. FUNCIONES DE LÓGICA
// ==========================================

// --- Navegación suave entre secciones ---
function goToSection(sectionId) {
    document.getElementById(sectionId).scrollIntoView({ 
        behavior: 'smooth' 
    });
}

// --- Dibujar el Calendario ---
function renderCalendar() {
    calendar.innerHTML = "";
    
    // Reiniciar animación del título
    monthYear.style.animation = 'none';
    monthYear.offsetHeight; /* trigger reflow */
    monthYear.style.animation = 'fadeInDown 0.5s ease';

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    monthYear.innerText = `${monthNames[month]} ${year}`;

    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();

    // Celdas vacías
    for (let i = 0; i < firstDayIndex; i++) {
        calendar.appendChild(document.createElement('div'));
    }

    // Días del mes (con animación cascada)
    for (let i = 1; i <= lastDay; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('day');
        dayDiv.innerText = i;
        
        // Retraso de animación para efecto visual
        dayDiv.style.animationDelay = `${i * 0.03}s`;

        const dateKey = `${year}-${month + 1}-${i}`;

        // Si existe en la base de datos, pintar de ocupado
        if (bookings[dateKey]) {
            dayDiv.classList.add('occupied');
        }

        // Marcar día actual
        const today = new Date();
        if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dayDiv.classList.add('current-day');
        }

        // Click para editar
        dayDiv.addEventListener('click', () => openModal(dateKey));
        calendar.appendChild(dayDiv);
    }
}

// --- Actualizar Historial y Buscador ---
function updateHistory() {
    historyList.innerHTML = "";
    const searchTerm = searchInput.value.toLowerCase();

    // Convertir objeto a lista para filtrar
    const listArray = Object.keys(bookings).map(date => {
        return { date: date, ...bookings[date] };
    });

    // Filtro por nombre
    const filteredList = listArray.filter(item => 
        item.name.toLowerCase().includes(searchTerm)
    );

    if (filteredList.length === 0) {
        historyList.innerHTML = "<p style='text-align:center; color:#888'>No hay reservas encontradas.</p>";
        return;
    }

    // Crear lista visual
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

// Evento buscador
searchInput.addEventListener('input', updateHistory);

// --- Abrir Modal ---
function openModal(dateKey) {
    modal.style.display = "flex";
    document.getElementById('modalDateTitle').innerText = `Reserva: ${dateKey}`;
    dateInput.value = dateKey;

    if (bookings[dateKey]) {
        // Rellenar datos existentes
        const data = bookings[dateKey];
        nameInput.value = data.name;
        phoneInput.value = data.phone || '';
        priceInput.value = data.price;
        peopleInput.value = data.people;
        timeInput.value = data.time;
    } else {
        // Limpiar formulario para nueva reserva
        form.reset();
        dateInput.value = dateKey;
    }
}

// Cerrar Modal
closeModal.onclick = () => modal.style.display = "none";
window.onclick = (e) => { if (e.target == modal) modal.style.display = "none"; }

// --- GUARDAR (SUBIR A LA NUBE) ---
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

    // Usamos 'set' de Firebase
    set(ref(db, 'bookings/' + dateKey), bookingData)
        .then(() => {
            modal.style.display = "none";
            // No hace falta recargar, el onValue lo hace solo
        })
        .catch((error) => {
            alert("Error al guardar: " + error.message);
        });
});

// --- ELIMINAR (BORRAR DE LA NUBE) ---
document.getElementById('btnDelete').addEventListener('click', () => {
    const dateKey = dateInput.value;
    
    if(bookings[dateKey] && confirm("¿Seguro que quieres eliminar esta reserva?")) {
        // Usamos 'remove' de Firebase
        remove(ref(db, 'bookings/' + dateKey))
            .then(() => {
                modal.style.display = "none";
            })
            .catch((error) => {
                alert("Error al eliminar: " + error.message);
            });
    }
});

// --- Botones Meses ---
document.getElementById('prevMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
});
document.getElementById('nextMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
});

// Exponer la función de navegación al HTML
window.goToSection = goToSection;

// Inicializar
renderCalendar();
