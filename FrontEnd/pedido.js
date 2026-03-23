// Configuración
const API_URL = 'http://localhost:3000/api';
let platoActual = null;
let ingredientesBase = [];
let ingredientesAdicionales = [];
let ingredientesEliminados = [];  // IDs de ingredientes base eliminados
let ingredientesAgregados = [];    // IDs de ingredientes adicionales agregados

// Obtener ID del plato de la URL
const urlParams = new URLSearchParams(window.location.search);
const platoId = urlParams.get('id');

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
const confirmModal = document.getElementById('confirmModal');
const closeModal = document.querySelector('.close-modal');
const seguirComprandoBtn = document.getElementById('seguirComprandoBtn');

// Cargar datos del plato
async function cargarPlato() {
    if (!platoId) {
        window.location.href = 'index.html';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/platos/${platoId}`);
        const data = await response.json();

        platoActual = data.plato;
        ingredientesBase = data.ingredientesBase;
        ingredientesAdicionales = data.ingredientesAdicionales;

        // Renderizar UI
        platoNombre.textContent = platoActual.nombre;
        platoDescripcion.textContent = platoActual.descripcion;
        precioBaseSpan.textContent = `$${platoActual.precio}`;

        renderIngredientesBase();
        renderIngredientesAdicionales();
        actualizarResumen();

    } catch (error) {
        console.error('Error al cargar plato:', error);
        platoNombre.textContent = 'Error al cargar el plato';
    }
}

// Renderizar ingredientes base (MRA-15)
function renderIngredientesBase() {
    ingredientesBaseGrid.innerHTML = '';

    ingredientesBase.forEach(ing => {
        const isEliminado = ingredientesEliminados.includes(ing.id);
        const card = document.createElement('div');
        card.className = `ingrediente-card base ${isEliminado ? 'eliminado' : ''}`;
        card.innerHTML = `
            <div class="ingrediente-nombre">${ing.nombre}</div>
            <div class="ingrediente-categoria">${ing.categoria}</div>
            ${isEliminado ? '<i class="fas fa-ban"></i>' : '<i class="fas fa-check"></i>'}
        `;

        card.addEventListener('click', () => toggleIngredienteBase(ing.id));
        ingredientesBaseGrid.appendChild(card);
    });
}

// Renderizar ingredientes adicionales (MRA-17)
function renderIngredientesAdicionales() {
    ingredientesAdicionalesGrid.innerHTML = '';

    ingredientesAdicionales.forEach(ing => {
        const isAgregado = ingredientesAgregados.includes(ing.id);
        const card = document.createElement('div');
        card.className = `ingrediente-card adicional ${isAgregado ? 'agregado' : ''}`;
        card.innerHTML = `
            <div class="ingrediente-nombre">${ing.nombre}</div>
            <div class="ingrediente-precio">+$${ing.precio_extra}</div>
            ${isAgregado ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-plus-circle"></i>'}
        `;

        card.addEventListener('click', () => toggleIngredienteAdicional(ing.id));
        ingredientesAdicionalesGrid.appendChild(card);
    });
}

// Eliminar ingrediente base (MRA-16)
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

// Agregar ingrediente adicional (MRA-17)
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

    ingredientesIncluidosSpan.textContent = ingredientesBaseActivos.length > 0
        ? ingredientesBaseActivos.join(', ')
        : 'Ninguno';

    ingredientesEliminadosSpan.textContent = ingredientesEliminados.length > 0
        ? ingredientesBase.filter(ing => ingredientesEliminados.includes(ing.id)).map(ing => ing.nombre).join(', ')
        : 'Ninguno';

    ingredientesAgregadosSpan.textContent = ingredientesAgregadosNombres.length > 0
        ? ingredientesAgregadosNombres.join(', ')
        : 'Ninguno';

    // Calcular precio total
    try {
        const response = await fetch(`${API_URL}/personalizacion/calcular`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                plato_id: platoId,
                ingredientes_agregados_ids: ingredientesAgregados,
                ingredientes_eliminados_ids: ingredientesEliminados
            })
        });

        const data = await response.json();
        precioTotalSpan.textContent = `$${data.precio_total}`;

    } catch (error) {
        console.error('Error al calcular precio:', error);
        // Fallback: cálculo local aproximado
        let total = parseFloat(platoActual.precio);
        ingredientesAgregados.forEach(id => {
            const ing = ingredientesAdicionales.find(i => i.id === id);
            if (ing) total += parseFloat(ing.precio_extra);
        });
        precioTotalSpan.textContent = `$${total.toFixed(2)}`;
    }
}

// Confirmar pedido
async function confirmarPedido() {
    try {
        const response = await fetch(`${API_URL}/personalizacion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                plato_id: platoId,
                ingredientes_eliminados: ingredientesBase
                    .filter(ing => ingredientesEliminados.includes(ing.id))
                    .map(ing => ing.nombre),
                ingredientes_agregados: ingredientesAdicionales
                    .filter(ing => ingredientesAgregados.includes(ing.id))
                    .map(ing => ing.nombre),
                precio_total: parseFloat(precioTotalSpan.textContent.replace('$', ''))
            })
        });

        const data = await response.json();

        if (data.success) {
            confirmModal.style.display = 'flex';
        } else {
            alert('Error al guardar el pedido');
        }

    } catch (error) {
        console.error('Error al confirmar pedido:', error);
        alert('Error al conectar con el servidor');
    }
}

// Cerrar modal
closeModal.onclick = () => confirmModal.style.display = 'none';
seguirComprandoBtn.onclick = () => confirmModal.style.display = 'none';
window.onclick = (e) => {
    if (e.target === confirmModal) confirmModal.style.display = 'none';
};

// Event listener
confirmarPedidoBtn.addEventListener('click', confirmarPedido);

// Inicializar
cargarPlato();