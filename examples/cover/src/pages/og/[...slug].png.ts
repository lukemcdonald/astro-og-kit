import { og } from '../../og'

export const prerender = true
export const { GET, getStaticPaths } = og.route([
  { footer: false, pathname: '/', title: 'Berean Bible Church' },
  { pathname: '/about', title: 'Who We Are' },
  { pathname: '/about/confessional-statement', title: 'Confessional Statement' },
  { pathname: '/about/our-beliefs', title: 'Summary of Essential Beliefs' },
  { pathname: '/calendar', title: 'Calendar' },
  { pathname: '/missions', title: 'Global Missions' },
])
