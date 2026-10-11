-- Persist Spotify release year + record label on playlist items,
-- and include them in public release payloads.

alter table public.playlist_items
  add column if not exists release_year text not null default '',
  add column if not exists record_label text not null default '';

create or replace function public.create_public_release()
returns public.releases
language plpgsql
security invoker
set search_path = public, extensions
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
            'year', nullif(pi.release_year, ''),
            'label', nullif(pi.record_label, ''),
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

  release_hash := encode(extensions.digest(release_payload::text, 'sha256'), 'hex');

  select encode(
    extensions.digest(
      coalesce(string_agg(id::text || ':' || revision::text, ',' order by id), ''),
      'sha256'
    ),
    'hex'
  )
  into revision_fingerprint
  from public.playlists
  where owner_id = auth.uid();

  insert into public.releases (
    owner_id, schema_version, source_revision, payload, payload_sha256
  ) values (
    auth.uid(), 1, revision_fingerprint, release_payload, release_hash
  )
  on conflict (owner_id, source_revision, payload_sha256)
  do nothing
  returning * into created_release;

  if created_release.id is null then
    select *
    into created_release
    from public.releases
    where owner_id = auth.uid()
      and source_revision = revision_fingerprint
      and payload_sha256 = release_hash;
  end if;

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
      release_year,
      record_label,
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
      coalesce(track_payload->>'year', ''),
      coalesce(track_payload->>'label', ''),
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
      release_year = excluded.release_year,
      record_label = excluded.record_label,
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
      title, artist, artists, album, release_year, record_label,
      image_url, spotify_url, preview_url, removed_from_source
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
      coalesce(track_payload->>'year', ''),
      coalesce(track_payload->>'label', ''),
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
      release_year = excluded.release_year,
      record_label = excluded.record_label,
      image_url = excluded.image_url,
      spotify_url = excluded.spotify_url,
      preview_url = excluded.preview_url,
      removed_from_source = false,
      revision = public.playlist_items.revision + 1;
  end loop;

  return saved_playlist;
end;
$$;

-- Batch-save year/label after client-side Spotify enrichment (no full re-import).
create or replace function public.save_playlist_items_metadata(items jsonb)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  item jsonb;
  updated_count integer := 0;
  touched integer;
begin
  if not public.is_curator() then
    raise exception using errcode = '42501', message = 'CURATOR_REQUIRED';
  end if;

  if jsonb_typeof(items) <> 'array' then
    raise exception using errcode = '22023', message = 'INVALID_METADATA_PAYLOAD';
  end if;

  for item in select value from jsonb_array_elements(items)
  loop
    if coalesce(item->>'id', '') = '' then
      continue;
    end if;

    update public.playlist_items
    set
      release_year = coalesce(item->>'year', ''),
      record_label = coalesce(item->>'label', ''),
      revision = revision + 1
    where id = (item->>'id')::uuid
      and owner_id = auth.uid()
      and (
        release_year is distinct from coalesce(item->>'year', '')
        or record_label is distinct from coalesce(item->>'label', '')
      );

    get diagnostics touched = row_count;
    updated_count := updated_count + touched;
  end loop;

  return updated_count;
end;
$$;

revoke all on function public.save_playlist_items_metadata(jsonb) from public;
grant execute on function public.save_playlist_items_metadata(jsonb) to authenticated;
