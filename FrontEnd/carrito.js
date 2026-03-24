// Configuración
const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api'
    : '/api';

// Variables globales
let sessionId = null;
let carritoItems = [];

// Elementos DOM
const carritoItemsEl = document.getElementById('carritoItems');
const subtotalEl = document.getElementById('subtotal');
const totalEl = document.getElementById('total');
const vaciarCarritoBtn = document.getElementById('vaciarCarritoBtn');
const continuarPedidoBtn = document.getElementById('continuarPedidoBtn');
const vaciarModal = document.getElementById('vaciarModal');
const confirmarVaciarBtn = document.getElementById('confirmarVaciarBtn');
const cancelarVaciarBtn = document.getElementById('cancelarVaciarBtn');
const closeModal = document.querySelectorAll('.close-modal');

// ==================== FUNCIONES DEL CARRITO ====================

// Obtener o crear sessionId
function getSessionId() {
    let id = localStorage.getItem('carritoSessionId');
    if (!id) {
        id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('carritoSessionId', id);
    }
    return id;
}

// Cargar carrito desde el backend
async function cargarCarrito() {
    sessionId = getSessionId();

    try {
        const response = await fetch(`${API_URL}/carrito`, {
            headers: {
                'x-session-id': sessionId
            }
        });

        const data = await response.json();
        carritoItems = data.items || [];

        renderizarCarrito();
        actualizarResumen();

    } catch (error) {
        console.error('Error al cargar carrito:', error);
        carritoItemsEl.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error al cargar el carrito</p>
                <button onclick="cargarCarrito()" class="btn-retry">Reintentar</button>
            </div>
        `;
    }
}

// Renderizar items del carrito (MRA-19, MRA-20, MRA-21)
function renderizarCarrito() {
    if (!carritoItemsEl) return;

    if (carritoItems.length === 0) {
        carritoItemsEl.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Tu carrito está vacío</p>
                <a href="index.html" class="btn-primary">Ver menú</a>
            </div>
        `;
        return;
    }

    carritoItemsEl.innerHTML = '';

    carritoItems.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'carrito-item';
        itemDiv.dataset.id = item.id;

        // Construir HTML de personalizaciones
        let personalizacionesHtml = '';
        if (item.ingredientes_eliminados && item.ingredientes_eliminados !== 'Ninguno') {
            personalizacionesHtml += `<span class="eliminado"><i class="fas fa-ban"></i> Sin: ${item.ingredientes_eliminados}</span>`;
        }
        if (item.ingredientes_agregados && item.ingredientes_agregados !== 'Ninguno') {
            personalizacionesHtml += `<span class="agregado"><i class="fas fa-plus-circle"></i> Extra: ${item.ingredientes_agregados}</span>`;
        }

        itemDiv.innerHTML = `
            <div class="carrito-item-info">
                <h4>${item.plato_nombre}</h4>
                <div class="carrito-item-detalles">
                    ${personalizacionesHtml || '<span class="sin-personalizacion">Sin modificaciones</span>'}
                </div>
                <div class="carrito-item-precio">$${parseFloat(item.plato_precio).toFixed(2)} c/u</div>
            </div>
            <div class="carrito-item-controles">
                <div class="cantidad-control">
                    <button class="cantidad-btn menos" data-id="${item.id}">-</button>
                    <span class="cantidad">${item.cantidad}</span>
                    <button class="cantidad-btn mas" data-id="${item.id}">+</button>
                </div>
                <button class="eliminar-item" data-id="${item.id}">
                    <i class="fas fa-trash-alt"></i>
                </button>
                <div class="item-total">$${parseFloat(item.item_total || item.cantidad * item.plato_precio).toFixed(2)}</div>
            </div>
        `;

        carritoItemsEl.appendChild(itemDiv);
    });

    // Agregar event listeners (MRA-20: modificar cantidad)
    document.querySelectorAll('.cantidad-btn.menos').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = parseInt(btn.dataset.id);
            const item = carritoItems.find(i => i.id === id);
            if (item && item.cantidad > 1) {
                await actualizarCantidad(id, item.cantidad - 1);
            }
        });
    });

    document.querySelectorAll('.cantidad-btn.mas').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = parseInt(btn.dataset.id);
            const item = carritoItems.find(i => i.id === id);
            if (item) {
                await actualizarCantidad(id, item.cantidad + 1);
            }
        });
    });

    // Agregar event listeners para eliminar (MRA-21)
    document.querySelectorAll('.eliminar-item').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = parseInt(btn.dataset.id);
            await eliminarItem(id);
        });
    });
}

// Actualizar cantidad de un item (MRA-20)
async function actualizarCantidad(id, nuevaCantidad) {
    try {
        const response = await fetch(`${API_URL}/carrito/${id}/cantidad`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'x-session-id': sessionId
            },
            body: JSON.stringify({ cantidad: nuevaCantidad })
        });

        if (response.ok) {
            await cargarCarrito(); // Recargar carrito
        } else {
            const error = await response.json();
            console.error('Error:', error);
            alert('Error al actualizar cantidad');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión');
    }
}

// Eliminar un item del carrito (MRA-21)
async function eliminarItem(id) {
    try {
        const response = await fetch(`${API_URL}/carrito/${id}`, {
            method: 'DELETE',
            headers: {
                'x-session-id': sessionId
            }
        });

        if (response.ok) {
            await cargarCarrito(); // Recargar carrito
        } else {
            alert('Error al eliminar el item');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión');
    }
}

// Vaciar carrito completo
async function vaciarCarrito() {
    try {
        const response = await fetch(`${API_URL}/carrito`, {
            method: 'DELETE',
            headers: {
                'x-session-id': sessionId
            }
        });

        if (response.ok) {
            await cargarCarrito();
            vaciarModal.style.display = 'none';
        } else {
            alert('Error al vaciar el carrito');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión');
    }
}

// Actualizar resumen (subtotal y total)
function actualizarResumen() {
    if (!subtotalEl || !totalEl) return;

    let subtotal = 0;
    carritoItems.forEach(item => {
        subtotal += item.cantidad * parseFloat(item.plato_precio);
    });

    subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    totalEl.textContent = `$${subtotal.toFixed(2)}`;
}

// ==================== EVENT LISTENERS ====================

// Vaciar carrito
vaciarCarritoBtn?.addEventListener('click', () => {
    if (carritoItems.length > 0) {
        vaciarModal.style.display = 'flex';
    }
});

confirmarVaciarBtn?.addEventListener('click', vaciarCarrito);
cancelarVaciarBtn?.addEventListener('click', () => {
    vaciarModal.style.display = 'none';
});

// Continuar con el pedido (ir a checkout)
continuarPedidoBtn?.addEventListener('click', () => {
    if (carritoItems.length === 0) {
        alert('Tu carrito está vacío. Agrega algunos platos primero.');
        return;
    }
    // Aquí iría la página de checkout (para la siguiente tarea)
    alert('Próximamente: finalizar compra');
});

// Cerrar modales
closeModal.forEach(modal => {
    modal.onclick = () => {
        vaciarModal.style.display = 'none';
    };
});

window.onclick = (e) => {
    if (e.target === vaciarModal) {
        vaciarModal.style.display = 'none';
    }
};

// ==================== INICIALIZACIÓN ====================

document.addEventListener('DOMContentLoaded', () => {
    cargarCarrito();
});