const fetch = global.fetch || require('node-fetch');

async function test() {
    const res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@restaurante.com', password: 'admin123' })
    });
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Body:', data);
}

test().catch(err => { console.error('Error:', err); process.exit(1); });
