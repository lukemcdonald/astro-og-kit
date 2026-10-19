import { og } from '../../og'

export const prerender = true
export const { GET, getStaticPaths } = og.route([
  { pathname: '/', photo: 'src/assets/luke-mustachio.jpg', title: 'Luke McDonald' },
  { pathname: '/i-am-a/husband', photo: 'src/assets/luke-and-heather.jpg', title: 'Husband' },
  { pathname: '/i-am-a/coach', photo: 'src/assets/luke-coach.jpg', title: 'Coach' },
  { pathname: '/resume', title: 'Resume' },
  { pathname: '/writing/long', title: 'A Much Longer Title That Needs To Wrap Onto Lines' },
])
