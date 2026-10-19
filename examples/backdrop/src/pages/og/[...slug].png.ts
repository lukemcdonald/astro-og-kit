import { og } from '../../og'

export const { getStaticPaths, GET } = og.route([
  { pathname: '/', title: 'Berean Bible Church', mark: false },
  { pathname: '/about', title: 'Who We Are' },
  { pathname: '/about/confessional-statement', title: 'Confessional Statement' },
  { pathname: '/about/our-beliefs', title: 'Summary of Essential Beliefs' },
  { pathname: '/calendar', title: 'Calendar' },
  { pathname: '/missions', title: 'Global Missions' },
])
