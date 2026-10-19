import type { OgConfig, OgPage, OgRoute } from './types.ts'

import { slugFor } from './page-path.ts'
import { renderPng } from './render.ts'

export function createRoute(config: OgConfig) {
  return (pages: OgPage[] | (() => OgPage[] | Promise<OgPage[]>)): OgRoute => ({
    GET: async ({ props }) => {
      if (typeof props.title !== 'string' || props.title.length === 0) {
        throw new Error(
          '[astro-og-kit] Missing page title. og.route() GET needs a prerendered page with props.title. Add a literal `export const prerender = true` to the route file.',
        )
      }

      const png = await renderPng(config, { ...props, title: props.title })

      return new Response(Uint8Array.from(png), {
        headers: { 'Content-Type': 'image/png' },
      })
    },
    getStaticPaths: async () => {
      const list = typeof pages === 'function' ? await pages() : pages

      return list.map((page) => ({
        params: { slug: slugFor(page.pathname ?? '/') },
        props: page,
      }))
    },
  })
}
