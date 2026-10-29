-- Um evento por instalação. Nenhum cliente (inclusive autenticado) lê tabelas
-- diretamente. O acesso passa pela Edge Function, que valida os administradores.
create table public.christmas_event (
  id boolean primary key default true check (id),
  registration_open boolean not null default true,
  drawn_at timestamptz,
  check (drawn_at is null or not registration_open)
);
insert into public.christmas_event (id) values (true);

create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  email text not null check (char_length(email) between 3 and 254),
  wishlist text not null default '' check (char_length(wishlist) <= 800),
  created_at timestamptz not null default now()
);
create unique index participants_email_unique on public.participants (lower(email));

create table public.assignments (
  giver_id uuid primary key references public.participants(id),
  recipient_id uuid not null unique references public.participants(id),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  revealed_at timestamptz,
  check (giver_id <> recipient_id)
);

alter table public.christmas_event enable row level security;
alter table public.admins enable row level security;
alter table public.participants enable row level security;
alter table public.assignments enable row level security;

revoke all on table public.christmas_event, public.admins, public.participants, public.assignments from public, anon, authenticated;
grant all on table public.christmas_event, public.admins, public.participants, public.assignments to service_role;

create function public.register_participant(p_name text, p_email text, p_wishlist text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_event public.christmas_event;
begin
  -- O mesmo lock é usado na inscrição, no fechamento e no sorteio.
  select * into strict v_event from public.christmas_event where id = true for update;
  if not v_event.registration_open or v_event.drawn_at is not null then
    raise exception 'Registration closed' using errcode = '55000';
  end if;
  if (select count(*) from public.participants) >= 200 then
    raise exception 'Participant limit' using errcode = '54000';
  end if;
  insert into public.participants(name, email, wishlist)
  values (btrim(p_name), lower(btrim(p_email)), btrim(p_wishlist))
  on conflict (lower(email)) do nothing;
end;
$$;

create function public.set_registration(p_open boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_event public.christmas_event;
begin
  select * into strict v_event from public.christmas_event where id = true for update;
  if v_event.drawn_at is not null then
    raise exception 'Draw already completed' using errcode = '55000';
  end if;
  if p_open is null then raise exception 'Invalid state' using errcode = '22023'; end if;
  update public.christmas_event set registration_open = p_open where id = true;
end;
$$;

create function public.complete_draw(p_assignments jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_event public.christmas_event; v_count integer;
begin
  select * into strict v_event from public.christmas_event where id = true for update;
  if v_event.drawn_at is not null then
    raise exception 'Draw already completed' using errcode = '55000';
  end if;
  select count(*) into v_count from public.participants;
  if v_count < 2 or v_count > 200 then
    raise exception 'Invalid participant count' using errcode = '22023';
  end if;
  if p_assignments is null or jsonb_typeof(p_assignments) <> 'array' then
    raise exception 'Invalid assignments' using errcode = '22023';
  end if;
  if jsonb_array_length(p_assignments) <> v_count then
    raise exception 'Participant list changed' using errcode = '40001';
  end if;
  -- PK, UNIQUE, FK, NOT NULL e CHECK garantem uma bijeção completa sem auto-sorteio.
  -- Qualquer erro desfaz tudo, inclusive o fechamento das inscrições.
  insert into public.assignments(giver_id, recipient_id, token_hash)
  select (item->>'giver_id')::uuid, (item->>'recipient_id')::uuid, item->>'token_hash'
  from jsonb_array_elements(p_assignments) as item;
  update public.christmas_event set registration_open = false, drawn_at = now() where id = true;
end;
$$;

create function public.reveal_assignment(p_token_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_assignment public.assignments; v_result jsonb;
begin
  select * into v_assignment from public.assignments where token_hash = p_token_hash for update;
  if not found then return null; end if;
  select jsonb_build_object('giverName', giver.name, 'recipientName', recipient.name, 'wishlist', recipient.wishlist)
  into v_result
  from public.participants giver, public.participants recipient
  where giver.id = v_assignment.giver_id and recipient.id = v_assignment.recipient_id;
  update public.assignments set revealed_at = coalesce(revealed_at, now()) where giver_id = v_assignment.giver_id;
  return v_result;
end;
$$;

-- SECURITY DEFINER não implica acesso público. Revogar EXECUTE é essencial.
revoke all on function public.register_participant(text, text, text), public.set_registration(boolean), public.complete_draw(jsonb), public.reveal_assignment(text) from public, anon, authenticated;
grant execute on function public.register_participant(text, text, text), public.set_registration(boolean), public.complete_draw(jsonb), public.reveal_assignment(text) to service_role;
