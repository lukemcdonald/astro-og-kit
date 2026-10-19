/**
 * Advance-width metrics from a TTF/OTF file (head + cmap + hmtx).
 * Enough to wrap titles; no kerning, GPOS, or CFF outlines.
 */

export type FontMetrics = {
  unitsPerEm: number
  /** Advance width of `text` in px at `fontSize`. */
  width(text: string, fontSize: number): number
}

const SFNT = new Set([0x00010000, 0x74727565, 0x4f54544f]) // 1.0, 'true', 'OTTO'

export function fontKind(bytes: Uint8Array): 'ttf' | 'otf' | 'woff' | 'woff2' | 'other' {
  if (bytes.length < 4) {
    return 'other'
  }
  const tag = bytes[0]! * 0x1000000 + bytes[1]! * 0x10000 + bytes[2]! * 0x100 + bytes[3]!
  if (tag === 0x774f4646) {
    return 'woff'
  }
  if (tag === 0x774f4632) {
    return 'woff2'
  }
  if (SFNT.has(tag)) {
    if (bytes[0] === 0x4f) {
      return 'otf'
    }
    return 'ttf'
  }
  return 'other'
}

/** resvg only accepts TTF/OTF. Say so before it fails with a cryptic native error. */
export function assertSfntFont(bytes: Uint8Array, path: string) {
  const kind = fontKind(bytes)
  if (kind === 'woff' || kind === 'woff2') {
    throw new Error(
      `[astro-og-kit] ${path} is ${kind.toUpperCase()}. resvg needs a TTF or OTF file — convert the font and point font.files at that.`,
    )
  }
  if (kind === 'other') {
    throw new Error(`[astro-og-kit] ${path} is not a TTF or OTF font.`)
  }
}

export function fontMetrics(bytes: Uint8Array): FontMetrics {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const tables = tableOffsets(view)
  const head = tables.get('head')
  const hhea = tables.get('hhea')
  const hmtx = tables.get('hmtx')
  const cmap = tables.get('cmap')
  const maxp = tables.get('maxp')
  if (head == null || hhea == null || hmtx == null || cmap == null || maxp == null) {
    throw new Error('[astro-og-kit] Font is missing head, hhea, hmtx, cmap, or maxp.')
  }

  const unitsPerEm = view.getUint16(head + 18)
  const numGlyphs = view.getUint16(maxp + 4)
  const numberOfHMetrics = view.getUint16(hhea + 34)
  const advances = readAdvances(view, hmtx, numberOfHMetrics, numGlyphs)
  const glyphFor = readCmap(view, cmap)

  return {
    unitsPerEm,
    width(text, fontSize) {
      let units = 0
      for (const ch of text) {
        const code = ch.codePointAt(0) ?? 0
        const glyph = glyphFor(code)
        units += advances[glyph] ?? advances[0] ?? 0
      }
      return (units * fontSize) / unitsPerEm
    },
  }
}

function tableOffsets(view: DataView) {
  const numTables = view.getUint16(4)
  const tables = new Map<string, number>()
  for (let i = 0; i < numTables; i++) {
    const record = 12 + i * 16
    tables.set(tag(view, record), view.getUint32(record + 8))
  }
  return tables
}

function tag(view: DataView, offset: number) {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3),
  )
}

function readAdvances(view: DataView, hmtx: number, numberOfHMetrics: number, numGlyphs: number) {
  const advances = new Uint16Array(numGlyphs)
  let last = 0
  for (let i = 0; i < numberOfHMetrics; i++) {
    last = view.getUint16(hmtx + i * 4)
    advances[i] = last
  }
  for (let i = numberOfHMetrics; i < numGlyphs; i++) {
    advances[i] = last
  }
  return advances
}

function readCmap(view: DataView, cmap: number) {
  const numTables = view.getUint16(cmap + 2)
  const encodings: { encoding: number; format: number; offset: number; platform: number }[] = []
  for (let i = 0; i < numTables; i++) {
    const record = cmap + 4 + i * 8
    const offset = cmap + view.getUint32(record + 4)
    encodings.push({
      encoding: view.getUint16(record + 2),
      format: view.getUint16(offset),
      offset,
      platform: view.getUint16(record),
    })
  }

  const preferred =
    encodings.find((e) => e.format === 12 && e.platform === 3 && e.encoding === 10) ??
    encodings.find((e) => e.format === 12 && e.platform === 0) ??
    encodings.find((e) => e.format === 4 && e.platform === 3 && e.encoding === 1) ??
    encodings.find((e) => e.format === 4 && e.platform === 0) ??
    encodings.find((e) => e.format === 12) ??
    encodings.find((e) => e.format === 4)

  if (!preferred) {
    throw new Error('[astro-og-kit] Font cmap has no Unicode format 4 or 12 subtable.')
  }

  return preferred.format === 12 ? cmapFormat12(view, preferred.offset) : cmapFormat4(view, preferred.offset)
}

function cmapFormat4(view: DataView, offset: number) {
  const segCount = view.getUint16(offset + 6) / 2
  const endCodes = offset + 14
  const startCodes = endCodes + segCount * 2 + 2
  const idDeltas = startCodes + segCount * 2
  const idRangeOffsets = idDeltas + segCount * 2

  return (code: number) => {
    if (code > 0xffff) {
      return 0
    }
    for (let i = 0; i < segCount; i++) {
      const end = view.getUint16(endCodes + i * 2)
      if (code > end) continue
      const start = view.getUint16(startCodes + i * 2)
      if (code < start) {
        return 0
      }
      const rangeOffset = view.getUint16(idRangeOffsets + i * 2)
      const delta = view.getInt16(idDeltas + i * 2)
      if (rangeOffset === 0) {
        return (code + delta) & 0xffff
      }
      const glyph = view.getUint16(idRangeOffsets + i * 2 + rangeOffset + (code - start) * 2)
      if (glyph === 0) {
        return 0
      }
      return (glyph + delta) & 0xffff
    }
    return 0
  }
}

function cmapFormat12(view: DataView, offset: number) {
  const nGroups = view.getUint32(offset + 12)
  const groups = offset + 16

  return (code: number) => {
    let lo = 0
    let hi = nGroups - 1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      const start = view.getUint32(groups + mid * 12)
      const end = view.getUint32(groups + mid * 12 + 4)
      if (code < start) {
        hi = mid - 1
        continue
      }
      if (code > end) {
        lo = mid + 1
        continue
      }
      return view.getUint32(groups + mid * 12 + 8) + (code - start)
    }
    return 0
  }
}
