-- Criar trigger no banco de dados para bloquear finais de semana
-- Esta é uma abordagem de último recurso

-- Função para validar finais de semana
CREATE OR REPLACE FUNCTION validate_weekend_appointments()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar se é sábado (6) ou domingo (0)
    IF EXTRACT(DOW FROM NEW.date::date) IN (0, 6) THEN
        RAISE EXCEPTION 'Agendamentos não são permitidos aos finais de semana. Escolha segunda a sexta.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para INSERT
DROP TRIGGER IF EXISTS prevent_weekend_appointments_insert ON appointments;
CREATE TRIGGER prevent_weekend_appointments_insert
    BEFORE INSERT ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION validate_weekend_appointments();

-- Criar trigger para UPDATE
DROP TRIGGER IF EXISTS prevent_weekend_appointments_update ON appointments;
CREATE TRIGGER prevent_weekend_appointments_update
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION validate_weekend_appointments();
