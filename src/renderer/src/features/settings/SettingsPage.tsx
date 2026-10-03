import { useState } from 'react'
import { DatabaseBackup, FolderOpen, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '../../components/PageHeader'
import { Button, Card } from '../../components/ui'
import { ipc, useIpcQuery } from '../../lib/ipc'

export function SettingsPage(): React.JSX.Element {
  const { data: info } = useIpcQuery('app:info')
  const [busy, setBusy] = useState(false)

  async function run(fn: () => Promise<void>): Promise<void> {
    setBusy(true)
    try {
      await fn()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title="Configurações" subtitle="Backup e dados do aplicativo" />
      <div className="max-w-2xl space-y-6">
        <Card title="Backup">
          <p className="mb-4 text-sm text-stone-600">
            O backup gera um arquivo <code>.zip</code> com o banco de dados e todas as fotos.
            Guarde-o num pendrive ou na nuvem (Google Drive, OneDrive…) com frequência.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const res = await ipc.invoke('backup:create')
                  if (res)
                    toast.success(`Backup salvo (${(res.sizeBytes / 1024 / 1024).toFixed(1)} MB)`, {
                      description: res.path
                    })
                })
              }
            >
              <DatabaseBackup size={16} /> Fazer backup agora
            </Button>
            <Button
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await ipc.invoke('backup:restore')
                })
              }
            >
              <RotateCcw size={16} /> Restaurar backup…
            </Button>
          </div>
          <p className="mt-3 text-xs text-stone-400">
            Ao restaurar, uma cópia dos dados atuais é salva automaticamente na pasta de dados
            (subpasta “backups”) e o app reinicia.
          </p>
        </Card>

        <Card title="Dados">
          <dl className="space-y-2 text-sm">
            <div className="flex gap-2">
              <dt className="w-28 text-stone-500">Versão</dt>
              <dd>{info?.version}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-28 shrink-0 text-stone-500">Pasta de dados</dt>
              <dd className="font-mono text-xs break-all">{info?.dataPath}</dd>
            </div>
          </dl>
          <Button className="mt-4" onClick={() => void ipc.invoke('app:openDataFolder')}>
            <FolderOpen size={16} /> Abrir pasta de dados
          </Button>
        </Card>
      </div>
    </>
  )
}
