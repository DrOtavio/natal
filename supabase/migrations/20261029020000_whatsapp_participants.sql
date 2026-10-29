-- Migração aditiva: preserva IDs, e-mails legados, inscrições e todos os pares.
-- O WhatsApp não é único: irmãos podem compartilhar o número de um responsável.
BEGIN;

ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS whatsapp text;
ALTER TABLE public.participants ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.participants DROP CONSTRAINT IF EXISTS participants_whatsapp_format;
ALTER TABLE public.participants ADD CONSTRAINT participants_whatsapp_format
  CHECK (whatsapp IS NULL OR whatsapp ~ '^[1-9][0-9]{7,14}$');

-- Impede que uma versão antiga da API continue cadastrando sem WhatsApp.
-- Mantém a assinatura antiga para não remover dependências existentes.
CREATE OR REPLACE FUNCTION public.register_participant(p_name text, p_email text, p_wishlist text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'WhatsApp registration required' USING errcode = '22023';
END;
$$;

CREATE OR REPLACE FUNCTION public.register_participant_whatsapp(p_name text, p_whatsapp text, p_wishlist text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_event public.christmas_event;
BEGIN
  SELECT * INTO STRICT v_event FROM public.christmas_event WHERE id = true FOR UPDATE;
  IF NOT v_event.registration_open OR v_event.drawn_at IS NOT NULL THEN
    RAISE EXCEPTION 'Registration closed' USING errcode = '55000';
  END IF;
  IF p_whatsapp IS NULL OR p_whatsapp !~ '^[1-9][0-9]{7,14}$' THEN
    RAISE EXCEPTION 'Invalid WhatsApp' USING errcode = '22023';
  END IF;
  IF (SELECT count(*) FROM public.participants) >= 200 THEN
    RAISE EXCEPTION 'Participant limit' USING errcode = '54000';
  END IF;
  INSERT INTO public.participants(name, whatsapp, wishlist)
  VALUES (btrim(p_name), p_whatsapp, btrim(p_wishlist));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_participant(p_id uuid, p_name text, p_whatsapp text, p_wishlist text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  -- Serializa com inscrições, exclusão, reset e sorteio. Não altera os pares.
  PERFORM id FROM public.christmas_event WHERE id = true FOR UPDATE;
  IF p_whatsapp IS NULL OR p_whatsapp !~ '^[1-9][0-9]{7,14}$' THEN
    RAISE EXCEPTION 'Invalid WhatsApp' USING errcode = '22023';
  END IF;
  UPDATE public.participants SET name = btrim(p_name), whatsapp = p_whatsapp, wishlist = btrim(p_wishlist)
  WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Participant not found' USING errcode = 'P0002'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_participant(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_event public.christmas_event;
BEGIN
  SELECT * INTO STRICT v_event FROM public.christmas_event WHERE id = true FOR UPDATE;
  IF v_event.drawn_at IS NOT NULL OR EXISTS (SELECT 1 FROM public.assignments) THEN
    RAISE EXCEPTION 'Cannot remove after draw' USING errcode = '55006';
  END IF;
  DELETE FROM public.participants WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Participant not found' USING errcode = 'P0002'; END IF;
END;
$$;

-- Confere links apresentados pela organização sem armazenar tokens brutos.
-- A associação usa o hash do token, nunca nome, e-mail ou telefone.
CREATE OR REPLACE FUNCTION public.admin_restore_links(p_token_hashes text[])
RETURNS TABLE (giver_id uuid, token_hash text, name text, whatsapp text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT a.giver_id, a.token_hash, p.name, p.whatsapp
  FROM public.assignments a JOIN public.participants p ON p.id = a.giver_id
  WHERE a.token_hash = ANY(p_token_hashes);
$$;

REVOKE ALL ON FUNCTION public.register_participant(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.register_participant_whatsapp(text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_update_participant(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_delete_participant(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_participant(text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.register_participant_whatsapp(text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_participant(uuid, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_delete_participant(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.admin_restore_links(text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_restore_links(text[]) TO service_role;

COMMIT;
