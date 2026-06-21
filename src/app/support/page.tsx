import type { Metadata } from 'next'

import SupportPage from '@/components/SupportPage'

export const metadata: Metadata = {
  title: 'Support',
  description: 'Support information for Top Cut.',
}

export default function TopCutSupportPage() {
  return <SupportPage />
}
