-- ============================================================
-- MRA-63: Asignar rol a usuarios existentes
-- ============================================================
-- Descripción: Asigna roles correctos a los usuarios que
-- ya existen en la base de datos.
-- Estrategia:
--   • El primer usuario creado (id más bajo) se marca como 'admin'.
--   • Todos los demás quedan como 'cocinero' (valor por defecto).
-- Ajusta los UPDATE según los usuarios reales de tu proyecto.
-- ============================================================

-- 1. Asegurarse de que todos los usuarios existentes tengan un rol
--    (por si ya había registros antes de agregar el campo)
UPDATE usuarios
SET rol = 'cocinero'
WHERE rol IS NULL OR rol = '';

-- 2. Promover al primer usuario como administrador
--    (el que tenga el id más bajo, asumiendo que fue el creador del sistema)
UPDATE usuarios
SET    rol        = 'admin',
       updated_at = NOW()
WHERE  id = (SELECT MIN(id) FROM usuarios);

-- ============================================================
-- BLOQUE OPCIONAL: asignación manual por email
-- Descomenta y edita los emails según tu equipo.
-- ============================================================
/*
-- Asignar rol 'admin' por email
UPDATE usuarios
SET    rol        = 'admin',
       updated_at = NOW()
WHERE  email IN (
    'admin@restaurante.com',
    'santiago@restaurante.com'   -- reemplaza con el email real
);

-- Asignar rol 'cocinero' explícitamente por email
UPDATE usuarios
SET    rol        = 'cocinero',
       updated_at = NOW()
WHERE  email IN (
    'cocinero1@restaurante.com',
    'cocinero2@restaurante.com'  -- reemplaza con los emails reales
);
*/

-- ============================================================
-- Insertar usuarios de prueba si la tabla está vacía
-- (útil para desarrollo/testing)
-- ============================================================
DO $$
BEGIN
    IF (SELECT COUNT(*) FROM usuarios) = 0 THEN

        INSERT INTO usuarios (nombre, email, password, rol) VALUES
            ('Admin Principal',  'admin@restaurante.com',    '$2b$10$placeholder_hash_admin',    'admin'),
            ('Chef Santiago',    'santiago@restaurante.com', '$2b$10$placeholder_hash_santiago', 'cocinero'),
            ('Chef Samuel',      'samuel@restaurante.com',   '$2b$10$placeholder_hash_samuel',   'cocinero');

        RAISE NOTICE 'Usuarios de prueba insertados.';
    ELSE
        RAISE NOTICE 'Ya existen usuarios en la tabla. No se insertaron datos de prueba.';
    END IF;
END;
$$;

-- ============================================================
-- Verificación final: resumen de usuarios y sus roles
-- ============================================================
SELECT
    id,
    nombre,
    email,
    rol,
    created_at
FROM usuarios
ORDER BY rol, id;
