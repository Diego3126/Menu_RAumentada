require('dotenv').config();

console.log('=== VERIFICANDO .env ===');
console.log('DATABASE_URL existe:', !!process.env.DATABASE_URL);
console.log('PORT:', process.env.PORT);

if (process.env.DATABASE_URL) {
    // Mostrar URL ocultando contraseña
    const url = process.env.DATABASE_URL;
    const hiddenUrl = url.replace(/:[^:@]+@/, ':****@');
    console.log('URL:', hiddenUrl);
} else {
    console.log('❌ DATABASE_URL no encontrada en .env');
    console.log('💡 Asegúrate de que el archivo .env existe en la carpeta backend');
}