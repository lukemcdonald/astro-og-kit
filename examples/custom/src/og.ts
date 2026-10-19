import { defineOg, svg, type OgTemplate } from 'astro-og-kit'

const card: OgTemplate = ({ colors, font, height, logo, page, width }) => svg`
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="${colors.background}" />
    ${logo?.at(96, 80)}
    <text x="96" y="360" font-family="${font.family}" font-size="80"
      fill="${colors.foreground}">${page.title}</text>
  </svg>`

export const og = defineOg({
  font: { family: 'Inter', files: ['src/assets/Inter-SemiBold.ttf'], weight: 600 },
  colors: { background: '#122023', foreground: '#f4f3ec' },
  logo: { src: 'public/logo.svg', width: 56 },
  template: card,
})
