// Configuración de la API
const API_URL = 'http://localhost:3000/api';

// Variables globales
let allPlatos = [];           // Todos los platos desde la API
let categories = [];          // Categorías únicas
let currentCategory = "Todas";

// Elementos del DOM
const categoryListEl = document.getElementById('categoryList');
const dishesGrid = document.getElementById('dishesGrid');
const arModal = document.getElementById('arModal');
const closeArModalSpan = document.querySelector('.close-ar-modal');
const arExperienceBtn = document.getElementById('arExperienceBtn');

// ==================== FUNCIONES PARA CARGAR DATOS ====================

// Cargar platos desde el backend
async function cargarPlatos() {
    try {
        mostrarLoading(true);

        const response = await fetch(`${API_URL}/platos`);

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        allPlatos = await response.json();

        console.log('Platos cargados:', allPlatos); // Para debugging

        // Extraer categorías únicas
        categories = [...new Set(allPlatos.map(plato => plato.categoria))];

        // Renderizar todo
        renderCategories();
        renderDishes();

    } catch (error) {
        console.error('Error al cargar platos:', error);
        dishesGrid.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error al cargar los platos. Asegúrate que el servidor esté corriendo.</p>
                <small>${error.message}</small>
            </div>
        `;
        categoryListEl.innerHTML = `
            <div class="error-message">
                <p>Error al cargar categorías</p>
            </div>
        `;
    } finally {
        mostrarLoading(false);
    }
}

// Mostrar/ocultar loading
function mostrarLoading(mostrar) {
    if (mostrar) {
        if (dishesGrid.innerHTML === '' || dishesGrid.innerHTML.includes('Cargando platos')) {
            dishesGrid.innerHTML = '<div class="loading-spinner">Cargando platos...</div>';
        }
        if (categoryListEl.innerHTML === '' || categoryListEl.innerHTML.includes('Cargando categorías')) {
            categoryListEl.innerHTML = '<div class="loading-spinner">Cargando categorías...</div>';
        }
    }
}

// ==================== FUNCIONES DE RENDERIZADO ====================

// Renderizar categorías (MRA-5)
function renderCategories() {
    const cats = ["Todas", ...categories];
    categoryListEl.innerHTML = '';

    cats.forEach(cat => {
        const catDiv = document.createElement('div');
        catDiv.classList.add('category-item');
        if (currentCategory === cat) catDiv.classList.add('active');
        catDiv.textContent = cat;
        catDiv.addEventListener('click', () => {
            currentCategory = cat;
            renderCategories();      // Actualizar estilos de categorías
            renderDishes();          // Filtrar platos
        });
        categoryListEl.appendChild(catDiv);
    });
}

// Renderizar platos según categoría (MRA-6)
function renderDishes() {
    // Filtrar platos por categoría
    let filtered = allPlatos;
    if (currentCategory !== "Todas") {
        filtered = allPlatos.filter(plato => plato.categoria === currentCategory);
    }

    // Si no hay platos en esta categoría
    if (filtered.length === 0) {
        dishesGrid.innerHTML = `
            <div class="no-dishes">
                <i class="fas fa-utensils"></i>
                <p>No hay platos disponibles en esta categoría</p>
            </div>
        `;
        return;
    }

    // Renderizar cada plato
    dishesGrid.innerHTML = '';
    filtered.forEach(plato => {
        const card = document.createElement('div');
        card.classList.add('dish-card');

        // Usar imagen por defecto si no hay imagen_url
        const imagenUrl = plato.imagen_url || `https://via.placeholder.com/300x160?text=${encodeURIComponent(plato.nombre)}`;

        card.innerHTML = `
            <div class="dish-img" style="background-image: url('${imagenUrl}');"></div>
            <div class="dish-info">
                <div class="dish-name">${plato.nombre}</div>
                <div class="dish-description">${plato.descripcion || 'Delicioso plato'}</div>
                <div class="dish-price">$${parseFloat(plato.precio).toFixed(2)}</div>
            </div>
        `;

        // Redirigir a personalización al hacer clic
        card.addEventListener('click', () => {
            window.location.href = `pedido.html?id=${plato.id}`;
        });

        dishesGrid.appendChild(card);
    });
}

// ==================== FUNCIONES DE REALIDAD AUMENTADA ====================

// Modal de AR desde botón general
arExperienceBtn.addEventListener('click', () => {
    arModal.style.display = 'flex';
});

// Cerrar modal AR
closeArModalSpan.onclick = () => arModal.style.display = 'none';
window.onclick = (e) => {
    if (e.target === arModal) arModal.style.display = 'none';
};

// ==================== INICIALIZACIÓN ====================

// Cargar todo al iniciar
document.addEventListener('DOMContentLoaded', () => {
    cargarPlatos();
});