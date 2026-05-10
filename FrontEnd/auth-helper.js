// ============================================================
// auth-helper.js
// MRA-66: Proteger páginas según rol en el frontend
// MRA-70: Logout funcional
// Incluir este script en admin.html y cocina.html
// ============================================================

const API_URL = 'http://localhost:3000/api';

/**
 * Obtiene el usuario de localStorage.
 * Redirige a login si no hay sesión.
 */
function getUsuario() {
    const token   = localStorage.getItem('token');
    const usuario = localStorage.getItem('usuario');
    if (!token || !usuario) {
        window.location.href = '/login';
        return null;
    }
    return JSON.parse(usuario);
}

/**
 * Verifica que el rol del usuario sea el esperado.
 * Si no, redirige al destino correspondiente.
 */
function requireRol(rolRequerido) {
    const usuario = getUsuario();
    if (!usuario) return null;

    if (usuario.rol !== rolRequerido) {
        // Redirigir a la vista correcta para su rol
        window.location.href = usuario.rol === 'admin' ? '/admin.html' : '/cocina.html';
        return null;
    }

    return usuario;
}

/**
 * MRA-70: Cierra sesión — elimina datos locales y avisa al backend.
 */
async function logout() {
    const token = localStorage.getItem('token');

    // Limpiar datos locales primero (funciona aunque el backend falle)
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');

    // Avisar al backend (opcional, no bloquea)
    if (token) {
        try {
            await fetch(`${API_URL}/auth/logout`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (_) { /* si el servidor no responde, igual cerramos sesión */ }
    }

    window.location.href = '/login';
}

/**
 * Renderiza el header de usuario en el elemento con id="userInfo"
 * Espera: <div id="userInfo"></div> en la página
 */
function renderUserInfo(usuario) {
    const el = document.getElementById('userInfo');
    if (!el || !usuario) return;

    const rolColor = usuario.rol === 'admin' ? '#ff8c42' : '#4caf50';
    const rolIcon  = usuario.rol === 'admin' ? '🛡️' : '👨‍🍳';

    el.innerHTML = `
        <div style="display:flex;align-items:center;gap:0.8rem;">
            <div style="text-align:right;">
                <div style="font-weight:600;font-size:0.95rem;">${usuario.nombre}</div>
                <div style="font-size:0.75rem;color:${rolColor};">${rolIcon} ${usuario.rol}</div>
            </div>
            <button onclick="logout()" style="
                background:rgba(255,255,255,0.1);
                border:1px solid rgba(255,255,255,0.2);
                color:white;
                padding:0.45rem 0.9rem;
                border-radius:8px;
                cursor:pointer;
                font-size:0.8rem;
                font-family:inherit;
                transition:background 0.2s;
            " onmouseover="this.style.background='rgba(255,92,92,0.2)'"
               onmouseout="this.style.background='rgba(255,255,255,0.1)'">
                Salir
            </button>
        </div>
    `;
}

// Exponer globalmente
window.getUsuario    = getUsuario;
window.requireRol    = requireRol;
window.logout        = logout;
window.renderUserInfo = renderUserInfo;
