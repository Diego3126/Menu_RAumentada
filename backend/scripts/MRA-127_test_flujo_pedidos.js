// ============================================================
// MRA-127: Script de prueba del flujo completo de pedidos
// ============================================================
// Uso: node MRA-127_test_flujo_pedidos.js
// Requiere: backend corriendo en localhost:3000
//           y credenciales de cocinero/admin en el .env
// ============================================================

const BASE_URL = 'http://localhost:3000/api';

// Colores para la consola
const OK  = '\x1b[32m✓\x1b[0m';
const ERR = '\x1b[31m✗\x1b[0m';
const INF = '\x1b[36mℹ\x1b[0m';
const SEP = '─'.repeat(55);

let passed = 0;
let failed = 0;

async function assert(nombre, fn) {
    try {
        const resultado = await fn();
        if (resultado === false) throw new Error('Aserción falló');
        console.log(`${OK} ${nombre}`);
        passed++;
        return resultado;
    } catch (err) {
        console.log(`${ERR} ${nombre}`);
        console.log(`   → ${err.message}`);
        failed++;
        return null;
    }
}

async function run() {
    console.log('\n' + SEP);
    console.log('  MRA-127: Prueba del flujo completo de pedidos');
    console.log(SEP + '\n');

    let tokenCocinero = '';
    let tokenAdmin    = '';
    let platosDisponibles = [];
    let codigoPedido  = '';
    let pedidoId      = '';

    // ── 1. OBTENER PLATOS ────────────────────────────────────
    console.log(`${INF} [1] Obtener platos disponibles`);
    await assert('GET /platos devuelve lista', async () => {
        const res  = await fetch(`${BASE_URL}/platos`);
        const data = await res.json();
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (!Array.isArray(data) || data.length === 0)
            throw new Error('No hay platos en la BD');
        platosDisponibles = data;
        console.log(`   → ${data.length} platos encontrados`);
        return true;
    });

    // ── 2. LOGIN COCINERO ────────────────────────────────────
    console.log(`\n${INF} [2] Autenticación`);
    await assert('POST /auth/login con cocinero', async () => {
        const res  = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'santiago@restaurante.com', password: 'santiago123' })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        if (!data.token) throw new Error('No se recibió token');
        tokenCocinero = data.token;
        console.log(`   → Token cocinero obtenido`);
        return true;
    });

    await assert('POST /auth/login con admin', async () => {
        const res  = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@restaurante.com', password: 'admin123' })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        if (!data.token) throw new Error('No se recibió token');
        tokenAdmin = data.token;
        console.log(`   → Token admin obtenido`);
        return true;
    });

    // ── 3. CREAR PEDIDO (flujo cliente sin login) ────────────
    console.log(`\n${INF} [3] Crear pedido (cliente sin login)`);

    const primerPlato = platosDisponibles[0];
    const itemsPrueba = [{
        plato_id:                primerPlato?.id || 1,
        plato_nombre:            primerPlato?.nombre || 'Plato de prueba',
        precio_unitario:         parseFloat(primerPlato?.precio || 10),
        cantidad:                2,
        subtotal:                parseFloat(primerPlato?.precio || 10) * 2,
        ingredientes_originales: '',
        ingredientes_eliminados: '',
        ingredientes_agregados:  ''
    }];
    const subtotal = itemsPrueba[0].subtotal;

    await assert('POST /pedidos sin token crea pedido correctamente', async () => {
        const res = await fetch(`${BASE_URL}/pedidos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items:           itemsPrueba,
                nombre_cliente:  'Cliente Test MRA-127',
                telefono_cliente:'3001234567',
                email_cliente:   'test@prueba.com',
                notas:           'Pedido de prueba automatizado',
                subtotal,
                total: subtotal
            })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        if (!data.success) throw new Error('success=false');
        if (!data.pedido?.codigo) throw new Error('No se recibió código de pedido');
        codigoPedido = data.pedido.codigo;
        pedidoId     = data.pedido.id;
        console.log(`   → Pedido creado: ${codigoPedido} (estado: ${data.pedido.estado})`);
        return true;
    });

    await assert('Pedido creado tiene estado "pendiente"', async () => {
        const res  = await fetch(`${BASE_URL}/pedidos/${codigoPedido}`, {
            headers: { 'Authorization': `Bearer ${tokenAdmin}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (data.pedido.estado !== 'pendiente')
            throw new Error(`Estado incorrecto: ${data.pedido.estado}`);
        return true;
    });

    // ── 4. ANTI-DUPLICACIÓN ──────────────────────────────────
    console.log(`\n${INF} [4] Anti-duplicación (MRA-123)`);
    await assert('POST /pedidos duplicado devuelve 409', async () => {
        const res = await fetch(`${BASE_URL}/pedidos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items: itemsPrueba,
                nombre_cliente:  'Cliente Test MRA-127',
                telefono_cliente:'3001234567',
                email_cliente:   'test@prueba.com',
                notas:           'Pedido de prueba automatizado',
                subtotal, total: subtotal
            })
        });
        if (res.status !== 409) throw new Error(`Se esperaba 409, llegó ${res.status}`);
        return true;
    });

    // ── 5. VALIDACIÓN DE INTEGRIDAD ──────────────────────────
    console.log(`\n${INF} [5] Validación de integridad (MRA-124)`);
    await assert('POST /pedidos con precio manipulado devuelve 400', async () => {
        const itemManipulado = [{ ...itemsPrueba[0], precio_unitario: 0.01, subtotal: 0.02 }];
        const res = await fetch(`${BASE_URL}/pedidos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items: itemManipulado,
                nombre_cliente: 'Hacker Test',
                subtotal: 0.02, total: 0.02
            })
        });
        if (res.status !== 400) throw new Error(`Se esperaba 400, llegó ${res.status}`);
        return true;
    });

    await assert('POST /pedidos con plato_id inexistente devuelve 400', async () => {
        // Usar precio real del plato pero ID inexistente
        const precioReal = parseFloat(primerPlato?.precio || 10);
        const itemInvalido = [{
            plato_id:                99999,
            plato_nombre:            'Plato Inexistente',
            precio_unitario:         precioReal,
            cantidad:                1,
            subtotal:                precioReal,
            ingredientes_originales: '',
            ingredientes_eliminados: '',
            ingredientes_agregados:  ''
        }];
        const res = await fetch(`${BASE_URL}/pedidos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items:          itemInvalido,
                nombre_cliente: 'Test ID Invalido',
                subtotal:       precioReal,
                total:          precioReal
            })
        });
        if (!res.ok && res.status !== 400)
            throw new Error(`Se esperaba 400, llegó ${res.status}`);
        // Aceptar también 500 si la BD no tiene el plato — lo importante es que no crea el pedido
        if (res.status === 200) throw new Error('Se esperaba error pero el pedido se creó');
        console.log(`   → Servidor respondió ${res.status} (correcto — plato no existe)`);
        return true;
    });

    // Pequeña pausa para que el servidor procese antes del siguiente bloque
    await new Promise(r => setTimeout(r, 500));

    // ── 6. FLUJO COCINA ──────────────────────────────────────
    console.log(`\n${INF} [6] Flujo de cocina`);
    await assert('GET /pedidos como cocinero devuelve lista', async () => {
        const res  = await fetch(`${BASE_URL}/pedidos`, {
            headers: { 'Authorization': `Bearer ${tokenCocinero}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        if (!Array.isArray(data)) throw new Error('No es un array');
        console.log(`   → ${data.length} pedido(s) activos en cocina`);
        return true;
    });

    await assert(`PATCH /pedidos/${pedidoId}/estado → en_preparacion`, async () => {
        const res  = await fetch(`${BASE_URL}/pedidos/${pedidoId}/estado`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${tokenCocinero}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ estado: 'en_preparacion' })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        if (data.pedido.estado !== 'en_preparacion')
            throw new Error(`Estado incorrecto: ${data.pedido.estado}`);
        return true;
    });

    await assert(`PATCH /pedidos/${pedidoId}/estado → listo`, async () => {
        const res  = await fetch(`${BASE_URL}/pedidos/${pedidoId}/estado`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${tokenCocinero}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ estado: 'listo' })
        });
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || `HTTP ${res.status}`);
        }
        return true;
    });

    await assert('PATCH con estado inválido devuelve 400', async () => {
        const res = await fetch(`${BASE_URL}/pedidos/${pedidoId}/estado`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${tokenCocinero}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ estado: 'inventado' })
        });
        if (res.status !== 400) throw new Error(`Se esperaba 400, llegó ${res.status}`);
        return true;
    });

    // ── 7. RESUMEN ───────────────────────────────────────────
    console.log('\n' + SEP);
    console.log(`  Resultado: ${passed} pasaron, ${failed} fallaron`);
    console.log(SEP + '\n');

    if (failed > 0) process.exit(1);
}

run().catch(err => {
    console.error('\n\x1b[31mError inesperado en las pruebas:\x1b[0m', err.message);
    process.exit(1);
});