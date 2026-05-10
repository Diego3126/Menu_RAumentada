-- ============================================================
-- MRA-109: Crear tabla de detalle de pedidos
-- ============================================================
-- Descripción: Crea la tabla 'pedido_detalles' que almacena
-- cada ítem individual de un pedido, incluyendo el plato,
-- personalizaciones de ingredientes, precio y cantidad.
-- Depende de: MRA-108 (tabla pedidos debe existir primero).
-- Idempotente: se puede ejecutar varias veces sin error.
-- ============================================================

-- 1. Crear la tabla 'pedido_detalles' si aún no existe
CREATE TABLE IF NOT EXISTS pedido_detalles (
    id                       SERIAL PRIMARY KEY,
    pedido_id                INTEGER         NOT NULL,
    plato_id                 INTEGER         NOT NULL,
    plato_nombre             VARCHAR(150)    NOT NULL,
    ingredientes_originales  TEXT            DEFAULT '',
    ingredientes_eliminados  TEXT            DEFAULT '',
    ingredientes_agregados   TEXT            DEFAULT '',
    precio_unitario          NUMERIC(10, 2)  NOT NULL,
    cantidad                 INTEGER         NOT NULL DEFAULT 1,
    subtotal                 NUMERIC(10, 2)  NOT NULL,
    created_at               TIMESTAMP       DEFAULT NOW()
);

-- 2. Agregar clave foránea hacia pedidos (si no existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name      = 'pedido_detalles'
          AND constraint_name = 'fk_pedido_detalles_pedido'
    ) THEN
        ALTER TABLE pedido_detalles
            ADD CONSTRAINT fk_pedido_detalles_pedido
            FOREIGN KEY (pedido_id)
            REFERENCES pedidos(id)
            ON DELETE CASCADE;

        RAISE NOTICE 'Clave foránea hacia "pedidos" agregada.';
    ELSE
        RAISE NOTICE 'La clave foránea hacia "pedidos" ya existe.';
    END IF;
END;
$$;

-- 3. Restricción: cantidad debe ser >= 1
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name      = 'pedido_detalles'
          AND constraint_name = 'chk_pedido_detalles_cantidad'
    ) THEN
        ALTER TABLE pedido_detalles
            ADD CONSTRAINT chk_pedido_detalles_cantidad
            CHECK (cantidad >= 1);

        RAISE NOTICE 'Restricción CHECK para "cantidad" agregada.';
    ELSE
        RAISE NOTICE 'La restricción CHECK para "cantidad" ya existe.';
    END IF;
END;
$$;

-- 4. Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_pedido_detalles_pedido_id ON pedido_detalles(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedido_detalles_plato_id  ON pedido_detalles(plato_id);

-- ============================================================
-- Verificación: muestra la estructura final de la tabla
-- ============================================================
SELECT column_name, data_type, character_maximum_length, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'pedido_detalles'
ORDER BY ordinal_position;