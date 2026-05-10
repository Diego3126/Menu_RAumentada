// Configuración de la API
const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api'
    : '/api';

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

// ---------- Autenticación (token + role) ----------
function getAuthToken() {
    return localStorage.getItem('authToken');
}

function getAuthRole() {
    return localStorage.getItem('authRole');
}

function initAuthUI() {
    const loginLink = document.getElementById('loginLink');
    const logoutLink = document.getElementById('logoutLink');
    const adminLink = document.getElementById('adminLink');
    const token = getAuthToken();
    const role = getAuthRole();

    if (!loginLink || !logoutLink || !adminLink) return;

    if (token) {
        loginLink.style.display = 'none';
        logoutLink.style.display = 'inline-block';
        if (role === 'ADMIN') {
            adminLink.style.display = 'inline-block';
        } else {
            adminLink.style.display = 'none';
        }
    } else {
        loginLink.style.display = 'inline-block';
        logoutLink.style.display = 'none';
        adminLink.style.display = 'none';
    }

    logoutLink.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('authToken');
        localStorage.removeItem('authRole');
        initAuthUI();
        window.location.href = 'index.html';
    });
}

async function fetchWithAuth(url, options = {}) {
    const token = getAuthToken();
    options.headers = options.headers || {};
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, options);
    if (res.status === 401 || res.status === 403) {
        // Redirigir a login
        window.location.href = 'login.html';
        throw new Error('Unauthorized');
    }
    return res;
}

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
        const imagenUrl = plato.imagen_url || 'https://placehold.co/400x250/ff8c42/white?text=No+Image';

        card.innerHTML = `
            <div class="dish-img" style="background-image: url('${imagenUrl}');"></div>
            <div class="dish-info">
                <div class="dish-name">${plato.nombre}</div>
                <div class="dish-description">${plato.descripcion || 'Delicioso plato'}</div>
                <div class="dish-price">$${parseFloat(plato.precio).toFixed(2)}</div>
                <div class="dish-actions" data-id="${plato.id}"></div>
            </div>
        `;

        // Añadir acciones administrativas si el usuario es ADMIN
        const actionsEl = card.querySelector('.dish-actions');
        if (getAuthRole && getAuthRole() === 'ADMIN') {
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Editar precio';
            editBtn.className = 'btn-edit-price';
            editBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const nuevo = prompt('Nuevo precio para ' + plato.nombre, plato.precio);
                if (nuevo === null) return;
                try {
                    await fetchWithAuth(`${API_URL}/platos/${plato.id}/precio`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ nuevoPrecio: parseFloat(nuevo) })
                    });
                    cargarPlatos();
                } catch (err) {
                    console.error('error update price', err);
                    alert('Error actualizando precio');
                }
            });

            const delBtn = document.createElement('button');
            delBtn.textContent = 'Eliminar';
            delBtn.className = 'btn-delete';
            delBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!confirm('Eliminar ' + plato.nombre + '?')) return;
                try {
                    await fetchWithAuth(`${API_URL}/platos/${plato.id}`, { method: 'DELETE' });
                    cargarPlatos();
                } catch (err) {
                    console.error('delete error', err);
                    alert('Error eliminando plato');
                }
            });

            actionsEl.appendChild(editBtn);
            actionsEl.appendChild(delBtn);
        }

        // Click en card: ir directo a personalizar el plato
        card.addEventListener('click', () => {
            window.location.href = `pedido.html?id=${plato.id}`;
        });

        dishesGrid.appendChild(card);
    });
}

/**
 * Abre el modal AR con visor 3D para un plato
 */
function openAR3DViewer(plato) {
    arModal.style.display = 'flex';

    // Ruta del modelo — desde BD o fallback por nombre
    const modelPath = plato.model_path
        ? `/models/${plato.model_path}`
        : `/models/${sanitizeName(plato.nombre)}.glb`;

    // Nombre del plato en el header del modal
    const dishNameEl = document.getElementById('dishNameAR');
    if (dishNameEl) dishNameEl.textContent = plato.nombre;

    // Asignar el modelo a model-viewer
    const mv = document.getElementById('modelViewerAR');
    const loading = document.getElementById('mvLoading');

    if (mv) {
        // Mostrar loading mientras carga
        if (loading) loading.style.display = 'flex';

        mv.src = modelPath;

        // Ocultar loading cuando el modelo esté listo
        mv.addEventListener('load', () => {
            if (loading) loading.style.display = 'none';
        }, { once: true });

        // Si el modelo falla (no existe el .glb), ocultar loading igual
        mv.addEventListener('error', () => {
            if (loading) loading.style.display = 'none';
            console.warn('Modelo no encontrado:', modelPath);
        }, { once: true });

        // Mostrar badge "RA disponible" en móviles que lo soporten
        mv.addEventListener('ar-status', (e) => {
            const badge = document.getElementById('arBadgeMobile');
            if (badge && e.detail.status !== 'not-presenting') {
                badge.style.display = 'inline-flex';
            }
        }, { once: true });
    }

    // Conectar botón "Personalizar y agregar al carrito"
    const btnPersonalizar = document.getElementById('btnPersonalizarDesdeAR');
    if (btnPersonalizar) {
        const btnNuevo = btnPersonalizar.cloneNode(true);
        btnPersonalizar.parentNode.replaceChild(btnNuevo, btnPersonalizar);
        btnNuevo.addEventListener('click', () => {
            arModal.style.display = 'none';
            window.location.href = `pedido.html?id=${plato.id}`;
        });
        // Restaurar hover handlers
        btnNuevo.onmouseover = () => { btnNuevo.style.transform='translateY(-2px)'; btnNuevo.style.boxShadow='0 6px 22px rgba(255,140,66,0.55)'; };
        btnNuevo.onmouseout  = () => { btnNuevo.style.transform='translateY(0)';    btnNuevo.style.boxShadow='0 4px 15px rgba(255,140,66,0.4)'; };
    }
}

/**
 * Sanitiza nombres para crear rutas de archivos válidas
 */
function sanitizeName(name) {
    return name
        .toLowerCase()
        // Reemplazar tildes y caracteres especiales del español ANTES de eliminar símbolos
        .replace(/[áàäâ]/g, 'a')
        .replace(/[éèëê]/g, 'e')
        .replace(/[íìïî]/g, 'i')
        .replace(/[óòöô]/g, 'o')
        .replace(/[úùüû]/g, 'u')
        .replace(/ñ/g, 'n')
        .replace(/ç/g, 'c')
        // Eliminar el resto de caracteres especiales
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
}

// ==================== FUNCIONES DE REALIDAD AUMENTADA ====================

// Modal de AR desde botón general
arExperienceBtn.addEventListener('click', () => {
    // Si hay un plato actualmente seleccionado, abrirlo
    // Si no, mostrar primero del menú
    if (allPlatos.length > 0) {
        openAR3DViewer(allPlatos[0]);
    } else {
        arModal.style.display = 'flex';
    }
});

// Cerrar modal AR
closeArModalSpan.onclick = () => {
    arModal.style.display = 'none';
    if (viewer3D) {
        viewer3D.reset();
    }
};

window.onclick = (e) => {
    if (e.target === arModal) {
        arModal.style.display = 'none';
        if (viewer3D) {
            viewer3D.reset();
        }
    }
};

// ==================== INICIALIZACIÓN ====================

// Cargar todo al iniciar
document.addEventListener('DOMContentLoaded', () => {
    initAuthUI();
    cargarPlatos();
});

// Actualizar contador del carrito
async function actualizarContadorCarrito() {
    const cartCount = document.getElementById('cartCount');
    if (!cartCount) return;

    const sessionId = localStorage.getItem('carritoSessionId');
    if (!sessionId) {
        cartCount.textContent = '0';
        cartCount.style.display = 'none';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/carrito`, {
            headers: { 'x-session-id': sessionId }
        });
        const data = await response.json();
        const totalItems = data.count || 0;
        cartCount.textContent = totalItems;
        cartCount.style.display = totalItems > 0 ? 'inline-block' : 'none';
    } catch (error) {
        console.error('Error al actualizar contador:', error);
    }
}

// Llamar al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    initAuthUI();
    actualizarContadorCarrito();
});

// Exponer función global
window.actualizarContadorCarrito = actualizarContadorCarrito;