'use client'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmLabel?: string
  variant?: 'danger' | 'warning'
}

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmLabel = 'Confirmar', variant = 'danger' }: ConfirmModalProps) {
  if (!isOpen) return null
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal animate-scale-in max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
        </div>
        <div className="modal-body">
          <p className="text-sm text-gray-500">{message}</p>
        </div>
        <div className="modal-footer">
          <button onClick={onCancel} className="btn-secondary">Cancelar</button>
          <button onClick={() => { onConfirm(); onCancel() }} className={variant === 'danger' ? 'btn-danger' : 'btn-primary'}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
