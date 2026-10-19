import type { OgTemplate } from '../types.ts'
import type { FrameOptions } from './frame.ts'

import { frame } from './frame.ts'

export type { FrameOptions }

/** Title on the left, photo (if any) in a panel on the right. */
export function split(options: FrameOptions = {}): OgTemplate {
  return frame({
    accentBar: true,
    balance: false,
    cover: false,
    logoX: 96,
    logoY: 80,
    opacity: 0.7,
    photoWidth: 520,
    titleLineHeight: 1.18,
    titleMaxLines: 3,
    titleMaxWidth: 0,
    titleSize: 76,
    ...options,
  })
}

/** Full-bleed photo behind the title, with a tinted overlay. */
export function cover(options: FrameOptions = {}): OgTemplate {
  return frame({
    accentBar: true,
    balance: true,
    cover: true,
    logoX: 96,
    logoY: 48,
    opacity: 0.7,
    photoWidth: 520,
    titleLineHeight: 1.18,
    titleMaxLines: 3,
    titleMaxWidth: 0,
    titleSize: 72,
    ...options,
  })
}

export const templates = {
  cover: cover(),
  split: split(),
} as const
