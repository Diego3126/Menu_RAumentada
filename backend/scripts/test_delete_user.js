const fetch = global.fetch || require('node-fetch');

async function run() {
    const token = process.argv[2];
    const userId = process.argv[3] || '4';
    if (!token) {
        console.error('Uso: node test_delete_user.js <token> [userId]');
        process.exit(1);
    }

    const res = await fetch(`http://localhost:3000/api/usuarios/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Status:', res.status);
    console.log('Body:', await res.json());
}

run().catch(err => { console.error(err); process.exit(1); });
