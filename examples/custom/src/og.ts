import { defineOg, svg, type OgTemplate } from 'astro-og-kit'

const card: OgTemplate = ({ font, height, logo, page, theme, width }) => svg`
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="${theme.background}" />
    ${logo?.at(96, 80)}
    <text x="96" y="360" font-family="${font.family}" font-size="80"
      fill="${theme.foreground}">${page.title}</text>
  </svg>`

export const og = defineOg({
  font: { family: 'Inter', files: ['src/assets/Inter-SemiBold.ttf'], weight: 600 },
  logo: { src: 'public/logo.svg', width: 56 },
  template: card,
  theme: { background: '#122023', foreground: '#f4f3ec' },
})
