import type { OgTemplate, OgTemplateContext } from '../types.ts'

import { svg } from '../svg.ts'
import { wrapText } from '../wrap.ts'

export type FrameOptions = {
  /** Thin accent bar along the left edge. `true` is 12px; pass a width in px. */
  accentBar?: boolean | number
  /** Balance line lengths instead of filling greedily. Per-template default. */
  balance?: boolean
  /** Logo position from the top-left corner. */
  logoX?: number
  logoY?: number
  /** Width of the page photo panel (editorial). */
  photoWidth?: number
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
 * accent bar, logo top-left, title centered vertically, mark near the bottom.
 */
export function frame(options: Required<FrameOptions>): OgTemplate {
  return ({ width, height, theme, font, page, mark, logo, background, image }: OgTemplateContext) => {
    const photoWidth = image ? options.photoWidth : 0
    const textWidth = width - PAD * 2 - photoWidth
    const maxWidth = Math.min(textWidth, options.titleMaxWidth || textWidth)
    const lines = wrapText(page.title, {
      balance: options.balance,
      maxLines: options.titleMaxLines,
      maxWidth,
      measure: (line) => font.width(line, options.titleSize),
    })
    const lineHeight = Math.round(options.titleSize * 1.18)
    const centerY = height / 2 + 3
    // Center the title, but never let a long one crowd the logo.
    const belowLogo = logo ? options.logoY + logo.height + options.titleSize * 0.75 + 40 : 0
    const firstY = Math.max(centerY - ((lines.length - 1) * lineHeight) / 2, belowLogo)
    const bar = accentWidth(options.accentBar)

    return svg`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${theme.background}" />
  ${
    background &&
    svg`<svg width="${width}" height="${height}" viewBox="${background.viewBox}" preserveAspectRatio="${POSITION[background.position]} slice"><image href="${background.href}" width="${background.width}" height="${background.height}" /></svg>
  <rect width="${width}" height="${height}" fill="${background.overlay}" fill-opacity="${background.opacity}" />`
  }
  ${
    image &&
    svg`<image href="${image.href}" x="${width - photoWidth}" width="${photoWidth}" height="${height}" preserveAspectRatio="xMidYMid slice" />`
  }
  ${bar > 0 && svg`<rect width="${bar}" height="${height}" fill="${theme.accent}" />`}
  ${logo?.at(options.logoX, options.logoY)}
  <text font-family="${font.family}" font-size="${options.titleSize}" font-weight="${font.weight}" fill="${theme.foreground}">${lines.map(
    (line, i) => svg`<tspan x="${PAD}" y="${firstY + i * lineHeight}">${line}</tspan>`,
  )}</text>
  ${mark && svg`<text x="${PAD}" y="${height - PAD}" font-family="${font.family}" font-size="28" font-weight="${font.weight}" fill="${theme.muted}">${mark}</text>`}
</svg>`
  }
}
