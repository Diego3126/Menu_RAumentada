// Test script for multiple users
// Requires Node 18+ (global fetch)

const ADMIN_LOGIN = 'http://localhost:8080/api/platos/login';
const BACKEND_API = 'http://localhost:3000/api';

async function login(usuario, password) {
    const params = new URLSearchParams();
    params.append('usuario', usuario);
    params.append('password', password);

    const res = await fetch(ADMIN_LOGIN, { method: 'POST', body: params });
    if (!res.ok) throw new Error(`Login failed for ${usuario}: ${res.status}`);
    return res.json();
}

async function test() {
    try {
        console.log('Logging admin...');
        const admin = await login('admin', '1234');
        console.log('Admin token length:', admin.token.length, 'role:', admin.role);

        console.log('Logging cocinero...');
        const cook = await login('cocinero', '1234');
        console.log('Cocinero token length:', cook.token.length, 'role:', cook.role);

        // Try create plato as admin
        console.log('Admin creating plato...');
        let res = await fetch(`${BACKEND_API}/platos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${admin.token}` },
            body: JSON.stringify({ nombre: 'TEST_AUTO', descripcion: 'desc', precio: 9.99, categoria: 'test' })
        });
        console.log('Create plato status (admin):', res.status);

        // Try create plato as cook (should 403)
        console.log('Cocinero creating plato (should fail)...');
        res = await fetch(`${BACKEND_API}/platos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cook.token}` },
            body: JSON.stringify({ nombre: 'TEST_COOK', descripcion: 'no perm', precio: 1.0, categoria: 'test' })
        });
        console.log('Create plato status (cocinero):', res.status);

        // Try personalizacion as cook (authenticated resource) — should succeed
        console.log('Cocinero posting personalizacion...');
        res = await fetch(`${BACKEND_API}/personalizacion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cook.token}` },
            body: JSON.stringify({ plato_id: 1, ingredientes_eliminados: '', ingredientes_agregados: '', precio_total: 10.0 })
        });
        console.log('Personalizacion status (cocinero):', res.status);

        // Try pedidos recientes (admin only)
        console.log('Getting pedidos recientes (admin)...');
        res = await fetch(`${BACKEND_API}/pedidos/recientes/limite/5`, { headers: { 'Authorization': `Bearer ${admin.token}` } });
        console.log('Pedidos recientes status (admin):', res.status);

        console.log('Tests completed');
    } catch (err) {
        console.error('Test error', err);
    }
}

if (require.main === module) test();
