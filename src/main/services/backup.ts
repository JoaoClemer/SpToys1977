import { app, BrowserWindow, dialog } from 'electron'
import AdmZip from 'adm-zip'
import { existsSync, mkdirSync, rmSync, statSync, unlinkSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { closeDb, getDataPath, getDb, getDbPath } from '../db/client'
import { getPhotosDir } from './photos'
import { todayLocal } from './dates'

const DB_ENTRY = 'sptoys.db'
const PHOTOS_ENTRY = 'photos'

async function writeBackupZip(target: string): Promise<void> {
  const snapshot = join(tmpdir(), `sptoys-snapshot-${Date.now()}.db`)
  // API de backup do SQLite: cópia consistente mesmo com o banco aberto
  await getDb().$client.backup(snapshot)
  try {
    const zip = new AdmZip()
    zip.addLocalFile(snapshot, '', DB_ENTRY)
    if (existsSync(getPhotosDir())) zip.addLocalFolder(getPhotosDir(), PHOTOS_ENTRY)
    await zip.writeZipPromise(target)
  } finally {
    unlinkSync(snapshot)
  }
}

export const backupService = {
  async create(win: BrowserWindow | null): Promise<{ path: string; sizeBytes: number } | null> {
    const opts = {
      title: 'Salvar backup',
      defaultPath: join(app.getPath('documents'), `sptoys-backup-${todayLocal()}.zip`),
      filters: [{ name: 'Backup SpToys', extensions: ['zip'] }]
    }
    const res = win ? await dialog.showSaveDialog(win, opts) : await dialog.showSaveDialog(opts)
    if (res.canceled || !res.filePath) return null
    await writeBackupZip(res.filePath)
    return { path: res.filePath, sizeBytes: statSync(res.filePath).size }
  },

  /** Substitui todos os dados pelo conteúdo do backup e reinicia o app. */
  async restore(win: BrowserWindow | null): Promise<boolean> {
    const openOpts = {
      title: 'Restaurar backup',
      properties: ['openFile' as const],
      filters: [{ name: 'Backup SpToys', extensions: ['zip'] }]
    }
    const pick = win
      ? await dialog.showOpenDialog(win, openOpts)
      : await dialog.showOpenDialog(openOpts)
    if (pick.canceled || !pick.filePaths[0]) return false

    const zip = new AdmZip(pick.filePaths[0])
    if (!zip.getEntry(DB_ENTRY)) throw new Error('Arquivo inválido: não é um backup do SpToys 1977')

    const confirmOpts = {
      type: 'warning' as const,
      buttons: ['Cancelar', 'Restaurar'],
      defaultId: 0,
      cancelId: 0,
      title: 'Restaurar backup',
      message: 'Substituir todos os dados atuais pelo backup?',
      detail:
        'Produtos, vendas e fotos atuais serão substituídos. Uma cópia de segurança dos dados atuais será salva antes, e o app será reiniciado.'
    }
    const confirm = win
      ? await dialog.showMessageBox(win, confirmOpts)
      : await dialog.showMessageBox(confirmOpts)
    if (confirm.response !== 1) return false

    // Cópia de segurança automática dos dados atuais
    const safetyDir = join(getDataPath(), 'backups')
    mkdirSync(safetyDir, { recursive: true })
    await writeBackupZip(join(safetyDir, `antes-de-restaurar-${Date.now()}.zip`))

    closeDb()
    const dbPath = getDbPath()
    for (const f of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) rmSync(f, { force: true })
    rmSync(getPhotosDir(), { recursive: true, force: true })
    zip.extractEntryTo(DB_ENTRY, getDataPath(), false, true)
    for (const entry of zip.getEntries()) {
      // Só aceita fotos no formato esperado (evita caminhos maliciosos como ../)
      if (/^photos\/(thumbs\/)?[\w-]+\.jpg$/.test(entry.entryName)) {
        zip.extractEntryTo(entry, getDataPath(), true, true)
      }
    }

    app.relaunch()
    app.exit(0)
    return true
  }
}
