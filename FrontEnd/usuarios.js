// Frontend functions to manage users (admin)
const API_URL = 'http://localhost:3000/api';

async function cargarUsuarios() {
    const token = localStorage.getItem('token');
    const tbody = document.getElementById('usuariosTableBody');
    try {
        const res = await fetch(`${API_URL}/usuarios`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) throw await res.json();
        const usuarios = await res.json();
        if (!usuarios || usuarios.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Sin usuarios</td></tr>';
                return;
            }
        tbody.innerHTML = usuarios.map(u => `
            <tr>
                <td>${u.id}</td>
                <td>${u.nombre}</td>
                <td>${u.email}</td>
                <td>
                    <select data-id="${u.id}" class="rol-select">
                        <option value="cocinero" ${u.rol==='cocinero'?'selected':''}>cocinero</option>
                        <option value="admin" ${u.rol==='admin'?'selected':''}>admin</option>
                    </select>
                </td>
                <td>
                    <button class="btn-guardar" data-id="${u.id}">Guardar</button>
                </td>
            </tr>
        `).join('');

        // Attach handlers
        document.querySelectorAll('.btn-guardar').forEach(btn => {
                btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const select = document.querySelector(`select[data-id=\"${id}\"]`);
                const rol = select.value;
                try {
                    const res = await fetch(`${API_URL}/usuarios/${id}/rol`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        },
                        body: JSON.stringify({ rol })
                    });
                    const data = await res.json();
                    if (!res.ok) {
                        showToast(data.error || 'Error actualizando rol', 'error');
                        return;
                    }
                    showToast('Rol actualizado', 'success');
                    cargarUsuarios();
                } catch (err) {
                    console.error('Error actualizando rol', err);
                    showToast(err.error || 'Error actualizando rol', 'error');
                }
            });
        });

    } catch (err) {
        console.error('Error cargando usuarios', err);
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Error al cargar usuarios</td></tr>';
    }
}

async function crearUsuario(event) {
    event.preventDefault();
    const nombre = document.getElementById('u_nombre').value.trim();
    const email = document.getElementById('u_email').value.trim();
    const password = document.getElementById('u_password').value;
    const rol = document.getElementById('u_rol').value;
    const feedback = document.getElementById('crearFeedback');

        if (!nombre || !email || !password) {
        feedback.textContent = 'Por favor completa todos los campos';
        showToast('Por favor completa todos los campos', 'error');
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_URL}/usuarios/registro`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ nombre, email, password, rol })
        });
        const data = await res.json();
        if (!res.ok) {
            showToast(data.error || 'Error creando usuario', 'error');
            feedback.textContent = data.error || 'Error creando usuario';
            return;
        }
        showToast('Usuario creado correctamente', 'success');
        feedback.textContent = 'Usuario creado correctamente';
        document.getElementById('formCrearUsuario').reset();
        cargarUsuarios();
    } catch (err) {
        console.error('Error creando usuario', err);
        feedback.textContent = err.error || 'Error creando usuario';
        showToast(err.error || 'Error creando usuario', 'error');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const usuario = requireRol('admin');
    if (!usuario) return;
    renderUserInfo(usuario);

    cargarUsuarios();
    document.getElementById('formCrearUsuario').addEventListener('submit', crearUsuario);
});
