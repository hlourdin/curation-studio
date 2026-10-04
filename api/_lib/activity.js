export async function recordActivity(supabase, event) {
  const { error } = await supabase.from('activity_events').insert({
    owner_id: event.ownerId,
    operation: event.operation,
    entity_type: event.entityType || null,
    entity_id: event.entityId || null,
    outcome: event.outcome,
    correlation_id: event.correlationId,
    error_code: event.errorCode || null,
    duration_ms: event.durationMs ?? null,
    metadata: event.metadata || {}
  });
  if (error) console.warn('Activity logging failed:', error.message);

  // Best-effort retention: keep the latest 500 events for this owner.
  const { data: boundary } = await supabase
    .from('activity_events')
    .select('id')
    .eq('owner_id', event.ownerId)
    .order('created_at', { ascending: false })
    .range(499, 499)
    .maybeSingle();
  if (boundary?.id) {
    await supabase
      .from('activity_events')
      .delete()
      .eq('owner_id', event.ownerId)
      .lt('id', boundary.id);
  }
}
