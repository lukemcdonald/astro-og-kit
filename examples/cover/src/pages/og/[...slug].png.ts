import { og } from '../../og'

export const prerender = true
export const { GET, getStaticPaths } = og.route([
  { footer: false, pathname: '/', title: 'Hello, world' },
  { pathname: '/about', title: 'About us' },
  { pathname: '/about/team', title: 'Our team' },
  { pathname: '/docs', title: 'Getting started' },
  { pathname: '/blog', title: 'Latest posts' },
  { pathname: '/contact', title: 'Contact' },
])
