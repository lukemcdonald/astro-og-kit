import type { OgTemplate } from '../types.ts'
import type { FrameOptions } from './frame.ts'

import { frame } from './frame.ts'

export type { FrameOptions }

/**
 * Solid canvas, title on the left, and the page photo (if any) in a panel
 * on the right. The lukemcdonald.com look.
 */
export function editorial(options: FrameOptions = {}): OgTemplate {
  return frame({
    accentBar: true,
    balance: false,
    logoX: 96,
    logoY: 80,
    photoWidth: 520,
    titleMaxLines: 3,
    titleMaxWidth: 0,
    titleSize: 76,
    ...options,
  })
}

/**
 * Full-bleed background photo under a tinted overlay, title on top.
 * The bbcmonticello.com look.
 */
export function backdrop(options: FrameOptions = {}): OgTemplate {
  return frame({
    accentBar: true,
    balance: true,
    logoX: 96,
    logoY: 48,
    photoWidth: 520,
    titleMaxLines: 3,
    titleMaxWidth: 0,
    titleSize: 72,
    ...options,
  })
}

export const templates = {
  backdrop: backdrop(),
  editorial: editorial(),
} as const
