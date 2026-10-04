create extension if not exists pgcrypto;

create table public.curators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.is_curator(candidate uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.curators
    where user_id = candidate and active
  );
$$;

revoke all on function public.is_curator(uuid) from public;
grant execute on function public.is_curator(uuid) to authenticated, service_role;

create table public.playlists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  spotify_playlist_id text,
  slug text not null,
  imported_name text not null,
  editorial_name text,
  imported_description text not null default '',
  editorial_description text,
  spotify_url text not null default '',
  cover_image_url text not null default '',
  display_order integer not null default 999 check (display_order >= 0),
  featured boolean not null default false,
  archived boolean not null default false,
  publish_state text not null default 'draft'
    check (publish_state in ('draft', 'published', 'hidden')),
  spotify_snapshot_id text,
  auto_sync boolean not null default false,
  last_synced_at timestamptz,
  last_sync_status text check (
    last_sync_status is null or
    last_sync_status in ('running', 'succeeded', 'failed', 'needs_reconnect')
  ),
  last_sync_error_code text,
  revision bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, slug),
  unique (owner_id, spotify_playlist_id)
);

create table public.playlist_items (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  spotify_track_id text,
  occurrence_key text not null,
  position integer not null check (position >= 0),
  title text not null,
  artist text not null default '',
  artists jsonb not null default '[]'::jsonb,
  album text not null default '',
  image_url text not null default '',
  spotify_url text not null default '',
  preview_url text not null default '',
  comment text not null default '',
  removed_from_source boolean not null default false,
  revision bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (playlist_id, occurrence_key)
);

create index playlist_items_active_order_idx
  on public.playlist_items (playlist_id, removed_from_source, position);
create index playlists_owner_order_idx
  on public.playlists (owner_id, archived, display_order);
create index playlists_auto_sync_idx
  on public.playlists (auto_sync)
  where auto_sync and not archived;

create table public.releases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  schema_version integer not null default 1,
  source_revision text not null,
  payload jsonb not null,
  payload_sha256 text not null,
  status text not null default 'pending'
    check (status in ('pending', 'building', 'live', 'failed', 'superseded')),
  deployment_id text,
  error_code text,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique (owner_id, source_revision, payload_sha256)
);

create index releases_owner_created_idx
  on public.releases (owner_id, created_at desc);

create table public.activity_events (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  operation text not null,
  entity_type text,
  entity_id text,
  outcome text not null check (outcome in ('started', 'succeeded', 'failed', 'conflict')),
  correlation_id uuid not null default gen_random_uuid(),
  error_code text,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_events_owner_created_idx
  on public.activity_events (owner_id, created_at desc);

-- Service-role only. Tokens are encrypted by the application before insertion.
create table public.spotify_connections (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  refresh_token_ciphertext text not null,
  refresh_token_iv text not null,
  token_version integer not null default 1,
  spotify_user_id text,
  scopes text[] not null default '{}',
  expires_at timestamptz,
  last_refreshed_at timestamptz,
  reconnect_required boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger playlists_set_updated_at
before update on public.playlists
for each row execute function public.set_updated_at();

create trigger playlist_items_set_updated_at
before update on public.playlist_items
for each row execute function public.set_updated_at();

create trigger spotify_connections_set_updated_at
before update on public.spotify_connections
for each row execute function public.set_updated_at();

alter table public.curators enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_items enable row level security;
alter table public.releases enable row level security;
alter table public.activity_events enable row level security;
alter table public.spotify_connections enable row level security;

create policy "curator reads own enrollment"
on public.curators for select
to authenticated
using (user_id = auth.uid() and public.is_curator());

create policy "curator manages own playlists"
on public.playlists for all
to authenticated
using (owner_id = auth.uid() and public.is_curator())
with check (owner_id = auth.uid() and public.is_curator());

create policy "curator manages own playlist items"
on public.playlist_items for all
to authenticated
using (owner_id = auth.uid() and public.is_curator())
with check (
  owner_id = auth.uid()
  and public.is_curator()
  and exists (
    select 1 from public.playlists
    where id = playlist_id and owner_id = auth.uid()
  )
);

create policy "curator reads own releases"
on public.releases for select
to authenticated
using (owner_id = auth.uid() and public.is_curator());

create policy "curator creates own releases"
on public.releases for insert
to authenticated
with check (owner_id = auth.uid() and public.is_curator());

create policy "curator reads own activity"
on public.activity_events for select
to authenticated
using (owner_id = auth.uid() and public.is_curator());

create policy "curator writes own activity"
on public.activity_events for insert
to authenticated
with check (owner_id = auth.uid() and public.is_curator());

-- No authenticated policies are defined for spotify_connections.
-- Only the service role can access it.

create or replace function public.save_playlist_item_comment(
  item_id uuid,
  expected_revision bigint,
  new_comment text
)
returns public.playlist_items
language plpgsql
security invoker
set search_path = public
as $$
declare
  saved public.playlist_items;
begin
  update public.playlist_items
  set comment = coalesce(new_comment, ''),
      revision = revision + 1
  where id = item_id
    and owner_id = auth.uid()
    and revision = expected_revision
  returning * into saved;

  if saved.id is null then
    raise exception using
      errcode = '40001',
      message = 'EDIT_CONFLICT';
  end if;

  return saved;
end;
$$;

create or replace function public.save_playlist_description(
  target_playlist_id uuid,
  expected_revision bigint,
  new_description text
)
returns public.playlists
language plpgsql
security invoker
set search_path = public
as $$
declare
  saved public.playlists;
begin
  update public.playlists
  set editorial_description = coalesce(new_description, ''),
      revision = revision + 1
  where id = target_playlist_id
    and owner_id = auth.uid()
    and revision = expected_revision
  returning * into saved;

  if saved.id is null then
    raise exception using
      errcode = '40001',
      message = 'EDIT_CONFLICT';
  end if;

  return saved;
end;
$$;

create or replace function public.reorder_playlists(
  ordered_playlist_ids uuid[]
)
returns setof public.playlists
language plpgsql
security invoker
set search_path = public
as $$
declare
  owned_count integer;
begin
  if not public.is_curator() then
    raise exception using errcode = '42501', message = 'CURATOR_REQUIRED';
  end if;

  select count(*) into owned_count
  from public.playlists
  where owner_id = auth.uid()
    and not archived
    and id = any(ordered_playlist_ids);

  if owned_count <> coalesce(array_length(ordered_playlist_ids, 1), 0) then
    raise exception using errcode = '22023', message = 'INVALID_PLAYLIST_ORDER';
  end if;

  update public.playlists p
  set display_order = ordering.position,
      revision = p.revision + 1
  from unnest(ordered_playlist_ids) with ordinality as ordering(id, position)
  where p.id = ordering.id
    and p.owner_id = auth.uid();

  return query
  select *
  from public.playlists
  where owner_id = auth.uid() and not archived
  order by display_order;
end;
$$;

create or replace function public.create_public_release()
returns public.releases
language plpgsql
security invoker
set search_path = public
as $$
declare
  release_payload jsonb;
  release_hash text;
  revision_fingerprint text;
  created_release public.releases;
begin
  if not public.is_curator() then
    raise exception using errcode = '42501', message = 'CURATOR_REQUIRED';
  end if;

  select jsonb_build_object(
    'schemaVersion', 1,
    'playlists', coalesce(jsonb_agg(playlist_payload order by display_order), '[]'::jsonb)
  )
  into release_payload
  from (
    select
      p.display_order,
      jsonb_build_object(
        'slug', p.slug,
        'name', coalesce(nullif(p.editorial_name, ''), p.imported_name),
        'description', coalesce(p.editorial_description, p.imported_description, ''),
        'spotifyUrl', p.spotify_url,
        'coverImage', p.cover_image_url,
        'order', p.display_order,
        'tracks', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', pi.spotify_track_id,
            'title', pi.title,
            'artist', pi.artist,
            'artists', pi.artists,
            'album', pi.album,
            'image', pi.image_url,
            'url', pi.spotify_url,
            'previewUrl', pi.preview_url,
            'comment', pi.comment
          ) order by pi.position)
          from public.playlist_items pi
          where pi.playlist_id = p.id and not pi.removed_from_source
        ), '[]'::jsonb)
      ) as playlist_payload
    from public.playlists p
    where p.owner_id = auth.uid()
      and not p.archived
      and p.publish_state <> 'hidden'
  ) public_playlists;

  release_hash := encode(digest(release_payload::text, 'sha256'), 'hex');

  select encode(digest(coalesce(string_agg(id::text || ':' || revision::text, ',' order by id), ''), 'sha256'), 'hex')
  into revision_fingerprint
  from public.playlists
  where owner_id = auth.uid();

  insert into public.releases (
    owner_id, schema_version, source_revision, payload, payload_sha256
  ) values (
    auth.uid(), 1, revision_fingerprint, release_payload, release_hash
  )
  on conflict (owner_id, source_revision, payload_sha256)
  do update set owner_id = excluded.owner_id
  returning * into created_release;

  return created_release;
end;
$$;

create or replace function public.sync_spotify_playlist(
  playlist_payload jsonb
)
returns public.playlists
language plpgsql
security invoker
set search_path = public
as $$
declare
  saved_playlist public.playlists;
  track_payload jsonb;
  track_position integer;
begin
  if not public.is_curator() then
    raise exception using errcode = '42501', message = 'CURATOR_REQUIRED';
  end if;

  if coalesce(playlist_payload->>'id', '') = ''
     or coalesce(playlist_payload->>'slug', '') = ''
     or jsonb_typeof(playlist_payload->'tracks') <> 'array' then
    raise exception using errcode = '22023', message = 'INVALID_SPOTIFY_PAYLOAD';
  end if;

  insert into public.playlists (
    owner_id,
    spotify_playlist_id,
    slug,
    imported_name,
    imported_description,
    spotify_url,
    cover_image_url,
    display_order,
    spotify_snapshot_id,
    last_synced_at,
    last_sync_status
  ) values (
    auth.uid(),
    playlist_payload->>'id',
    playlist_payload->>'slug',
    playlist_payload->>'name',
    coalesce(playlist_payload->>'description', ''),
    coalesce(playlist_payload->>'spotifyUrl', ''),
    coalesce(playlist_payload->>'coverImage', ''),
    coalesce((playlist_payload->>'order')::integer, (
      select coalesce(max(display_order), 0) + 1
      from public.playlists where owner_id = auth.uid()
    )),
    playlist_payload->>'snapshotId',
    now(),
    'succeeded'
  )
  on conflict (owner_id, spotify_playlist_id)
  do update set
    imported_name = excluded.imported_name,
    imported_description = excluded.imported_description,
    spotify_url = excluded.spotify_url,
    cover_image_url = excluded.cover_image_url,
    spotify_snapshot_id = excluded.spotify_snapshot_id,
    last_synced_at = excluded.last_synced_at,
    last_sync_status = 'succeeded',
    last_sync_error_code = null,
    revision = public.playlists.revision + 1
  returning * into saved_playlist;

  update public.playlist_items
  set removed_from_source = true
  where playlist_id = saved_playlist.id;

  for track_payload, track_position in
    select value, (ordinality - 1)::integer
    from jsonb_array_elements(playlist_payload->'tracks') with ordinality
  loop
    insert into public.playlist_items (
      playlist_id,
      owner_id,
      spotify_track_id,
      occurrence_key,
      position,
      title,
      artist,
      artists,
      album,
      image_url,
      spotify_url,
      preview_url,
      removed_from_source
    ) values (
      saved_playlist.id,
      auth.uid(),
      nullif(track_payload->>'id', ''),
      track_payload->>'occurrenceKey',
      track_position,
      track_payload->>'title',
      coalesce(track_payload->>'artist', ''),
      coalesce(track_payload->'artists', '[]'::jsonb),
      coalesce(track_payload->>'album', ''),
      coalesce(track_payload->>'image', ''),
      coalesce(track_payload->>'url', ''),
      coalesce(track_payload->>'previewUrl', ''),
      false
    )
    on conflict (playlist_id, occurrence_key)
    do update set
      spotify_track_id = excluded.spotify_track_id,
      position = excluded.position,
      title = excluded.title,
      artist = excluded.artist,
      artists = excluded.artists,
      album = excluded.album,
      image_url = excluded.image_url,
      spotify_url = excluded.spotify_url,
      preview_url = excluded.preview_url,
      removed_from_source = false,
      revision = public.playlist_items.revision + 1;
  end loop;

  return saved_playlist;
end;
$$;

create or replace function public.sync_spotify_playlist_as_owner(
  target_owner uuid,
  playlist_payload jsonb
)
returns public.playlists
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_playlist public.playlists;
  track_payload jsonb;
  track_position integer;
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'SERVICE_ROLE_REQUIRED';
  end if;

  if not exists (
    select 1 from public.curators where user_id = target_owner and active
  ) then
    raise exception using errcode = '42501', message = 'CURATOR_REQUIRED';
  end if;

  insert into public.playlists (
    owner_id, spotify_playlist_id, slug, imported_name, imported_description,
    spotify_url, cover_image_url, display_order, spotify_snapshot_id,
    last_synced_at, last_sync_status
  ) values (
    target_owner,
    playlist_payload->>'id',
    playlist_payload->>'slug',
    playlist_payload->>'name',
    coalesce(playlist_payload->>'description', ''),
    coalesce(playlist_payload->>'spotifyUrl', ''),
    coalesce(playlist_payload->>'coverImage', ''),
    coalesce((playlist_payload->>'order')::integer, (
      select coalesce(max(display_order), 0) + 1
      from public.playlists where owner_id = target_owner
    )),
    playlist_payload->>'snapshotId',
    now(),
    'succeeded'
  )
  on conflict (owner_id, spotify_playlist_id)
  do update set
    imported_name = excluded.imported_name,
    imported_description = excluded.imported_description,
    spotify_url = excluded.spotify_url,
    cover_image_url = excluded.cover_image_url,
    spotify_snapshot_id = excluded.spotify_snapshot_id,
    last_synced_at = excluded.last_synced_at,
    last_sync_status = 'succeeded',
    last_sync_error_code = null,
    revision = public.playlists.revision + 1
  returning * into saved_playlist;

  update public.playlist_items
  set removed_from_source = true
  where playlist_id = saved_playlist.id;

  for track_payload, track_position in
    select value, (ordinality - 1)::integer
    from jsonb_array_elements(playlist_payload->'tracks') with ordinality
  loop
    insert into public.playlist_items (
      playlist_id, owner_id, spotify_track_id, occurrence_key, position,
      title, artist, artists, album, image_url, spotify_url, preview_url,
      removed_from_source
    ) values (
      saved_playlist.id,
      target_owner,
      nullif(track_payload->>'id', ''),
      track_payload->>'occurrenceKey',
      track_position,
      track_payload->>'title',
      coalesce(track_payload->>'artist', ''),
      coalesce(track_payload->'artists', '[]'::jsonb),
      coalesce(track_payload->>'album', ''),
      coalesce(track_payload->>'image', ''),
      coalesce(track_payload->>'url', ''),
      coalesce(track_payload->>'previewUrl', ''),
      false
    )
    on conflict (playlist_id, occurrence_key)
    do update set
      spotify_track_id = excluded.spotify_track_id,
      position = excluded.position,
      title = excluded.title,
      artist = excluded.artist,
      artists = excluded.artists,
      album = excluded.album,
      image_url = excluded.image_url,
      spotify_url = excluded.spotify_url,
      preview_url = excluded.preview_url,
      removed_from_source = false,
      revision = public.playlist_items.revision + 1;
  end loop;

  return saved_playlist;
end;
$$;

revoke all on function public.sync_spotify_playlist_as_owner(uuid, jsonb) from public;
grant execute on function public.sync_spotify_playlist_as_owner(uuid, jsonb) to service_role;

grant execute on function public.save_playlist_item_comment(uuid, bigint, text) to authenticated;
grant execute on function public.save_playlist_description(uuid, bigint, text) to authenticated;
grant execute on function public.reorder_playlists(uuid[]) to authenticated;
grant execute on function public.create_public_release() to authenticated;
grant execute on function public.sync_spotify_playlist(jsonb) to authenticated;
