-- ============================================================================
-- SCRIPT DE CRIAÇÃO DE CONTAS DE TESTE PARA REVISORES - PsiquèIA
-- ============================================================================
-- Este script cria duas contas de teste completas para os revisores da 
-- Apple App Store e Google Play Store.
--
-- IMPORTANTE: Execute este script APÓS criar os usuários no Supabase Auth.
-- Os UUIDs abaixo devem corresponder aos IDs gerados pelo Supabase Auth.
-- ============================================================================

-- ============================================================================
-- PASSO 1: CRIAR USUÁRIOS NO SUPABASE AUTH (via Dashboard ou API)
-- ============================================================================
-- Antes de executar este script, crie os seguintes usuários no Supabase Auth:
--
-- PACIENTE DE TESTE:
--   Email: revisor.paciente@psiqueia.com
--   Senha: <gerada localmente, NUNCA commitada — ver docs/REVIEWER_INSTRUCTIONS.md>
--
-- PSICÓLOGO DE TESTE:
--   Email: revisor.psicologo@psiqueia.com
--   Senha: <gerada localmente, NUNCA commitada — ver docs/REVIEWER_INSTRUCTIONS.md>
--
-- IMPORTANTE: As senhas reais devem ser geradas no momento de criar o usuário
-- no Supabase Dashboard (use o gerador embutido ou um manager). Compartilhe
-- apenas pelo formulário privado de App Store Connect e Play Console — NUNCA
-- coloque a senha em arquivos de código ou docs públicas.
--
-- Após criar, copie os UUIDs gerados e substitua nos placeholders abaixo.
-- ============================================================================

-- Substitua estes UUIDs pelos IDs reais gerados pelo Supabase Auth
DO $$
DECLARE
    patient_id UUID := '00000000-0000-0000-0000-000000000001'; -- SUBSTITUIR
    psychologist_id UUID := '00000000-0000-0000-0000-000000000002'; -- SUBSTITUIR
BEGIN

-- ============================================================================
-- PASSO 2: CRIAR PERFIL DO PACIENTE DE TESTE
-- ============================================================================

INSERT INTO user_profiles (
    id,
    email,
    full_name,
    user_type,
    phone,
    avatar_url,
    onboarding_completed,
    created_at,
    updated_at
) VALUES (
    patient_id,
    'revisor.paciente@psiqueia.com',
    'Maria Silva (Conta de Teste)',
    'patient',
    '+55 11 99999-0001',
    NULL,
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    onboarding_completed = EXCLUDED.onboarding_completed,
    updated_at = NOW();

-- ============================================================================
-- PASSO 3: CRIAR PERFIL DO PSICÓLOGO DE TESTE
-- ============================================================================

INSERT INTO user_profiles (
    id,
    email,
    full_name,
    user_type,
    phone,
    avatar_url,
    onboarding_completed,
    created_at,
    updated_at
) VALUES (
    psychologist_id,
    'revisor.psicologo@psiqueia.com',
    'Dr. João Santos (Conta de Teste)',
    'psychologist',
    '+55 11 99999-0002',
    NULL,
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    onboarding_completed = EXCLUDED.onboarding_completed,
    updated_at = NOW();

-- ============================================================================
-- PASSO 4: CRIAR PERFIL PROFISSIONAL DO PSICÓLOGO
-- ============================================================================

INSERT INTO psychologist_profiles (
    user_id,
    crp,
    specializations,
    bio,
    session_price,
    session_duration,
    rating,
    total_sessions,
    stripe_account_id,
    stripe_onboarding_completed,
    created_at,
    updated_at
) VALUES (
    psychologist_id,
    '06/123456',
    ARRAY['Terapia Cognitivo-Comportamental', 'Ansiedade', 'Depressão', 'Relacionamentos'],
    'Psicólogo clínico com mais de 10 anos de experiência em atendimento online e presencial. Especialista em Terapia Cognitivo-Comportamental (TCC) com foco em transtornos de ansiedade e depressão. Membro do Conselho Regional de Psicologia de São Paulo.',
    150.00,
    50,
    4.9,
    127,
    'acct_test_reviewer', -- Conta Stripe de teste
    true, -- Onboarding completo para permitir pagamentos
    NOW(),
    NOW()
) ON CONFLICT (user_id) DO UPDATE SET
    bio = EXCLUDED.bio,
    session_price = EXCLUDED.session_price,
    stripe_onboarding_completed = EXCLUDED.stripe_onboarding_completed,
    updated_at = NOW();

-- ============================================================================
-- PASSO 5: VINCULAR PACIENTE AO PSICÓLOGO
-- ============================================================================

INSERT INTO patient_psychologist (
    patient_id,
    psychologist_id,
    status,
    created_at
) VALUES (
    patient_id,
    psychologist_id,
    'active',
    NOW()
) ON CONFLICT (patient_id, psychologist_id) DO UPDATE SET
    status = 'active';

-- ============================================================================
-- PASSO 6: CRIAR DISPONIBILIDADE DO PSICÓLOGO (Segunda a Sexta, 9h-18h)
-- ============================================================================

-- Limpar disponibilidade anterior
DELETE FROM psychologist_availability WHERE psychologist_id = psychologist_id;

-- Segunda-feira (1)
INSERT INTO psychologist_availability (psychologist_id, day_of_week, start_time, end_time, is_available)
VALUES (psychologist_id, 1, '09:00', '18:00', true);

-- Terça-feira (2)
INSERT INTO psychologist_availability (psychologist_id, day_of_week, start_time, end_time, is_available)
VALUES (psychologist_id, 2, '09:00', '18:00', true);

-- Quarta-feira (3)
INSERT INTO psychologist_availability (psychologist_id, day_of_week, start_time, end_time, is_available)
VALUES (psychologist_id, 3, '09:00', '18:00', true);

-- Quinta-feira (4)
INSERT INTO psychologist_availability (psychologist_id, day_of_week, start_time, end_time, is_available)
VALUES (psychologist_id, 4, '09:00', '18:00', true);

-- Sexta-feira (5)
INSERT INTO psychologist_availability (psychologist_id, day_of_week, start_time, end_time, is_available)
VALUES (psychologist_id, 5, '09:00', '18:00', true);

-- ============================================================================
-- PASSO 7: CRIAR AGENDAMENTOS DE EXEMPLO
-- ============================================================================

-- Agendamento futuro (daqui a 3 dias)
INSERT INTO appointments (
    id,
    patient_id,
    psychologist_id,
    scheduled_at,
    duration_minutes,
    status,
    payment_status,
    session_price,
    patient_notes,
    meet_link,
    created_at
) VALUES (
    gen_random_uuid(),
    patient_id,
    psychologist_id,
    NOW() + INTERVAL '3 days' + INTERVAL '10 hours',
    50,
    'confirmed',
    'paid',
    150.00,
    'Primeira sessão de acompanhamento.',
    'https://meet.google.com/abc-defg-hij',
    NOW()
);

-- Agendamento passado (há 7 dias) - para histórico
INSERT INTO appointments (
    id,
    patient_id,
    psychologist_id,
    scheduled_at,
    duration_minutes,
    status,
    payment_status,
    session_price,
    patient_notes,
    psychologist_notes,
    meet_link,
    created_at
) VALUES (
    gen_random_uuid(),
    patient_id,
    psychologist_id,
    NOW() - INTERVAL '7 days' + INTERVAL '14 hours',
    50,
    'completed',
    'paid',
    150.00,
    'Sessão inicial para conhecer o profissional.',
    'Paciente apresentou quadro leve de ansiedade. Recomendado exercícios de respiração.',
    'https://meet.google.com/xyz-uvwx-rst',
    NOW() - INTERVAL '14 days'
);

-- ============================================================================
-- PASSO 8: CRIAR ENTRADAS DE DIÁRIO DE EXEMPLO
-- ============================================================================

INSERT INTO diary_entries (
    id,
    user_id,
    mood,
    mood_score,
    content,
    factors,
    is_shared,
    created_at
) VALUES (
    gen_random_uuid(),
    patient_id,
    'good',
    4,
    'Hoje foi um dia produtivo. Consegui completar todas as minhas tarefas e ainda tive tempo para uma caminhada no parque. Me sinto mais leve e otimista.',
    ARRAY['Trabalho', 'Exercício', 'Natureza'],
    true,
    NOW() - INTERVAL '1 day'
);

INSERT INTO diary_entries (
    id,
    user_id,
    mood,
    mood_score,
    content,
    factors,
    is_shared,
    created_at
) VALUES (
    gen_random_uuid(),
    patient_id,
    'neutral',
    3,
    'Dia comum, sem grandes acontecimentos. Trabalhei normalmente e assisti um filme à noite. Estou me sentindo bem, mas um pouco cansada.',
    ARRAY['Trabalho', 'Descanso'],
    false,
    NOW() - INTERVAL '3 days'
);

RAISE NOTICE 'Contas de teste criadas com sucesso!';
RAISE NOTICE 'Paciente: revisor.paciente@psiqueia.com';
RAISE NOTICE 'Psicólogo: revisor.psicologo@psiqueia.com';
RAISE NOTICE 'As senhas foram definidas no Supabase Dashboard ao criar os usuários.';

END $$;

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================
-- Execute estas queries para verificar se tudo foi criado corretamente:

-- SELECT * FROM user_profiles WHERE email LIKE 'revisor%';
-- SELECT * FROM psychologist_profiles WHERE user_id IN (SELECT id FROM user_profiles WHERE email LIKE 'revisor%');
-- SELECT * FROM patient_psychologist WHERE patient_id IN (SELECT id FROM user_profiles WHERE email LIKE 'revisor%');
-- SELECT * FROM appointments WHERE patient_id IN (SELECT id FROM user_profiles WHERE email LIKE 'revisor%');
-- SELECT * FROM diary_entries WHERE user_id IN (SELECT id FROM user_profiles WHERE email LIKE 'revisor%');
