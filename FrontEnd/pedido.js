// Configuración
const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api'
    : '/api';

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
const verRaPedidoBtn = document.getElementById('verRaPedidoBtn');
const arModal = document.getElementById('arModal');
const closeArModalSpan = document.querySelector('.close-ar-modal');
const arCameraPreview = document.getElementById('arCameraPreview');
const cameraSelect = document.getElementById('cameraSelect');
const refreshCamerasBtn = document.getElementById('refreshCamerasBtn');

let arCameraStream = null;
let selectedCameraId = localStorage.getItem('raSelectedCameraId') || '';

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

function sanitizeName(name = '') {
    return name
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

async function cargarCamarasDisponibles() {
    if (!cameraSelect || !navigator.mediaDevices?.enumerateDevices) {
        return;
    }

    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === 'videoinput');

        cameraSelect.innerHTML = '';

        if (cameras.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No hay cámaras disponibles';
            cameraSelect.appendChild(option);
            cameraSelect.disabled = true;
            return;
        }

        cameraSelect.disabled = false;

        cameras.forEach((camera, index) => {
            const option = document.createElement('option');
            option.value = camera.deviceId;
            option.textContent = camera.label || `Cámara ${index + 1}`;
            cameraSelect.appendChild(option);
        });

        const hasSelected = cameras.some(camera => camera.deviceId === selectedCameraId);
        if (!hasSelected) {
            selectedCameraId = cameras[0].deviceId;
        }

        cameraSelect.value = selectedCameraId;
    } catch (error) {
        console.error('No se pudieron listar las cámaras:', error);
    }
}

async function iniciarCamaraRA(deviceId = selectedCameraId) {
    if (!arCameraPreview || !navigator.mediaDevices?.getUserMedia) {
        return;
    }

    if (arCameraStream) {
        detenerCamaraRA();
    }

    try {
        const videoConstraint = deviceId
            ? { deviceId: { exact: deviceId } }
            : { facingMode: { ideal: 'environment' } };

        arCameraStream = await navigator.mediaDevices.getUserMedia({
            video: videoConstraint,
            audio: false
        });
        arCameraPreview.srcObject = arCameraStream;

        const activeTrack = arCameraStream.getVideoTracks()[0];
        const activeDeviceId = activeTrack?.getSettings?.().deviceId;
        if (activeDeviceId) {
            selectedCameraId = activeDeviceId;
            localStorage.setItem('raSelectedCameraId', selectedCameraId);
        }

        await cargarCamarasDisponibles();
    } catch (error) {
        console.error('No se pudo acceder a la camara:', error);
        alert('No se pudo encender la camara. Revisa los permisos del navegador.');
    }
}

function detenerCamaraRA() {
    if (!arCameraStream) return;

    arCameraStream.getTracks().forEach(track => track.stop());
    arCameraStream = null;
    if (arCameraPreview) {
        arCameraPreview.srcObject = null;
    }
}

async function abrirRaDelPlato() {
    if (!platoActual || !arModal) {
        alert('Todavia no se ha cargado el plato. Intenta de nuevo en unos segundos.');
        return;
    }

    arModal.style.display = 'flex';
    await iniciarCamaraRA(selectedCameraId);

    const modelPath = `/models/${sanitizeName(platoActual.nombre)}.glb`;

    if (viewer3D) {
        if (viewer3D.scene) {
            viewer3D.scene.background = null;
        }
        if (viewer3D.renderer) {
            viewer3D.renderer.setClearColor(0x000000, 0);
        }

        viewer3D.loadModel(modelPath, {
            dishId: platoActual.id,
            nombre: platoActual.nombre,
            descripcion: platoActual.descripcion,
            precio: parseFloat(platoActual.precio),
            categoria: platoActual.categoria,
            ingredientes_base: ingredientesBase
        });
    }
}

async function cambiarCamara() {
    if (!cameraSelect) return;

    selectedCameraId = cameraSelect.value;
    localStorage.setItem('raSelectedCameraId', selectedCameraId);
    await iniciarCamaraRA(selectedCameraId);
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

if (verRaPedidoBtn) {
    verRaPedidoBtn.addEventListener('click', abrirRaDelPlato);
}

if (cameraSelect) {
    cameraSelect.addEventListener('change', cambiarCamara);
}

if (refreshCamerasBtn) {
    refreshCamerasBtn.addEventListener('click', cargarCamarasDisponibles);
}

if (navigator.mediaDevices?.addEventListener) {
    navigator.mediaDevices.addEventListener('devicechange', () => {
        if (arModal?.style.display === 'flex') {
            cargarCamarasDisponibles();
        }
    });
}

if (closeArModalSpan) {
    closeArModalSpan.onclick = () => {
        arModal.style.display = 'none';
        detenerCamaraRA();
        if (viewer3D) {
            viewer3D.reset();
        }
    };
}

window.addEventListener('click', (e) => {
    if (e.target === arModal) {
        arModal.style.display = 'none';
        detenerCamaraRA();
        if (viewer3D) {
            viewer3D.reset();
        }
    }
});

window.addEventListener('beforeunload', () => {
    detenerCamaraRA();
});

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM cargado, iniciando carga de plato...');
    cargarPlato();
});