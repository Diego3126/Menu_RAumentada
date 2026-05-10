const fetch = global.fetch || require('node-fetch');

async function run() {
    const res = await fetch('http://localhost:3000/api/usuarios/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.argv[2] || ''}` },
        body: JSON.stringify({ nombre: 'Prueba UI', email: `prueba_ui_${Date.now()}@example.com`, password: 'pass1234', rol: 'cocinero' })
    });
    console.log('Status:', res.status);
    console.log('Body:', await res.json());
}

run().catch(err => { console.error(err); process.exit(1); });
