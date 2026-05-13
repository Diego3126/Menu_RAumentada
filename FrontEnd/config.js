// ============================================================
// config.js — Configuración central del frontend
// ============================================================
// Este archivo detecta automáticamente si está en producción
// o desarrollo y configura las URLs correctas.
//
// EN DESARROLLO: apunta a localhost:3000
// EN PRODUCCIÓN: apunta a la URL de Railway (se configura
//                reemplazando RAILWAY_BACKEND_URL abajo)
// ============================================================

const BACKEND_URL = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : 'https://menuraumentada-production.up.railway.app';

const API_URL = `${BACKEND_URL}/api`;

// Exponer globalmente para todos los scripts
window.BACKEND_URL = BACKEND_URL;
window.API_URL     = API_URL;