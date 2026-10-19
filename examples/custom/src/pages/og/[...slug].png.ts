import { og } from '../../og'

export const { GET, getStaticPaths, prerender } = og.route([
  { pathname: '/', title: 'Custom templates are just functions' },
])
