-- Reset administrativo do evento. A autorização humana é verificada no handler
-- da Edge Function, que chama esta RPC exclusivamente com service_role.
-- É uma transação única: não há estado parcial entre remoção e reabertura.
CREATE OR REPLACE FUNCTION public.reset_christmas_event(p_mode text, p_confirmation text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_event public.christmas_event;
BEGIN
  IF p_confirmation IS DISTINCT FROM 'REINICIAR'
     OR p_mode IS NULL
     OR p_mode NOT IN ('draw', 'all') THEN
    RAISE EXCEPTION 'Invalid reset confirmation or mode' USING errcode = '22023';
  END IF;

  -- Mesmo lock usado para inscrições e sorteio.
  SELECT * INTO STRICT v_event
  FROM public.christmas_event
  WHERE id = true FOR UPDATE;

  -- Invalida todos os links de revelação existentes.
  DELETE FROM public.assignments;

  IF p_mode = 'all' THEN
    DELETE FROM public.participants;
  END IF;

  UPDATE public.christmas_event
  SET registration_open = true,
      drawn_at = null
  WHERE id = true;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_christmas_event(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_christmas_event(text, text) TO service_role;

-- Atualiza imediatamente o catálogo de RPCs após criar a função.
NOTIFY pgrst, 'reload schema';
