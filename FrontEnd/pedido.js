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
const detectPointsBtn = document.getElementById('detectPointsBtn');
const nativeArBtn = document.getElementById('nativeArBtn');
const featureDetectionResult = document.getElementById('featureDetectionResult');
const nativeArViewer = document.getElementById('nativeArViewer');
const TEST_MODEL_PATH = '/models/ensalada-cesar.glb';

const FEATURE_API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:5200/api/v1/features/detect'
    : '/api/v1/features/detect';
const AUTO_DETECT_INTERVAL_MS = 160;

let arCameraStream = null;
let selectedCameraId = localStorage.getItem('raSelectedCameraId') || '';
let autoDetectTimer = null;
let autoDetectInFlight = false;

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

    if (debeUsarARNativo()) {
        const opened = await abrirARNativo();
        if (opened) {
            return;
        }
    }

    arModal.style.display = 'flex';
    await iniciarCamaraRA(selectedCameraId);

    const modelPath = resolveModelPath(platoActual.nombre);

    if (viewer3D) {
        requestAnimationFrame(() => {
            viewer3D.onWindowResize();
        });

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

    if (featureDetectionResult) {
        featureDetectionResult.textContent = 'Analizando superficie automáticamente en tiempo real...';
    }

    iniciarDeteccionAutomatica();
}

function resolveModelPath(nombrePlato) {
    const displayName = (nombrePlato || '').trim().toLowerCase();
    const normalizedName = sanitizeName((nombrePlato || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''));

    if (displayName.includes('ensalada césar') || normalizedName.includes('ensalada-cesar') || normalizedName.includes('caesar-salad')) {
        return TEST_MODEL_PATH;
    }

    return `/models/${normalizedName}.glb`;
}

function resolveNativeModelAssets(nombrePlato) {
    const glb = resolveModelPath(nombrePlato);
    const usdz = glb.replace(/\.glb$/i, '.usdz');
    return { glb, usdz };
}

function esMovil() {
    return /android|iphone|ipad|ipod/i.test(navigator.userAgent || '');
}

function debeUsarARNativo() {
    return esMovil() && nativeArViewer && typeof nativeArViewer.activateAR === 'function';
}

async function existeArchivo(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch (_error) {
        return false;
    }
}

async function abrirARNativo() {
    if (!platoActual || !nativeArViewer) {
        return false;
    }

    const assets = resolveNativeModelAssets(platoActual.nombre);
    nativeArViewer.setAttribute('src', assets.glb);

    const hasUsdz = await existeArchivo(assets.usdz);
    if (hasUsdz) {
        nativeArViewer.setAttribute('ios-src', assets.usdz);
    } else {
        nativeArViewer.removeAttribute('ios-src');
    }

    try {
        await nativeArViewer.activateAR();
        return true;
    } catch (error) {
        console.warn('No se pudo abrir AR nativo, usando fallback web:', error);
        return false;
    }
}

function capturarFrameCamara() {
    if (!arCameraPreview || !arCameraPreview.videoWidth || !arCameraPreview.videoHeight) {
        throw new Error('La cámara todavía no está lista');
    }

    const canvas = document.createElement('canvas');
    canvas.width = arCameraPreview.videoWidth;
    canvas.height = arCameraPreview.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
        throw new Error('No se pudo crear el contexto de captura');
    }

    context.drawImage(arCameraPreview, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.92);
}

async function detectarPuntosEnCamara() {
    return detectarPuntosEnCamaraCore({ silent: false, fromAuto: false });
}

async function detectarPuntosEnCamaraCore({ silent = false, fromAuto = false } = {}) {
    if (autoDetectInFlight) return;

    if (!fromAuto && !detectPointsBtn) return;

    try {
        autoDetectInFlight = true;

        if (detectPointsBtn && !fromAuto) {
            detectPointsBtn.disabled = true;
            detectPointsBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analizando';
        }

        const imageBase64 = capturarFrameCamara();
        const response = await fetch(FEATURE_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                frame_id: `camera-${Date.now()}`,
                source: 'frontend-camera',
                mime_type: 'image/jpeg',
                detector: 'orb',
                image_base64: imageBase64
            })
        });

        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || data.detail || 'No fue posible detectar puntos');
        }

        const featureCount = data.data?.total_features ?? 0;
        const detector = data.data?.detector ?? 'orb';
        const keypoints = data.data?.keypoints || [];
        const imageWidth = data.data?.image_width || 0;
        const imageHeight = data.data?.image_height || 0;

        if (viewer3D && typeof viewer3D.updateSurfaceAnchorFromFeatures === 'function') {
            viewer3D.updateSurfaceAnchorFromFeatures(keypoints, imageWidth, imageHeight);
        }

        if (featureDetectionResult) {
            featureDetectionResult.textContent = `Detector ${detector.toUpperCase()}: ${featureCount} puntos detectados. Anclaje en tiempo real activo.`;
        }
    } catch (error) {
        console.error('Error detectando puntos en cámara:', error);
        if (featureDetectionResult) {
            featureDetectionResult.textContent = `Error al detectar puntos: ${error.message}`;
        }
        if (!silent && !fromAuto) {
            alert(`No se pudieron detectar puntos: ${error.message}`);
        }
    } finally {
        autoDetectInFlight = false;

        if (detectPointsBtn && !fromAuto) {
            detectPointsBtn.disabled = false;
            detectPointsBtn.innerHTML = '<i class="fas fa-crosshairs"></i> Detectar';
        }
    }
}

function iniciarDeteccionAutomatica() {
    detenerDeteccionAutomatica();

    detectarPuntosEnCamaraCore({ silent: true, fromAuto: true });
    autoDetectTimer = setInterval(() => {
        if (!arModal || arModal.style.display !== 'flex') return;
        detectarPuntosEnCamaraCore({ silent: true, fromAuto: true });
    }, AUTO_DETECT_INTERVAL_MS);
}

function detenerDeteccionAutomatica() {
    if (autoDetectTimer) {
        clearInterval(autoDetectTimer);
        autoDetectTimer = null;
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

if (detectPointsBtn) {
    detectPointsBtn.style.display = 'none';
    detectPointsBtn.addEventListener('click', detectarPuntosEnCamara);
}

if (nativeArBtn) {
    nativeArBtn.addEventListener('click', async () => {
        const opened = await abrirARNativo();
        if (!opened) {
            alert('ARCore/ARKit no está disponible en este dispositivo o navegador. Se usará modo web.');
        }
    });
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
        detenerDeteccionAutomatica();
        detenerCamaraRA();
        if (viewer3D) {
            viewer3D.reset();
        }
    };
}

window.addEventListener('click', (e) => {
    if (e.target === arModal) {
        arModal.style.display = 'none';
        detenerDeteccionAutomatica();
        detenerCamaraRA();
        if (viewer3D) {
            viewer3D.reset();
        }
    }
});

window.addEventListener('beforeunload', () => {
    detenerDeteccionAutomatica();
    detenerCamaraRA();
});

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM cargado, iniciando carga de plato...');
    cargarPlato();
});