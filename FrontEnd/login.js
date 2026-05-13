// Login helper for FrontEnd
const ADMIN_LOGIN_URL = `${window.API_URL || '/api'}/platos/login`;

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    const msg = document.getElementById('loginMessage');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const usuario = document.getElementById('usuario').value.trim();
        const password = document.getElementById('password').value;

        try {
            const params = new URLSearchParams();
            params.append('usuario', usuario);
            params.append('password', password);

            const res = await fetch(ADMIN_LOGIN_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params.toString()
            });

            if (!res.ok) {
                msg.textContent = 'Credenciales inválidas';
                return;
            }

            const data = await res.json();
            // Guardar token y rol
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('authRole', data.role);

            // Redirigir al index
            window.location.href = 'index.html';
        } catch (err) {
            console.error('Login error', err);
            msg.textContent = 'Error de conexión al servidor de autenticación';
        }
    });
});