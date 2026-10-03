import { afterAll, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import sharp from 'sharp'

const dataDir = mkdtempSync(join(tmpdir(), 'sptoys-photos-'))
vi.mock('electron', () => ({ app: { getPath: () => dataDir } }))

import { importPhotos } from './photos'

afterAll(() => rmSync(dataDir, { recursive: true, force: true }))

describe('importPhotos', () => {
  it('importa HEIC de iPhone (decodificado via libheif)', async () => {
    const [name] = await importPhotos([join(__dirname, '__fixtures__/sample.heic')])
    const meta = await sharp(join(dataDir, 'photos', name)).metadata()
    expect(meta.format).toBe('jpeg')
    expect(meta.width).toBeGreaterThan(0)
    const thumb = await sharp(join(dataDir, 'photos', 'thumbs', name)).metadata()
    expect(thumb.format).toBe('jpeg')
  })

  it('rejeita arquivo que não é imagem com mensagem clara', async () => {
    await expect(importPhotos([join(__dirname, 'photos.ts')])).rejects.toThrow(
      /Não foi possível importar "photos.ts"/
    )
  })
})
