import type { Metadata } from 'next'

import PrivacyPolicyPage from '@/components/PrivacyPolicyPage'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for Top Cut.',
}

export default function PrivacyPage() {
  return <PrivacyPolicyPage />
}
