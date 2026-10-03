import { net, protocol } from 'electron'
import { randomUUID } from 'crypto'
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { pathToFileURL } from 'url'
import sharp, { type Sharp } from 'sharp'
import { getDataPath } from '../db/client'

export const PHOTO_SCHEME = 'app-photo'
const FILE_RE = /^[\w-]+\.jpg$/
const ORPHAN_GRACE_MS = 24 * 60 * 60 * 1000

export function getPhotosDir(): string {
  return join(getDataPath(), 'photos')
}

function dirs(): { full: string; thumb: string } {
  const full = getPhotosDir()
  const thumb = join(full, 'thumbs')
  mkdirSync(thumb, { recursive: true })
  return { full, thumb }
}

/** Deve ser chamado antes de app.ready */
export function registerPhotoScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: PHOTO_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } }
  ])
}

/** app-photo://full/<arquivo>.jpg e app-photo://thumb/<arquivo>.jpg */
export function handlePhotoProtocol(): void {
  protocol.handle(PHOTO_SCHEME, (req) => {
    const url = new URL(req.url)
    const name = decodeURIComponent(url.pathname.replace(/^\//, ''))
    if (!FILE_RE.test(name) || (url.host !== 'full' && url.host !== 'thumb')) {
      return new Response('Not found', { status: 404 })
    }
    const { full, thumb } = dirs()
    const file = join(url.host === 'thumb' ? thumb : full, name)
    if (!existsSync(file)) return new Response('Not found', { status: 404 })
    return net.fetch(pathToFileURL(file).toString())
  })
}

/** HEIC/HEIF (fotos de iPhone): marca do contêiner ISO-BMFF nos bytes 8-12 */
function looksLikeHeic(buf: Buffer): boolean {
  return ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'].includes(
    buf.subarray(8, 12).toString('latin1')
  )
}

/**
 * Abre a imagem com o sharp. O libvips distribuído com o sharp não decodifica HEVC
 * (patentes), então HEIC é decodificado via libheif em WebAssembly e entregue
 * ao sharp como pixels brutos. O libheif já aplica a rotação gravada na foto.
 */
async function openImage(src: string): Promise<Sharp> {
  const buf = await readFile(src)
  if (!looksLikeHeic(buf)) return sharp(buf, { failOn: 'error' }).rotate()
  const { default: decodeHeic } = await import('heic-decode')
  const { width, height, data } = await decodeHeic({ buffer: buf })
  return sharp(Buffer.from(data.buffer, data.byteOffset, data.byteLength), {
    raw: { width, height, channels: 4 }
  })
}

/** Redimensiona, corrige orientação e salva foto + miniatura. Retorna os nomes gerados. */
export async function importPhotos(paths: string[]): Promise<string[]> {
  const { full, thumb } = dirs()
  const names: string[] = []
  for (const src of paths) {
    const name = `${randomUUID()}.jpg`
    try {
      const img = await openImage(src)
      await img
        .clone()
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85, mozjpeg: true })
        .toFile(join(full, name))
      await img
        .clone()
        .resize({ width: 480, height: 480, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80, mozjpeg: true })
        .toFile(join(thumb, name))
    } catch (err) {
      deletePhotoFiles([name])
      const base = src.split(/[\\/]/).pop()
      throw new Error(`Não foi possível importar "${base}": formato de imagem não suportado`, {
        cause: err
      })
    }
    names.push(name)
  }
  return names
}

export function deletePhotoFiles(names: string[]): void {
  const { full, thumb } = dirs()
  for (const name of names) {
    if (!FILE_RE.test(name)) continue
    for (const dir of [full, thumb]) {
      try {
        unlinkSync(join(dir, name))
      } catch {
        // arquivo já não existe
      }
    }
  }
}

/** Apaga fotos importadas mas nunca salvas num produto (ex.: formulário cancelado) */
export function cleanupOrphanPhotos(referenced: Set<string>): number {
  const { full } = dirs()
  const now = Date.now()
  const orphans = readdirSync(full).filter(
    (f) =>
      FILE_RE.test(f) &&
      !referenced.has(f) &&
      now - statSync(join(full, f)).mtimeMs > ORPHAN_GRACE_MS
  )
  deletePhotoFiles(orphans)
  return orphans.length
}
