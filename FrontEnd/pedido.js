// Configuración
// API_URL viene de config.js (cargado antes en el HTML)
// API_URL viene de config.js — no redeclarar
// eslint-disable-next-line no-unused-vars
var API_URL = window.API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : '/api');

console.log('🚀 Iniciando pedido.js');
console.log('🌐 API_URL:', API_URL);

// Obtener ID del plato de la URL
const urlParams = new URLSearchParams(window.location.search);
const platoId = urlParams.get('id');

console.log('📌 Plato ID desde URL:', platoId);

if (!platoId) {
    console.error('❌ No se encontró ID de plato');
    alert('No se especificó qué plato personalizar');
    window.location.href = 'index.html';
}

// Variables globales
let platoActual = null;
let ingredientesBase = [];
let ingredientesAdicionales = [];
let ingredientesEliminados = [];
let ingredientesAgregados = [];

// Elementos DOM
const platoNombre = document.getElementById('platoNombre');
const platoDescripcion = document.getElementById('platoDescripcion');
const precioBaseSpan = document.getElementById('precioBase');
const ingredientesBaseGrid = document.getElementById('ingredientesBaseGrid');
const ingredientesAdicionalesGrid = document.getElementById('ingredientesAdicionalesGrid');
const ingredientesIncluidosSpan = document.getElementById('ingredientesIncluidos');
const ingredientesEliminadosSpan = document.getElementById('ingredientesEliminados');
const ingredientesAgregadosSpan = document.getElementById('ingredientesAgregados');
const precioTotalSpan = document.getElementById('precioTotal');
const confirmarPedidoBtn = document.getElementById('confirmarPedidoBtn');

console.log('📦 Elementos DOM verificados');

// Cargar datos del plato
async function cargarPlato() {
    console.log('🔄 Cargando plato ID:', platoId);

    try {
        const url = `${API_URL}/platos/${platoId}`;
        console.log('📡 Fetching:', url);

        const response = await fetch(url);
        console.log('📥 Status:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ Datos recibidos:', data);

        platoActual = data.plato;
        ingredientesBase = data.ingredientesBase || [];
        ingredientesAdicionales = data.ingredientesAdicionales || [];

        console.log('🍽️ Plato:', platoActual?.nombre);
        console.log('🥬 Ingredientes base:', ingredientesBase.length);
        console.log('➕ Ingredientes adicionales:', ingredientesAdicionales.length);

        // Renderizar UI
        if (platoNombre) platoNombre.textContent = platoActual.nombre;
        if (platoDescripcion) platoDescripcion.textContent = platoActual.descripcion;
        if (precioBaseSpan) precioBaseSpan.textContent = `$${parseFloat(platoActual.precio).toFixed(2)}`;

        renderIngredientesBase();
        renderIngredientesAdicionales();
        actualizarResumen();

    } catch (error) {
        console.error('❌ Error:', error);
        if (platoNombre) {
            platoNombre.textContent = 'Error al cargar';
            platoDescripcion.textContent = error.message;
        }
        alert('Error al cargar el plato: ' + error.message);
    }
}

// Renderizar ingredientes base
function renderIngredientesBase() {
    if (!ingredientesBaseGrid) return;

    ingredientesBaseGrid.innerHTML = '';

    if (ingredientesBase.length === 0) {
        ingredientesBaseGrid.innerHTML = '<p class="no-ingredientes">No hay ingredientes registrados</p>';
        return;
    }

    ingredientesBase.forEach(ing => {
        const isEliminado = ingredientesEliminados.includes(ing.id);
        const card = document.createElement('div');
        card.className = `ingrediente-card base ${isEliminado ? 'eliminado' : ''}`;
        card.innerHTML = `
            <div class="ingrediente-nombre">${ing.nombre}</div>
            <div class="ingrediente-categoria">${ing.categoria || 'base'}</div>
            ${isEliminado ? '<i class="fas fa-ban"></i>' : '<i class="fas fa-check"></i>'}
        `;
        card.addEventListener('click', () => toggleIngredienteBase(ing.id));
        ingredientesBaseGrid.appendChild(card);
    });
}

// Renderizar ingredientes adicionales
function renderIngredientesAdicionales() {
    if (!ingredientesAdicionalesGrid) return;

    ingredientesAdicionalesGrid.innerHTML = '';

    if (ingredientesAdicionales.length === 0) {
        ingredientesAdicionalesGrid.innerHTML = '<p class="no-ingredientes">No hay ingredientes adicionales</p>';
        return;
    }

    ingredientesAdicionales.forEach(ing => {
        const isAgregado = ingredientesAgregados.includes(ing.id);
        const card = document.createElement('div');
        card.className = `ingrediente-card adicional ${isAgregado ? 'agregado' : ''}`;
        card.innerHTML = `
            <div class="ingrediente-nombre">${ing.nombre}</div>
            <div class="ingrediente-precio">+$${parseFloat(ing.precio_extra).toFixed(2)}</div>
            ${isAgregado ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-plus-circle"></i>'}
        `;
        card.addEventListener('click', () => toggleIngredienteAdicional(ing.id));
        ingredientesAdicionalesGrid.appendChild(card);
    });
}

// Eliminar ingrediente base
function toggleIngredienteBase(ingredienteId) {
    const index = ingredientesEliminados.indexOf(ingredienteId);
    if (index === -1) {
        ingredientesEliminados.push(ingredienteId);
    } else {
        ingredientesEliminados.splice(index, 1);
    }
    renderIngredientesBase();
    actualizarResumen();
}

// Agregar ingrediente adicional
function toggleIngredienteAdicional(ingredienteId) {
    const index = ingredientesAgregados.indexOf(ingredienteId);
    if (index === -1) {
        ingredientesAgregados.push(ingredienteId);
    } else {
        ingredientesAgregados.splice(index, 1);
    }
    renderIngredientesAdicionales();
    actualizarResumen();
}

// Actualizar resumen y calcular precio
async function actualizarResumen() {
    // Actualizar listas de texto
    const ingredientesBaseActivos = ingredientesBase
        .filter(ing => !ingredientesEliminados.includes(ing.id))
        .map(ing => ing.nombre);

    const ingredientesAgregadosNombres = ingredientesAdicionales
        .filter(ing => ingredientesAgregados.includes(ing.id))
        .map(ing => ing.nombre);

    if (ingredientesIncluidosSpan) {
        ingredientesIncluidosSpan.textContent = ingredientesBaseActivos.length > 0
            ? ingredientesBaseActivos.join(', ')
            : 'Ninguno';
    }

    if (ingredientesEliminadosSpan) {
        ingredientesEliminadosSpan.textContent = ingredientesEliminados.length > 0
            ? ingredientesBase.filter(ing => ingredientesEliminados.includes(ing.id)).map(ing => ing.nombre).join(', ')
            : 'Ninguno';
    }

    if (ingredientesAgregadosSpan) {
        ingredientesAgregadosSpan.textContent = ingredientesAgregadosNombres.length > 0
            ? ingredientesAgregadosNombres.join(', ')
            : 'Ninguno';
    }

    // Calcular precio total
    try {
        let total = parseFloat(platoActual?.precio || 0);
        ingredientesAgregados.forEach(id => {
            const ing = ingredientesAdicionales.find(i => i.id === id);
            if (ing) total += parseFloat(ing.precio_extra);
        });

        if (precioTotalSpan) {
            precioTotalSpan.textContent = `$${total.toFixed(2)}`;
        }
    } catch (error) {
        console.error('Error al calcular precio:', error);
    }
}

// Agregar al carrito
async function agregarAlCarrito() {
    const ingredientesBaseNombres = ingredientesBase.map(ing => ing.nombre);
    const ingredientesEliminadosNombres = ingredientesBase
        .filter(ing => ingredientesEliminados.includes(ing.id))
        .map(ing => ing.nombre);
    const ingredientesAgregadosNombres = ingredientesAdicionales
        .filter(ing => ingredientesAgregados.includes(ing.id))
        .map(ing => ing.nombre);

    const sessionId = localStorage.getItem('carritoSessionId') ||
        `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('carritoSessionId', sessionId);

    const itemData = {
        plato_id: platoActual.id,
        plato_nombre: platoActual.nombre,
        plato_precio: parseFloat(precioTotalSpan.textContent.replace('$', '')),
        ingredientes_originales: ingredientesBaseNombres.join(', '),
        ingredientes_eliminados: ingredientesEliminadosNombres.join(', ') || 'Ninguno',
        ingredientes_agregados: ingredientesAgregadosNombres.join(', ') || 'Ninguno',
        personalizacion_json: {
            eliminados: ingredientesEliminadosNombres,
            agregados: ingredientesAgregadosNombres
        },
        cantidad: 1
    };

    try {
        const response = await fetch(`${API_URL}/carrito/agregar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-session-id': sessionId
            },
            body: JSON.stringify(itemData)
        });

        const data = await response.json();

        if (data.success) {
            mostrarNotificacion(`${platoActual.nombre} agregado al carrito`);

            if (window.opener) {
                window.opener.actualizarContadorCarrito();
            }

            const seguirComprando = confirm('✅ Plato agregado al carrito. ¿Quieres seguir comprando?');
            if (!seguirComprando) {
                window.location.href = 'carrito.html';
            } else {
                window.location.href = 'index.html';
            }
        } else {
            alert('Error al agregar al carrito');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión al servidor');
    }
}

// Mostrar notificación
function mostrarNotificacion(mensaje) {
    const notificacion = document.createElement('div');
    notificacion.className = 'notificacion';
    notificacion.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${mensaje}</span>
    `;
    document.body.appendChild(notificacion);

    setTimeout(() => {
        notificacion.classList.add('mostrar');
        setTimeout(() => {
            notificacion.classList.remove('mostrar');
            setTimeout(() => notificacion.remove(), 300);
        }, 2000);
    }, 10);
}

// Configurar botón
if (confirmarPedidoBtn) {
    confirmarPedidoBtn.textContent = '🛒 Agregar al Carrito';
    confirmarPedidoBtn.addEventListener('click', agregarAlCarrito);
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM cargado, iniciando carga de plato...');
    cargarPlato();
});