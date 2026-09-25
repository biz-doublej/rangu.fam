import { redirect } from 'next/navigation'

// 구글 로그인은 첫 로그인이 곧 가입이라 별도 가입 화면이 없다.
export default function WikiRegisterPage() {
  redirect('/wiki/login')
}
