-- Atualizar trigger para permitir encaixe de finais de semana
-- Remove triggers existentes
DROP TRIGGER IF EXISTS prevent_weekend_appointments_insert ON appointments;
DROP TRIGGER IF EXISTS prevent_weekend_appointments_update ON appointments;
DROP FUNCTION IF EXISTS validate_weekend_appointments();

-- Criar função atualizada que permite encaixe
CREATE OR REPLACE FUNCTION validate_weekend_appointments()
RETURNS TRIGGER AS $$
DECLARE
    day_of_week INTEGER;
BEGIN
    -- Extrair dia da semana (0=domingo, 1=segunda, ..., 6=sábado)
    day_of_week := EXTRACT(DOW FROM NEW.date::date);
    
    -- Log para debug
    RAISE NOTICE 'Validating appointment for date: %, day of week: %, allow_overlap: %', NEW.date, day_of_week, NEW.allow_overlap;
    
    -- Bloquear finais de semana apenas se allow_overlap for false
    -- Permitir encaixe se allow_overlap for true
    IF day_of_week = 0 AND (NEW.allow_overlap IS NULL OR NEW.allow_overlap = false) THEN
        RAISE EXCEPTION 'DOMINGO NÃO É PERMITIDO! Escolha segunda a sexta ou confirme o encaixe.';
    END IF;
    
    IF day_of_week = 6 AND (NEW.allow_overlap IS NULL OR NEW.allow_overlap = false) THEN
        RAISE EXCEPTION 'SÁBADO NÃO É PERMITIDO! Escolha segunda a sexta ou confirme o encaixe.';
    END IF;
    
    -- Se chegou até aqui, é permitido
    RAISE NOTICE 'Appointment allowed for day %', day_of_week;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar triggers atualizados
CREATE TRIGGER prevent_weekend_appointments_insert
    BEFORE INSERT ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION validate_weekend_appointments();

CREATE TRIGGER prevent_weekend_appointments_update
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION validate_weekend_appointments();
