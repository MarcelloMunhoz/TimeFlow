-- Atualizar trigger para permitir QUALQUER agendamento quando for encaixe
-- Remove triggers existentes
DROP TRIGGER IF EXISTS prevent_weekend_appointments_insert ON appointments;
DROP TRIGGER IF EXISTS prevent_weekend_appointments_update ON appointments;
DROP FUNCTION IF EXISTS validate_weekend_appointments();

-- Criar função que permite TUDO quando é encaixe
CREATE OR REPLACE FUNCTION validate_weekend_appointments()
RETURNS TRIGGER AS $$
DECLARE
    day_of_week INTEGER;
    is_encaixe BOOLEAN;
BEGIN
    -- Extrair dia da semana (0=domingo, 1=segunda, ..., 6=sábado)
    day_of_week := EXTRACT(DOW FROM NEW.date::date);
    
    -- Verificar se é encaixe (allow_overlap = true significa encaixe)
    is_encaixe := (NEW.allow_overlap IS NOT NULL AND NEW.allow_overlap = true);
    
    -- Log para debug
    RAISE NOTICE 'Validating appointment for date: %, day of week: %, is_encaixe: %', NEW.date, day_of_week, is_encaixe;
    
    -- SE FOR ENCAIXE, PERMITIR TUDO SEM NENHUMA RESTRIÇÃO
    IF is_encaixe THEN
        RAISE NOTICE 'ENCAIXE AUTORIZADO - Permitindo agendamento sem restrições';
        RETURN NEW;
    END IF;
    
    -- SE NÃO FOR ENCAIXE, APLICAR REGRAS NORMAIS
    -- Bloquear finais de semana apenas se NÃO for encaixe
    IF day_of_week = 0 THEN
        RAISE EXCEPTION 'DOMINGO NÃO É PERMITIDO! Escolha segunda a sexta ou confirme o encaixe.';
    END IF;
    
    IF day_of_week = 6 THEN
        RAISE EXCEPTION 'SÁBADO NÃO É PERMITIDO! Escolha segunda a sexta ou confirme o encaixe.';
    END IF;
    
    -- Se chegou até aqui, é um dia útil normal
    RAISE NOTICE 'Appointment allowed for weekday %', day_of_week;
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
