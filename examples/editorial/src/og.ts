import { defineOg } from 'astro-og-kit'

export const og = defineOg({
  font: { family: 'Inter', files: ['src/assets/Inter-SemiBold.ttf'], weight: 600 },
  logo: { src: 'public/logo.svg', width: 72 },
  mark: 'lukemcdonald.com',
  template: 'editorial',
  theme: { accent: '#c6c6bd', background: '#122023', foreground: '#f4f3ec', muted: '#c6c6bd' },
})
