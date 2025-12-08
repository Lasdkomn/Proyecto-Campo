// --- VARIABLES GLOBALES ---
const calendar = document.getElementById('calendar');
const monthYear = document.getElementById('monthYear');
const modal = document.getElementById('reservationModal');
const form = document.getElementById('reservationForm');
const closeModal = document.querySelector('.close');

// Inputs del formulario
const dateInput = document.getElementById('selectedDate');
const nameInput = document.getElementById('name');
const phoneInput = document.getElementById('phone'); // <--- NUEVO
const priceInput = document.getElementById('price');
const peopleInput = document.getElementById('people');
const timeInput = document.getElementById('time');

// Historial y Buscador
const historyList = document.getElementById('historyList');
const searchInput = document.getElementById('searchInput');

let currentDate = new Date();

// --- NAVEGACIÓN ENTRE SECCIONES ---
function goToSection(sectionId) {
    document.getElementById(sectionId).scrollIntoView({ 
        behavior: 'smooth' 
    });
}

// --- RENDERIZAR CALENDARIO (CON ANIMACIÓN CASCADA) ---
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
    const bookings = JSON.parse(localStorage.getItem('bookings')) || {};

    // Celdas vacías
    for (let i = 0; i < firstDayIndex; i++) {
        calendar.appendChild(document.createElement('div'));
    }

    // Días con animación
    for (let i = 1; i <= lastDay; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('day');
        dayDiv.innerText = i;
        
        // Retraso de animación para efecto cascada
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

// --- HISTORIAL (CON TELÉFONO) ---
function updateHistory() {
    historyList.innerHTML = "";
    const bookings = JSON.parse(localStorage.getItem('bookings')) || {};
    const searchTerm = searchInput.value.toLowerCase();

    // Convertir objeto a lista
    const listArray = Object.keys(bookings).map(date => {
        return { date: date, ...bookings[date] };
    });

    // Filtrar por nombre
    const filteredList = listArray.filter(item => 
        item.name.toLowerCase().includes(searchTerm)
    );

    if (filteredList.length === 0) {
        historyList.innerHTML = "<p style='text-align:center; color:#888'>No hay reservas encontradas.</p>";
        return;
    }

    // Dibujar lista
    filteredList.forEach(item => {
        const li = document.createElement('li');
        li.classList.add('history-item');
        
        // Inyectar HTML con el icono de teléfono
        li.innerHTML = `
            <strong>${item.name}</strong>
            <small>📞 ${item.phone || 'Sin número'}</small>
            <span>📅 Fecha: ${item.date} | ⏰ ${item.time}</span><br>
            <span>👥 Personas: ${item.people} | 💰 $${item.price}</span>
        `;
        
        li.addEventListener('click', () => openModal(item.date));
        historyList.appendChild(li);
    });
}

// Escuchar cambios en buscador
searchInput.addEventListener('input', updateHistory);

// --- MODAL Y FORMULARIO ---
function openModal(dateKey) {
    modal.style.display = "flex";
    document.getElementById('modalDateTitle').innerText = `Reserva: ${dateKey}`;
    dateInput.value = dateKey;

    const bookings = JSON.parse(localStorage.getItem('bookings')) || {};
    
    if (bookings[dateKey]) {
        // Cargar datos existentes
        const data = bookings[dateKey];
        nameInput.value = data.name;
        phoneInput.value = data.phone || ''; // Cargar teléfono
        priceInput.value = data.price;
        peopleInput.value = data.people;
        timeInput.value = data.time;
    } else {
        // Formulario limpio
        form.reset();
        dateInput.value = dateKey;
    }
}

closeModal.onclick = () => modal.style.display = "none";
window.onclick = (e) => { if (e.target == modal) modal.style.display = "none"; }

// GUARDAR DATOS
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const dateKey = dateInput.value;
    
    const bookingData = {
        name: nameInput.value,
        phone: phoneInput.value, // Guardar teléfono
        price: priceInput.value,
        people: peopleInput.value,
        time: timeInput.value
    };

    const bookings = JSON.parse(localStorage.getItem('bookings')) || {};
    bookings[dateKey] = bookingData;
    localStorage.setItem('bookings', JSON.stringify(bookings));

    modal.style.display = "none";
    renderCalendar();
    updateHistory();
});

// ELIMINAR DATOS
document.getElementById('btnDelete').addEventListener('click', () => {
    const dateKey = dateInput.value;
    const bookings = JSON.parse(localStorage.getItem('bookings')) || {};
    
    if(confirm("¿Seguro que quieres eliminar esta reserva?")) {
        if (bookings[dateKey]) {
            delete bookings[dateKey];
            localStorage.setItem('bookings', JSON.stringify(bookings));
            modal.style.display = "none";
            renderCalendar();
            updateHistory();
        }
    }
});

// BOTONES MESES
document.getElementById('prevMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
});
document.getElementById('nextMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
});

// INICIALIZAR
renderCalendar();
updateHistory();