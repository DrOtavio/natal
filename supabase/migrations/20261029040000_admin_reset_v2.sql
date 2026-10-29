-- Reset administrativo v2. Nova assinatura RPC evita ambiguidades no retorno VOID.
-- Somente a Edge Function, após validar o JWT de administrador, pode chamá-la.
-- Um único comando RPC é uma única transação PostgreSQL.
CREATE OR REPLACE FUNCTION public.admin_reset_event_v2(p_mode text, p_confirmation text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_assignments_removed integer := 0;
  v_participants_removed integer := 0;
BEGIN
  IF p_confirmation IS DISTINCT FROM 'REINICIAR'
     OR p_mode IS NULL OR p_mode NOT IN ('draw', 'all') THEN
    RAISE EXCEPTION 'Invalid reset confirmation or mode' USING errcode = '22023';
  END IF;

  -- Exclusão e novos sorteios usam o mesmo lock do evento.
  PERFORM 1 FROM public.christmas_event WHERE id = TRUE FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Christmas event not found' USING errcode = 'P0002';
  END IF;

  DELETE FROM public.assignments;
  GET DIAGNOSTICS v_assignments_removed = ROW_COUNT;

  IF p_mode = 'all' THEN
    DELETE FROM public.participants;
    GET DIAGNOSTICS v_participants_removed = ROW_COUNT;
  END IF;

  UPDATE public.christmas_event
     SET registration_open = TRUE, drawn_at = NULL
   WHERE id = TRUE;

  RETURN jsonb_build_object(
    'ok', TRUE,
    'mode', p_mode,
    'assignmentsRemoved', v_assignments_removed,
    'participantsRemoved', v_participants_removed
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reset_event_v2(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_event_v2(text, text) TO service_role;
NOTIFY pgrst, 'reload schema';
