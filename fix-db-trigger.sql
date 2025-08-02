-- Corrigir o trigger do banco de dados
-- O problema pode estar na função de validação

-- Remover triggers existentes
DROP TRIGGER IF EXISTS prevent_weekend_appointments_insert ON appointments;
DROP TRIGGER IF EXISTS prevent_weekend_appointments_update ON appointments;
DROP FUNCTION IF EXISTS validate_weekend_appointments();

-- Criar função corrigida
CREATE OR REPLACE FUNCTION validate_weekend_appointments()
RETURNS TRIGGER AS $$
DECLARE
    day_of_week INTEGER;
BEGIN
    -- Extrair dia da semana (0=domingo, 1=segunda, ..., 6=sábado)
    day_of_week := EXTRACT(DOW FROM NEW.date::date);
    
    -- Log para debug
    RAISE NOTICE 'Validating appointment for date: %, day of week: %', NEW.date, day_of_week;
    
    -- Bloquear apenas sábado (6) e domingo (0)
    -- Permitir segunda (1), terça (2), quarta (3), quinta (4), sexta (5)
    IF day_of_week = 0 THEN
        RAISE EXCEPTION 'DOMINGO NÃO É PERMITIDO! Escolha segunda a sexta.';
    END IF;
    
    IF day_of_week = 6 THEN
        RAISE EXCEPTION 'SÁBADO NÃO É PERMITIDO! Escolha segunda a sexta.';
    END IF;
    
    -- Se chegou até aqui, é um dia útil (1-5)
    RAISE NOTICE 'Day % is allowed (weekday)', day_of_week;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar triggers corrigidos
CREATE TRIGGER prevent_weekend_appointments_insert
    BEFORE INSERT ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION validate_weekend_appointments();

CREATE TRIGGER prevent_weekend_appointments_update
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION validate_weekend_appointments();
