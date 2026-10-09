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
