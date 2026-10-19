import { og } from '../../og'

export const prerender = true
export const { GET, getStaticPaths } = og.route([
  { pathname: '/', photo: 'src/assets/photo-a.jpg', title: 'Hello, world' },
  { pathname: '/about', photo: 'src/assets/photo-b.jpg', title: 'About us' },
  { pathname: '/docs', photo: 'src/assets/photo-c.jpg', title: 'Getting started' },
  { pathname: '/blog', title: 'Example Site' },
  { pathname: '/writing/long', title: 'A Much Longer Title That Needs To Wrap Onto Lines' },
])
