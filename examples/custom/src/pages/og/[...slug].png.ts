import { og } from '../../og'

export const prerender = true
export const { GET, getStaticPaths } = og.route([{ pathname: '/', title: 'Hello, world' }])
