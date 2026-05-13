// Configuración
// API_URL viene de config.js

// Variables globales
let sessionId = null;
let carritoItems = [];

// ============================================================
// MRA-126: Utilidades para manejo robusto de errores de envío
// ============================================================

/**
 * fetch con timeout — aborta si el servidor no responde en `ms` milisegundos
 */
async function fetchConTimeout(url, opciones = {}, ms = 10000) {
    const controller = new AbortController();
    const timerId    = setTimeout(() => controller.abort(), ms);
    try {
        const res = await fetch(url, { ...opciones, signal: controller.signal });
        clearTimeout(timerId);
        return res;
    } catch (err) {
        clearTimeout(timerId);
        if (err.name === 'AbortError') {
            throw new Error('TIMEOUT');
        }
        throw err;
    }
}

/**
 * fetch con reintentos automáticos — reintenta `intentos` veces con espera exponencial
 * Solo reintenta en errores de red o timeout, NO en errores 4xx del servidor
 */
async function fetchConReintentos(url, opciones = {}, intentos = 3, msTimeout = 10000) {
    let ultimoError;
    for (let i = 0; i < intentos; i++) {
        try {
            const res = await fetchConTimeout(url, opciones, msTimeout);
            // No reintentar errores del cliente (400, 401, 403, 409)
            if (res.status >= 400 && res.status < 500) return res;
            // Reintentar errores del servidor (500+) solo si no es el último intento
            if (res.status >= 500 && i < intentos - 1) {
                await new Promise(r => setTimeout(r, 1000 * (i + 1)));
                continue;
            }
            return res;
        } catch (err) {
            ultimoError = err;
            const esMensajeReintentable = err.message === 'TIMEOUT' ||
                err.message === 'Failed to fetch' ||
                err instanceof TypeError;

            if (esMensajeReintentable && i < intentos - 1) {
                const espera = 1000 * (i + 1);
                console.warn(`Intento ${i + 1} fallido (${err.message}). Reintentando en ${espera}ms...`);
                await new Promise(r => setTimeout(r, espera));
            } else {
                throw ultimoError;
            }
        }
    }
    throw ultimoError;
}

/**
 * MRA-126: Traducir errores de red a mensajes amigables para el usuario
 */
function mensajeErrorRed(err) {
    if (err.message === 'TIMEOUT') {
        return 'El servidor tardó demasiado en responder. Verifica tu conexión e intenta de nuevo.';
    }
    if (err.message === 'Failed to fetch' || err instanceof TypeError) {
        return 'Sin conexión a internet. Verifica tu red e intenta de nuevo.';
    }
    return 'Error inesperado. Por favor intenta de nuevo.';
}

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

// ==================== MRA-117: SISTEMA DE NOTIFICACIONES ====================
// Reemplaza todos los alert() por notificaciones visuales no bloqueantes

(function crearContenedorToasts() {
    if (document.getElementById('toast-container')) return;
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        pointer-events: none;
    `;
    document.body.appendChild(container);
})();

/**
 * MRA-117: Muestra una notificación tipo toast
 * @param {string} mensaje  - Texto a mostrar
 * @param {'success'|'error'|'warning'|'info'} tipo - Tipo de notificación
 * @param {number} duracion - Duración en ms (default 4000)
 */
function mostrarNotificacion(mensaje, tipo = 'info', duracion = 4000) {
    const colores = {
        success: { bg: '#1a2e1a', border: 'rgba(107,203,119,0.4)', icon: '✓', iconColor: '#6bcb77' },
        error:   { bg: '#2e1a1a', border: 'rgba(255,107,107,0.4)', icon: '✕', iconColor: '#ff6b6b' },
        warning: { bg: '#2e2314', border: 'rgba(255,140,66,0.4)',  icon: '⚠', iconColor: '#ff8c42' },
        info:    { bg: '#1a1f2e', border: 'rgba(100,160,255,0.4)', icon: 'ℹ', iconColor: '#64a0ff' },
    };

    const c = colores[tipo] || colores.info;
    const container = document.getElementById('toast-container');

    const toast = document.createElement('div');
    toast.style.cssText = `
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        background: ${c.bg};
        border: 1px solid ${c.border};
        border-radius: 14px;
        padding: 0.9rem 1.2rem;
        min-width: 280px;
        max-width: 380px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.5);
        backdrop-filter: blur(12px);
        pointer-events: all;
        opacity: 0;
        transform: translateX(30px);
        transition: opacity 0.3s ease, transform 0.3s ease;
        font-family: 'Inter', sans-serif;
        cursor: pointer;
    `;

    toast.innerHTML = `
        <span style="
            font-size: 1rem;
            font-weight: 700;
            color: ${c.iconColor};
            flex-shrink: 0;
            margin-top: 1px;
        ">${c.icon}</span>
        <span style="
            font-size: 0.88rem;
            color: rgba(255,255,255,0.85);
            line-height: 1.5;
            flex: 1;
        ">${mensaje}</span>
        <span style="
            color: rgba(255,255,255,0.3);
            font-size: 1rem;
            cursor: pointer;
            flex-shrink: 0;
            margin-top: -1px;
        ">×</span>
    `;

    container.appendChild(toast);

    // Animar entrada
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    });

    // Cerrar al hacer click
    toast.addEventListener('click', () => cerrarToast(toast));

    // Cerrar automáticamente
    const timer = setTimeout(() => cerrarToast(toast), duracion);
    toast._timer = timer;
}

function cerrarToast(toast) {
    clearTimeout(toast._timer);
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(30px)';
    setTimeout(() => toast.remove(), 300);
}

// ==================== MRA-117: ESTADO DE CARGA EN BOTONES ====================

function setBtnCargando(btn, cargando, textoOriginal, textoCarga = 'Procesando...') {
    if (!btn) return;
    btn.disabled = cargando;
    if (cargando) {
        btn.dataset.textoOriginal = btn.innerHTML;
        btn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> ${textoCarga}`;
    } else {
        btn.innerHTML = btn.dataset.textoOriginal || textoOriginal;
    }
}

// ==================== FUNCIONES DEL CARRITO ====================

function getSessionId() {
    let id = localStorage.getItem('carritoSessionId');
    if (!id) {
        id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('carritoSessionId', id);
    }
    return id;
}

// MRA-117: Mostrar skeleton loader mientras carga
function mostrarSkeletonLoader() {
    if (!carritoItemsEl) return;
    carritoItemsEl.innerHTML = `
        <div style="padding: 1rem;">
            ${[1,2,3].map(() => `
                <div style="
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 1.1rem 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.06);
                    gap: 1rem; animation: shimmer 1.5s infinite;
                ">
                    <div style="flex:1;">
                        <div style="height:14px; width:60%; background:rgba(255,255,255,0.08); border-radius:6px; margin-bottom:8px;"></div>
                        <div style="height:10px; width:40%; background:rgba(255,255,255,0.05); border-radius:6px;"></div>
                    </div>
                    <div style="height:32px; width:100px; background:rgba(255,255,255,0.07); border-radius:50px;"></div>
                </div>
            `).join('')}
        </div>
        <style>
            @keyframes shimmer {
                0%   { opacity: 1; }
                50%  { opacity: 0.5; }
                100% { opacity: 1; }
            }
        </style>
    `;
}

async function cargarCarrito() {
    sessionId = getSessionId();
    mostrarSkeletonLoader(); // MRA-117: skeleton en vez de pantalla en blanco

    try {
        const response = await fetch(`${API_URL}/carrito`, {
            headers: { 'x-session-id': sessionId }
        });

        // MRA-117: Distinguir entre error de red y error del servidor
        if (!response.ok) {
            if (response.status >= 500) {
                throw new Error('server');
            }
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        carritoItems = data.items || [];
        renderizarCarrito();
        actualizarResumen();

    } catch (error) {
        console.error('Error al cargar carrito:', error);

        // MRA-117: Mensaje diferenciado según tipo de error
        const esRedError = error.message === 'Failed to fetch' || error instanceof TypeError;
        const mensaje = esRedError
            ? 'Sin conexión. Verifica tu internet e intenta de nuevo.'
            : 'El servidor no está disponible temporalmente.';

        carritoItemsEl.innerHTML = `
            <div class="error-message" style="text-align:center; padding:3rem 2rem;">
                <i class="fas fa-exclamation-triangle" style="font-size:2rem; color:#ff8c42; display:block; margin-bottom:1rem;"></i>
                <p style="color:rgba(255,255,255,0.6); margin-bottom:1.5rem;">${mensaje}</p>
                <button onclick="cargarCarrito()" class="btn-retry">
                    <i class="fas fa-redo"></i> Reintentar
                </button>
            </div>
        `;
    }
}

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

    document.querySelectorAll('.cantidad-btn.menos').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = parseInt(btn.dataset.id);
            const item = carritoItems.find(i => i.id === id);
            if (item && item.cantidad > 1) await actualizarCantidad(id, item.cantidad - 1);
        });
    });

    document.querySelectorAll('.cantidad-btn.mas').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = parseInt(btn.dataset.id);
            const item = carritoItems.find(i => i.id === id);
            if (item) await actualizarCantidad(id, item.cantidad + 1);
        });
    });

    document.querySelectorAll('.eliminar-item').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = parseInt(btn.dataset.id);
            await eliminarItem(id);
        });
    });
}

// MRA-117: actualizarCantidad con feedback visual
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
            await cargarCarrito();
        } else {
            const data = await response.json().catch(() => ({}));
            // MRA-117: toast en vez de alert
            mostrarNotificacion(
                data.error || 'No se pudo actualizar la cantidad.',
                'error'
            );
        }
    } catch (error) {
        console.error('Error al actualizar cantidad:', error);
        mostrarNotificacion('Error de conexión al actualizar la cantidad.', 'error');
    }
}

// MRA-117: eliminarItem con feedback visual
async function eliminarItem(id) {
    const nombreItem = carritoItems.find(i => i.id === id)?.plato_nombre || 'El plato';

    try {
        const response = await fetch(`${API_URL}/carrito/${id}`, {
            method: 'DELETE',
            headers: { 'x-session-id': sessionId }
        });

        if (response.ok) {
            mostrarNotificacion(`${nombreItem} eliminado del carrito.`, 'info', 2500);
            await cargarCarrito();
        } else {
            mostrarNotificacion('No se pudo eliminar el plato. Intenta de nuevo.', 'error');
        }
    } catch (error) {
        console.error('Error al eliminar item:', error);
        mostrarNotificacion('Error de conexión al eliminar el plato.', 'error');
    }
}

// MRA-117: vaciarCarrito con feedback visual
async function vaciarCarrito() {
    try {
        const response = await fetch(`${API_URL}/carrito`, {
            method: 'DELETE',
            headers: { 'x-session-id': sessionId }
        });

        if (response.ok) {
            vaciarModal.style.display = 'none';
            mostrarNotificacion('Carrito vaciado correctamente.', 'success', 2500);
            await cargarCarrito();
        } else {
            vaciarModal.style.display = 'none';
            mostrarNotificacion('No se pudo vaciar el carrito. Intenta de nuevo.', 'error');
        }
    } catch (error) {
        console.error('Error al vaciar carrito:', error);
        vaciarModal.style.display = 'none';
        mostrarNotificacion('Error de conexión. No se pudo vaciar el carrito.', 'error');
    }
}

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

vaciarCarritoBtn?.addEventListener('click', () => {
    if (carritoItems.length > 0) {
        vaciarModal.style.display = 'flex';
    } else {
        mostrarNotificacion('El carrito ya está vacío.', 'info', 2500);
    }
});

confirmarVaciarBtn?.addEventListener('click', vaciarCarrito);
cancelarVaciarBtn?.addEventListener('click', () => {
    vaciarModal.style.display = 'none';
});

// Confirmar pedido — lee datos del formulario, sin necesidad de login
continuarPedidoBtn?.addEventListener('click', async () => {
    if (carritoItems.length === 0) {
        mostrarNotificacion('Tu carrito está vacío. Agrega algunos platos primero.', 'warning');
        return;
    }

    // Leer datos del formulario de cliente
    const nombreInput    = document.getElementById('clienteNombre');
    const telefonoInput  = document.getElementById('clienteTelefono');
    const emailInput     = document.getElementById('clienteEmail');
    const notasInput     = document.getElementById('clienteNotas');

    const nombre_cliente    = nombreInput?.value.trim()   || '';
    const telefono_cliente  = telefonoInput?.value.trim() || '';
    const email_cliente     = emailInput?.value.trim()    || '';
    const notas             = notasInput?.value.trim()    || '';

    // Validar nombre (único campo obligatorio)
    if (!nombre_cliente || nombre_cliente.length < 2) {
        nombreInput?.classList.add('error-campo');
        nombreInput?.focus();
        mostrarNotificacion('Por favor ingresa tu nombre para continuar.', 'warning', 4000);
        return;
    }
    nombreInput?.classList.remove('error-campo');

    // Validar email si fue ingresado
    if (email_cliente) {
        const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email_cliente);
        if (!emailOk) {
            emailInput?.classList.add('error-campo');
            emailInput?.focus();
            mostrarNotificacion('El email ingresado no es válido.', 'warning', 4000);
            return;
        }
        emailInput?.classList.remove('error-campo');
    }

    // Calcular totales
    let subtotal = 0;
    carritoItems.forEach(item => {
        subtotal += item.cantidad * parseFloat(item.plato_precio);
    });
    const total = subtotal;

    const items = carritoItems.map(item => ({
        plato_id:                item.plato_id,
        plato_nombre:            item.plato_nombre,
        precio_unitario:         parseFloat(item.plato_precio),
        cantidad:                item.cantidad,
        subtotal:                item.cantidad * parseFloat(item.plato_precio),
        ingredientes_originales: item.ingredientes_originales || '',
        ingredientes_eliminados: item.ingredientes_eliminados || '',
        ingredientes_agregados:  item.ingredientes_agregados  || ''
    }));

    setBtnCargando(continuarPedidoBtn, true, '', 'Enviando pedido...');

    try {
        // MRA-126: Usar fetchConReintentos — 3 intentos, timeout 10s cada uno
        const response = await fetchConReintentos(
            `${API_URL}/pedidos`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-session-id': sessionId
                },
                body: JSON.stringify({
                    items, nombre_cliente, telefono_cliente,
                    email_cliente, notas, subtotal, total
                })
            },
            3,    // máximo 3 intentos
            10000 // timeout de 10 segundos por intento
        );

        const data = await response.json();

        if (response.ok && data.success) {
            mostrarNotificacion(`¡Pedido #${data.pedido.codigo} registrado! Redirigiendo...`, 'success', 3000);
            setTimeout(() => {
                window.location.href = `confirmacion.html?codigo=${data.pedido.codigo}`;
            }, 1200);

        } else if (response.status === 409) {
            // MRA-126: Pedido duplicado — mensaje específico
            mostrarNotificacion(
                'Este pedido ya fue registrado recientemente. Si fue un error, espera unos minutos.',
                'warning', 6000
            );

        } else if (response.status === 400 && data.detalles) {
            data.detalles.forEach((err, i) => {
                setTimeout(() => mostrarNotificacion(err, 'error', 5000), i * 300);
            });

        } else if (response.status >= 500) {
            // MRA-126: Error del servidor — ya se reintentó 3 veces
            mostrarNotificacion(
                'El servidor no está disponible. Intenta de nuevo en unos minutos.',
                'error', 6000
            );

        } else {
            mostrarNotificacion(
                data.error || 'No se pudo registrar el pedido. Intenta de nuevo.',
                'error'
            );
        }

    } catch (error) {
        // MRA-126: Error de red o timeout tras 3 reintentos
        console.error('Error al confirmar pedido (tras reintentos):', error);
        mostrarNotificacion(mensajeErrorRed(error), 'error', 6000);
    } finally {
        setBtnCargando(continuarPedidoBtn, false, '<i class="fas fa-arrow-right"></i> Confirmar pedido');
    }
});

closeModal.forEach(modal => {
    modal.onclick = () => { vaciarModal.style.display = 'none'; };
});

window.onclick = (e) => {
    if (e.target === vaciarModal) vaciarModal.style.display = 'none';
};

// ==================== INICIALIZACIÓN ====================

document.addEventListener('DOMContentLoaded', () => {
    cargarCarrito();
});