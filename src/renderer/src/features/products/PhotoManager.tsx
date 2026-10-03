import { useState } from 'react'
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, Star, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cx } from '../../lib/cx'
import { ipc } from '../../lib/ipc'
import { photoUrl } from '../../lib/format'

/** Gerencia a lista ordenada de fotos de um produto. A primeira é a principal. */
export function PhotoManager({
  photos,
  onChange
}: {
  photos: string[]
  onChange: (photos: string[]) => void
}): React.JSX.Element {
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  async function add(fn: () => Promise<string[]>): Promise<void> {
    setBusy(true)
    try {
      const added = await fn()
      if (added.length) onChange([...photos, ...added])
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  function move(i: number, delta: number): void {
    const next = [...photos]
    const [item] = next.splice(i, 1)
    next.splice(i + delta, 0, item)
    onChange(next)
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const paths = Array.from(e.dataTransfer.files)
          .filter((f) => f.type.startsWith('image/') || /\.(heic|avif)$/i.test(f.name))
          .map((f) => ipc.getPathForFile(f))
        if (paths.length) void add(() => ipc.invoke('photos:import', paths))
      }}
      className={cx(
        'rounded-lg border-2 border-dashed p-3 transition-colors',
        dragOver ? 'border-brand-500 bg-brand-50' : 'border-stone-200'
      )}
    >
      <div className="grid grid-cols-4 gap-3">
        {photos.map((file, i) => (
          <div
            key={file}
            className="group relative aspect-square overflow-hidden rounded-md bg-stone-100"
          >
            <img
              src={photoUrl(file)}
              alt=""
              className="h-full w-full object-cover"
              draggable={false}
            />
            {i === 0 && (
              <span className="absolute top-1 left-1 inline-flex items-center gap-1 rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                <Star size={10} fill="currentColor" /> Principal
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/60 to-transparent p-1 opacity-0 transition-opacity group-hover:opacity-100">
              <div className="flex">
                <IconBtn label="Mover para esquerda" disabled={i === 0} onClick={() => move(i, -1)}>
                  <ChevronLeft size={14} />
                </IconBtn>
                <IconBtn
                  label="Mover para direita"
                  disabled={i === photos.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ChevronRight size={14} />
                </IconBtn>
              </div>
              <div className="flex">
                {i !== 0 && (
                  <IconBtn label="Tornar principal" onClick={() => move(i, -i)}>
                    <Star size={14} />
                  </IconBtn>
                )}
                <IconBtn
                  label="Remover foto"
                  onClick={() => onChange(photos.filter((p) => p !== file))}
                >
                  <Trash2 size={14} />
                </IconBtn>
              </div>
            </div>
          </div>
        ))}
        <button
          type="button"
          disabled={busy}
          onClick={() => void add(() => ipc.invoke('photos:pick'))}
          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-stone-300 bg-stone-50 text-xs text-stone-500 hover:border-brand-500 hover:text-brand-700"
        >
          {busy ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
          {busy ? 'Processando…' : 'Adicionar'}
        </button>
      </div>
      <p className="mt-2 text-xs text-stone-400">
        Arraste imagens para cá ou clique em Adicionar. A primeira foto é a principal.
      </p>
    </div>
  )
}

function IconBtn({
  label,
  onClick,
  disabled,
  children
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded p-1 text-white hover:bg-white/20 disabled:opacity-30"
    >
      {children}
    </button>
  )
}
