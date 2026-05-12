-- ============================================================
-- MRA-108: Crear tabla de pedidos
-- ============================================================
-- Descripción: Crea la tabla principal 'pedidos' que almacena
-- la cabecera de cada pedido enviado a cocina, incluyendo
-- datos del cliente, totales y estado del pedido.
-- Idempotente: se puede ejecutar varias veces sin error.
-- ============================================================

-- 1. Crear la tabla 'pedidos' si aún no existe
CREATE TABLE IF NOT EXISTS pedidos (
    id                SERIAL PRIMARY KEY,
    codigo_pedido     VARCHAR(30)     NOT NULL UNIQUE,
    nombre_cliente    VARCHAR(100)    NOT NULL,
    telefono_cliente  VARCHAR(20)     DEFAULT '',
    email_cliente     VARCHAR(150)    DEFAULT '',
    notas             TEXT            DEFAULT '',
    subtotal          NUMERIC(10, 2)  NOT NULL DEFAULT 0,
    total             NUMERIC(10, 2)  NOT NULL DEFAULT 0,
    estado            VARCHAR(20)     NOT NULL DEFAULT 'pendiente',
    created_at        TIMESTAMP       DEFAULT NOW(),
    updated_at        TIMESTAMP       DEFAULT NOW()
);

-- 2. Agregar restricción CHECK para los estados válidos del pedido
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name      = 'pedidos'
          AND constraint_name = 'chk_pedidos_estado'
    ) THEN
        ALTER TABLE pedidos
            ADD CONSTRAINT chk_pedidos_estado
            CHECK (estado IN ('pendiente', 'en_preparacion', 'listo', 'entregado', 'cancelado'));

        RAISE NOTICE 'Restricción CHECK para "estado" agregada.';
    ELSE
        RAISE NOTICE 'La restricción CHECK para "estado" ya existe.';
    END IF;
END;
$$;

-- 3. Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_pedidos_codigo    ON pedidos(codigo_pedido);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado    ON pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_created   ON pedidos(created_at DESC);

-- ============================================================
-- Verificación: muestra la estructura final de la tabla
-- ============================================================
SELECT column_name, data_type, character_maximum_length, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'pedidos'
ORDER BY ordinal_position;