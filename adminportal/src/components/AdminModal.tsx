import type { ReactNode } from 'react'

type AdminModalProps = {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  maxWidthClass?: string
}

export default function AdminModal({
  title,
  onClose,
  children,
  footer,
  maxWidthClass = 'max-w-2xl',
}: AdminModalProps) {
  return (
    <div className="safe-modal-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`safe-modal-panel ${maxWidthClass}`}>
        <div className="safe-modal-header">
          <h3 className="text-xl font-semibold text-gray-900 pr-4">{title}</h3>
          <button
            type="button"
            className="safe-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="safe-modal-body">{children}</div>
        {footer ? <div className="safe-modal-footer">{footer}</div> : null}
      </div>
    </div>
  )
}
