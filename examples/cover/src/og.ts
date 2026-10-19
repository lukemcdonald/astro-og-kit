import { cover, defineOg } from 'astro-og-kit'

export const og = defineOg({
  font: { family: 'Merriweather', files: ['src/assets/Merriweather-Bold.ttf'] },
  colors: {
    accent: '#ba9b47',
    background: '#4c0818',
    foreground: '#f9f9f8',
    logo: false,
    muted: '#cfb97f',
    overlay: '#26040c',
  },
  logo: { src: 'public/logo.svg', width: 192 },
  footer: 'Example Site',
  photo: { position: 'left', src: 'src/assets/hero.jpg' },
  template: cover({ maxWidth: 720, opacity: 0.72 }),
})
