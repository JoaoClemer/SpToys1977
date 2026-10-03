import { forwardRef, useEffect, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { parseToCents } from '../../../shared/money'

import { cx } from '../lib/cx'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
const buttonStyles: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm',
  secondary: 'bg-white text-stone-800 border border-stone-300 hover:bg-stone-50 shadow-sm',
  ghost: 'text-stone-700 hover:bg-stone-100',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm'
}

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: 'sm' | 'md' }
>(function Button({ variant = 'secondary', size = 'md', className, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-9 px-3.5 text-sm',
        buttonStyles[variant],
        className
      )}
      {...props}
    />
  )
})

const fieldBase =
  'w-full rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none disabled:bg-stone-100'

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cx(fieldBase, 'h-9', className)} {...props} />
  }
)

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cx(fieldBase, 'py-2', className)} rows={3} {...props} />
})

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...props }, ref) {
    return <select ref={ref} className={cx(fieldBase, 'h-9 pr-8', className)} {...props} />
  }
)

export function Field({
  label,
  hint,
  error,
  children,
  className
}: {
  label: string
  hint?: string
  error?: string
  children: ReactNode
  className?: string
}): React.JSX.Element {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1 block text-sm font-medium text-stone-700">
        {label}
        {hint && <span className="ml-1 font-normal text-stone-400">{hint}</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  )
}

/** Campo de dinheiro em reais; valor externo em centavos */
export function MoneyInput({
  value,
  onChange,
  placeholder = '0,00',
  ...props
}: {
  value: number | null
  onChange: (cents: number | null) => void
  placeholder?: string
  autoFocus?: boolean
}): React.JSX.Element {
  const toText = (c: number | null): string =>
    c == null ? '' : (c / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  const [text, setText] = useState(toText(value))
  const lastEmitted = useRef(value)
  useEffect(() => {
    if (value !== lastEmitted.current) setText(toText(value))
  }, [value])
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-stone-400">
        R$
      </span>
      <Input
        {...props}
        inputMode="decimal"
        className="tabular pl-9"
        placeholder={placeholder}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          const cents = e.target.value.trim() === '' ? null : parseToCents(e.target.value)
          lastEmitted.current = cents
          onChange(cents)
        }}
        onBlur={() => setText(toText(lastEmitted.current))}
      />
    </div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 'max-w-lg'
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  width?: string
}): React.JSX.Element | null {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  if (!open) return null
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      className={cx(
        'm-auto w-full rounded-xl bg-white p-0 text-stone-900 shadow-2xl backdrop:backdrop-blur-[1px]',
        width
      )}
    >
      <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          aria-label="Fechar"
        >
          <X size={18} />
        </button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
      {footer && (
        <div className="flex justify-end gap-2 border-t border-stone-200 bg-stone-50 px-5 py-3">
          {footer}
        </div>
      )}
    </dialog>
  )
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  danger,
  onConfirm,
  onClose,
  busy
}: {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel: string
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
  busy?: boolean
}): React.JSX.Element | null {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width="max-w-md"
      footer={
        <>
          <Button onClick={onClose}>Voltar</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm text-stone-600">{message}</div>
    </Modal>
  )
}

export function Card({
  title,
  action,
  children,
  className,
  padded = true
}: {
  title?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  padded?: boolean
}): React.JSX.Element {
  return (
    <section className={cx('rounded-xl border border-stone-200 bg-white', className)}>
      {title && (
        <div className="flex items-center justify-between gap-2 border-b border-stone-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-stone-800">{title}</h2>
          {action}
        </div>
      )}
      <div className={padded ? 'p-5' : undefined}>{children}</div>
    </section>
  )
}

type Tone = 'neutral' | 'amber' | 'blue' | 'green' | 'red'
const toneStyles: Record<Tone, string> = {
  neutral: 'bg-stone-100 text-stone-700',
  amber: 'bg-amber-100 text-amber-800',
  blue: 'bg-sky-100 text-sky-800',
  green: 'bg-emerald-100 text-emerald-800',
  red: 'bg-red-100 text-red-700'
}

export function Badge({
  tone = 'neutral',
  children
}: {
  tone?: Tone
  children: ReactNode
}): React.JSX.Element {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        toneStyles[tone]
      )}
    >
      {children}
    </span>
  )
}

export function EmptyState({
  icon,
  title,
  children
}: {
  icon?: ReactNode
  title: string
  children?: ReactNode
}): React.JSX.Element {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-stone-300 bg-white px-6 py-12 text-center">
      {icon && <div className="mb-3 text-stone-300">{icon}</div>}
      <div className="font-medium text-stone-700">{title}</div>
      {children && <div className="mt-1 text-sm text-stone-500">{children}</div>}
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  onChange,
  options
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}): React.JSX.Element {
  return (
    <div className="inline-flex rounded-lg border border-stone-300 bg-white p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx(
            'rounded-md px-3 py-1.5 text-sm transition-colors',
            value === o.value ? 'bg-brand-600 text-white' : 'text-stone-600 hover:bg-stone-100'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
