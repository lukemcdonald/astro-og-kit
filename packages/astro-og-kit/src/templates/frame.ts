import type { OgTemplate, OgTemplateContext } from '../types.ts'

import { svg } from '../svg.ts'
import { wrapText } from '../wrap.ts'

export type FrameOptions = {
  /** Thin accent bar along the left edge. `true` is 12px; pass a width in px. */
  accentBar?: boolean | number
  /** Balance line lengths instead of filling greedily. Per-template default. */
  balance?: boolean
  /** Draw the photo full-bleed under an overlay instead of a right-side panel. */
  cover?: boolean
  /** Logo position from the top-left corner. */
  logoX?: number
  logoY?: number
  /** Overlay opacity when `cover` is set. Default 0.7. */
  opacity?: number
  /** Width of the page photo panel (split). */
  photoWidth?: number
  /** Title line-height as a multiple of `titleSize`. Default 1.18. */
  titleLineHeight?: number
  /** Title lines before truncating with an ellipsis. Default 3. */
  titleMaxLines?: number
  /** Cap on title line width in px. `0` uses the full text column. */
  titleMaxWidth?: number
  /** Title font size in px. */
  titleSize?: number
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
export function frame(options: Required<FrameOptions>): OgTemplate {
  return ({ font, footer, height, logo, page, photo, theme, width }: OgTemplateContext) => {
    const panel = photo && !options.cover ? options.photoWidth : 0
    const textWidth = width - PAD * 2 - panel
    const maxWidth = Math.min(textWidth, options.titleMaxWidth || textWidth)
    const lines = wrapText(page.title, {
      balance: options.balance,
      maxLines: options.titleMaxLines,
      maxWidth,
      measure: (line) => font.width(line, options.titleSize),
    })
    const lineHeight = Math.round(options.titleSize * options.titleLineHeight)
    const centerY = height / 2 + 3
    // Center the title, but never let a long one crowd the logo.
    const belowLogo = logo ? options.logoY + logo.height + options.titleSize * 0.75 + 40 : 0
    const firstY = Math.max(centerY - ((lines.length - 1) * lineHeight) / 2, belowLogo)
    const bar = accentWidth(options.accentBar)
    const fit = photo ? POSITION[photo.position] : POSITION.center

    return svg`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${theme.background}" />
  ${
    photo &&
    options.cover &&
    svg`<svg width="${width}" height="${height}" viewBox="0 0 ${photo.width} ${photo.height}" preserveAspectRatio="${fit} slice"><image href="${photo.href}" width="${photo.width}" height="${photo.height}" /></svg>
  <rect width="${width}" height="${height}" fill="${theme.overlay}" fill-opacity="${options.opacity}" />`
  }
  ${
    photo &&
    !options.cover &&
    svg`<image href="${photo.href}" x="${width - panel}" width="${panel}" height="${height}" preserveAspectRatio="${fit} slice" />`
  }
  ${bar > 0 && svg`<rect width="${bar}" height="${height}" fill="${theme.accent}" />`}
  ${logo?.at(options.logoX, options.logoY)}
  <text font-family="${font.family}" font-size="${options.titleSize}" font-weight="${font.weight}" fill="${theme.foreground}">${lines.map(
    (line, i) => svg`<tspan x="${PAD}" y="${firstY + i * lineHeight}">${line}</tspan>`,
  )}</text>
  ${footer && svg`<text x="${PAD}" y="${height - PAD}" font-family="${font.family}" font-size="28" font-weight="${font.weight}" fill="${theme.muted}">${footer}</text>`}
</svg>`
  }
}
