-- Harden profile role and catalog moderation controls.
-- Ordinary signed-in users cannot self-upgrade roles or approve their own listings.

create or replace function public.askmarket_prevent_profile_privilege_escalation()
returns trigger language plpgsql set search_path = public, pg_temp
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    new.user_id := old.user_id;
    new.role := old.role;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists askmarket_profile_role_guard on public.profiles;
create trigger askmarket_profile_role_guard
before update on public.profiles
for each row execute function public.askmarket_prevent_profile_privilege_escalation();

create or replace function public.askmarket_lock_product_moderation()
returns trigger language plpgsql set search_path = public, pg_temp
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then
    new.updated_at := now();
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.moderation_status := 'pending';
    new.status := 'draft';
  else
    new.moderation_status := old.moderation_status;
    if old.status = 'published' and new.status <> 'archived' then
      new.status := 'published';
    elsif new.status not in ('draft','archived') then
      new.status := old.status;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
