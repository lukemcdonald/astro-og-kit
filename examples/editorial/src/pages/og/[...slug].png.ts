import { og } from '../../og'

export const { getStaticPaths, GET } = og.route([
  { pathname: '/', title: 'Luke McDonald', image: 'src/assets/luke-mustachio.jpg' },
  { pathname: '/i-am-a/husband', title: 'Husband', image: 'src/assets/luke-and-heather.jpg' },
  { pathname: '/i-am-a/coach', title: 'Coach', image: 'src/assets/luke-coach.jpg' },
  { pathname: '/resume', title: 'Resume' },
  { pathname: '/writing/long', title: 'A Much Longer Title That Needs To Wrap Onto Lines' },
])
