-- Reemissão individual de link para administradores.
-- O token anterior é invalidado sem alterar destinatário nem sorteio.
-- Somente a Edge Function autenticada chama esta RPC via service_role.
CREATE OR REPLACE FUNCTION public.admin_reissue_link(p_giver_id uuid, p_token_hash text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_drawn_at timestamptz;
BEGIN
  SELECT drawn_at INTO STRICT v_drawn_at
  FROM public.christmas_event
  WHERE id = true FOR UPDATE;

  IF v_drawn_at IS NULL THEN
    RAISE EXCEPTION 'Draw not completed' USING errcode = '55000';
  END IF;

  IF p_token_hash IS NULL OR p_token_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'Invalid token hash' USING errcode = '22023';
  END IF;

  UPDATE public.assignments
  SET token_hash = p_token_hash, revealed_at = NULL
  WHERE giver_id = p_giver_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Participant assignment not found' USING errcode = 'P0002';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reissue_link(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reissue_link(uuid, text) TO service_role;
