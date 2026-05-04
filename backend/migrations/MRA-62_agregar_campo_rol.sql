-- ============================================================
-- MRA-62: Agregar campo 'rol' en la tabla de usuarios
-- ============================================================
-- Descripción: Agrega el campo 'rol' a la tabla de usuarios
-- con soporte para los valores 'admin' y 'cocinero'.
-- Si la tabla 'usuarios' no existe, la crea desde cero.
-- ============================================================

-- 1. Crear la tabla 'usuarios' si aún no existe
CREATE TABLE IF NOT EXISTS usuarios (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(100) NOT NULL,
    email       VARCHAR(150) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

-- 2. Agregar el campo 'rol' si todavía no existe
--    (idempotente: se puede ejecutar varias veces sin error)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'usuarios'
          AND column_name = 'rol'
    ) THEN
        ALTER TABLE usuarios
            ADD COLUMN rol VARCHAR(20) NOT NULL DEFAULT 'cocinero';

        RAISE NOTICE 'Columna "rol" agregada a la tabla usuarios.';
    ELSE
        RAISE NOTICE 'La columna "rol" ya existe en la tabla usuarios. No se realizaron cambios.';
    END IF;
END;
$$;

-- 3. Agregar restricción CHECK para validar los valores permitidos
--    Solo se agrega si no existe ya la restricción
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name       = 'usuarios'
          AND constraint_name  = 'chk_usuarios_rol'
    ) THEN
        ALTER TABLE usuarios
            ADD CONSTRAINT chk_usuarios_rol
            CHECK (rol IN ('admin', 'cocinero'));

        RAISE NOTICE 'Restricción CHECK para "rol" agregada.';
    ELSE
        RAISE NOTICE 'La restricción CHECK para "rol" ya existe.';
    END IF;
END;
$$;

-- 4. Crear índice para consultas rápidas por rol
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);

-- ============================================================
-- Verificación: muestra la estructura final de la tabla
-- ============================================================
SELECT column_name, data_type, character_maximum_length, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'usuarios'
ORDER BY ordinal_position;
