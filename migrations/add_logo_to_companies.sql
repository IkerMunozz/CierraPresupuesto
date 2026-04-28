-- Añadir campo logo a la tabla companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo TEXT;