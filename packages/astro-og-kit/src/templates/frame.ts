import type { OgTemplate, OgTemplateContext } from '../types.ts'

import { svg } from '../svg.ts'
import { wrapText } from '../wrap.ts'

export type FrameOptions = {
  /** Left accent bar. `true` is 12px. Default true. */
  accentBar?: boolean | number
  /** Title line-height as a multiple of `size`. Default 1.18. */
  lineHeight?: number
  /** Title lines before an ellipsis. Default 3. */
  maxLines?: number
  /** Cap on title wrap width in px. `0` is the full text column. Default 0. */
  maxWidth?: number
  /** Overlay opacity for `cover`. Default 0.7. */
  opacity?: number
  /** Title font size in px. Default 76 (split) or 72 (cover). */
  size?: number
}

type FrameConfig = Required<FrameOptions> & {
  balance: boolean
  cover: boolean
  logoX: number
  logoY: number
  photoWidth: number
}

const PAD = 96
const POSITION = {
  bottom: 'xMidYMax',
  center: 'xMidYMid',
  left: 'xMinYMid',
  right: 'xMaxYMid',
  top: 'xMidYMin',
} as const

function accentWidth(accentBar: boolean | number) {
  if (accentBar === true) {
    return 12
  }
  if (typeof accentBar === 'number' && accentBar > 0) {
    return accentBar
  }
  return 0
}

/**
 * The shared layout behind both built-in templates: canvas, optional photo,
 * accent bar, logo top-left, title centered vertically, footer near the bottom.
 */
export function frame(options: FrameConfig): OgTemplate {
  return ({ colors, font, footer, height, logo, page, photo, width }: OgTemplateContext) => {
    const panel = photo && !options.cover ? options.photoWidth : 0
    const textWidth = width - PAD * 2 - panel
    const maxWidth = Math.min(textWidth, options.maxWidth || textWidth)
    const lines = wrapText(page.title, {
      balance: options.balance,
      maxLines: options.maxLines,
      maxWidth,
      measure: (line) => font.width(line, options.size),
    })
    const lineHeight = Math.round(options.size * options.lineHeight)
    const centerY = height / 2 + 3
    // Center the title, but never let a long one crowd the logo.
    const belowLogo = logo ? options.logoY + logo.height + options.size * 0.75 + 40 : 0
    const firstY = Math.max(centerY - ((lines.length - 1) * lineHeight) / 2, belowLogo)
    const bar = accentWidth(options.accentBar)
    const fit = photo ? POSITION[photo.position] : POSITION.center

    return svg`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${colors.background}" />
  ${
    photo &&
    options.cover &&
    svg`<svg width="${width}" height="${height}" viewBox="0 0 ${photo.width} ${photo.height}" preserveAspectRatio="${fit} slice"><image href="${photo.href}" width="${photo.width}" height="${photo.height}" /></svg>
  <rect width="${width}" height="${height}" fill="${colors.overlay}" fill-opacity="${options.opacity}" />`
  }
  ${
    photo &&
    !options.cover &&
    svg`<image href="${photo.href}" x="${width - panel}" width="${panel}" height="${height}" preserveAspectRatio="${fit} slice" />`
  }
  ${bar > 0 && svg`<rect width="${bar}" height="${height}" fill="${colors.accent}" />`}
  ${logo?.at(options.logoX, options.logoY)}
  <text font-family="${font.family}" font-size="${options.size}" font-weight="${font.weight}" fill="${colors.foreground}">${lines.map(
    (line, i) => svg`<tspan x="${PAD}" y="${firstY + i * lineHeight}">${line}</tspan>`,
  )}</text>
  ${footer && svg`<text x="${PAD}" y="${height - PAD}" font-family="${font.family}" font-size="28" font-weight="${font.weight}" fill="${colors.muted}">${footer}</text>`}
</svg>`
  }
}
