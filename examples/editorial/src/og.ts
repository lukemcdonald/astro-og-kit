import { defineOg } from 'astro-og-kit'

export const og = defineOg({
  template: 'editorial',
  font: { family: 'Inter', files: ['src/assets/Inter-SemiBold.ttf'], weight: 600 },
  theme: { background: '#122023', foreground: '#f4f3ec', muted: '#c6c6bd', accent: '#c6c6bd' },
  logo: { src: 'public/logo.svg', width: 72 },
  mark: 'lukemcdonald.com',
})
