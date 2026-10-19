import { defineOg, svg, wrapText, type OgTemplate } from 'astro-og-kit'

const centered: OgTemplate = ({ font, height, logo, page, theme, width }) => svg`
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="${theme.background}" />
    ${logo?.at((width - logo.width) / 2, 96)}
    <text x="50%" y="${height / 2}" text-anchor="middle" font-family="${font.family}"
      font-size="80" font-weight="${font.weight}" fill="${theme.foreground}">
      ${wrapText(page.title, {
        maxWidth: width - 160,
        measure: (line) => font.width(line, 80),
      }).map((line, i) => svg`<tspan x="50%" dy="${i ? 92 : 0}">${line}</tspan>`)}
    </text>
  </svg>`

export const og = defineOg({
  font: { family: 'Inter', files: ['src/assets/Inter-SemiBold.ttf'], weight: 600 },
  logo: { src: 'public/logo.svg', width: 72 },
  template: centered,
  theme: { background: '#122023', foreground: '#f4f3ec' },
})
