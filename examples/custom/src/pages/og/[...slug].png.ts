import { og } from '../../og'

export const { GET, getStaticPaths } = og.route([
  { pathname: '/', title: 'Custom templates are just functions' },
])
