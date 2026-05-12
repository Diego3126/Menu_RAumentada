// Admin panel JS - requires ADMIN role
const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:3000/api'
    : '/api';

function getAuthToken() { return localStorage.getItem('authToken'); }
function getAuthRole() { return localStorage.getItem('authRole'); }

function redirectIfNotAdmin() {
    const role = getAuthRole();
    if (role !== 'ADMIN') {
        window.location.href = 'login.html';
        throw new Error('Not admin');
    }
}

async function fetchWithAuth(url, options = {}) {
    const token = getAuthToken();
    options.headers = options.headers || {};
    if (token) options.headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, options);
    if (!res.ok) throw res;
    return res;
}

async function loadPlatos() {
    const list = document.getElementById('adminPlatosList');
    list.textContent = 'Cargando...';
    try {
        const res = await fetch(`${API_URL}/platos`);
        const platos = await res.json();
        list.innerHTML = '';
        platos.forEach(p => {
            const el = document.createElement('div');
            el.className = 'admin-plato';
            el.innerHTML = `<strong>${p.nombre}</strong> — $${parseFloat(p.precio).toFixed(2)} <button data-id="${p.id}" class="del">Eliminar</button>`;
            list.appendChild(el);
        });

        // attach delete
        list.querySelectorAll('.del').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                try {
                    await fetchWithAuth(`${API_URL}/platos/${id}`, { method: 'DELETE' });
                    loadPlatos();
                } catch (err) {
                    console.error('delete error', err);
                    alert('Error eliminando plato');
                }
            });
        });

    } catch (err) {
        console.error(err);
        list.textContent = 'Error al cargar platos';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    redirectIfNotAdmin();
    const info = document.getElementById('adminInfo');
    info.textContent = `Conectado como ADMIN`;

    loadPlatos();

    const form = document.getElementById('createPlatoForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nombre = document.getElementById('p_nombre').value.trim();
        const precio = parseFloat(document.getElementById('p_precio').value);
        const categoria = document.getElementById('p_categoria').value.trim();
        try {
            const res = await fetchWithAuth(`${API_URL}/platos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, precio, categoria })
            });
            const data = await res.json();
            document.getElementById('createResult').textContent = 'Creado: ' + data.nombre;
            form.reset();
            loadPlatos();
        } catch (err) {
            console.error('create error', err);
            document.getElementById('createResult').textContent = 'Error al crear plato';
        }
    });
});