import { og } from '../../og'

export const { GET, getStaticPaths, prerender } = og.route([
  { image: 'src/assets/luke-mustachio.jpg', pathname: '/', title: 'Luke McDonald' },
  { image: 'src/assets/luke-and-heather.jpg', pathname: '/i-am-a/husband', title: 'Husband' },
  { image: 'src/assets/luke-coach.jpg', pathname: '/i-am-a/coach', title: 'Coach' },
  { pathname: '/resume', title: 'Resume' },
  { pathname: '/writing/long', title: 'A Much Longer Title That Needs To Wrap Onto Lines' },
])
