import { backdrop, defineOg } from 'astro-og-kit'

export const og = defineOg({
  background: {
    crop: [0, 0, 600, 600],
    opacity: 0.72,
    overlay: '#26040c',
    position: 'left',
    src: 'src/assets/hero.jpg',
  },
  font: { family: 'Merriweather', files: ['src/assets/Merriweather-Bold.ttf'] },
  footer: 'Berean Bible Church',
  logo: { css: '.text-secondary-200 { fill: #e8ddc1 }', src: 'public/logo.svg', width: 192 },
  template: backdrop({ titleMaxWidth: 720 }),
  theme: { accent: '#ba9b47', background: '#4c0818', foreground: '#f9f9f8', muted: '#cfb97f' },
})
