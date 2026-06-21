'use client'

import { ContextActionSheet } from './ContextActionSheet'

export function ConfirmationDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Delete',
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel?: string
}) {
  return (
    <ContextActionSheet
      open={open}
      onClose={onClose}
      title={title}
      subtitle={description}
      ariaLabel={`${confirmLabel.toLowerCase()} confirmation`}
      initialFocus="first-action"
      actions={[
        {
          label: 'Cancel',
          tone: 'secondary',
          onSelect: () => undefined,
        },
        {
          label: confirmLabel,
          tone: 'danger',
          onSelect: onConfirm,
        },
      ]}
    />
  )
}
