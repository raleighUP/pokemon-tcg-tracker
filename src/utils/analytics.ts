export type AnalyticsTab =
  | 'decks'
  | 'compare'
  | 'history'
  | 'advisor'
  | 'settings'

export type CountBucket = '0' | '1' | '2-5' | '6-10' | '11+'

type AnalyticsEventProperties = {
  tab_changed: {
    from_tab: AnalyticsTab
    to_tab: AnalyticsTab
  }
  deck_created: {
    comfort_rating: number
    archetype_detected: boolean
    saved_deck_count_bucket: CountBucket
    source?: 'manual' | 'image_import_mock'
  }
  match_logged: {
    match_type: 'BO1' | 'BO3'
    result: 'win' | 'loss' | 'tie' | 'unknown'
    round_number_bucket: CountBucket
    has_notes: boolean
  }
  advisor_opened: {
    has_saved_decks: boolean
  }
  import_completed: {
    source: 'json_backup'
    deck_count_bucket: CountBucket
    match_count_bucket: CountBucket
    event_count_bucket: CountBucket
  }
  export_completed: {
    deck_count_bucket: CountBucket
    match_count_bucket: CountBucket
    event_count_bucket: CountBucket
  }
}

export type AnalyticsEventName = keyof AnalyticsEventProperties

export function bucketCount(count: number): CountBucket {
  if (count <= 0) return '0'
  if (count === 1) return '1'
  if (count <= 5) return '2-5'
  if (count <= 10) return '6-10'
  return '11+'
}

/**
 * Provider-ready analytics boundary. It currently sends no data anywhere.
 * Development builds may log privacy-reviewed aggregate events for testing.
 * Production remains silent unless NEXT_PUBLIC_ANALYTICS_ENABLED is explicitly
 * set to "true"; even then, this implementation only writes to console.debug.
 */
export function trackEvent<TEventName extends AnalyticsEventName>(
  eventName: TEventName,
  properties: AnalyticsEventProperties[TEventName]
) {
  const debugEnabled =
    process.env.NODE_ENV === 'development' ||
    process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true'

  if (!debugEnabled) return

  console.debug('[analytics]', eventName, properties)
}
