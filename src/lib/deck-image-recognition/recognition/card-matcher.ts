import type { CardCandidate, KnownCardMatch } from '../types'

export async function matchCardCropsToKnownRecords(
  candidates: CardCandidate[]
): Promise<KnownCardMatch[]> {
  void candidates

  // TODO: support multilingual card identity matching. Japanese and mixed
  // source cards should resolve to English names for TCGL output.
  return []
}
