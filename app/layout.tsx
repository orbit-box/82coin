import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
export const metadata:Metadata={title:"82coin | 실시간 암호화폐 정보와 커뮤니티",description:"실시간 속보, 시세, 김치프리미엄과 투자자 커뮤니티를 한곳에서."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ko"><body><header className="header"><div className="shell headerInner"><Link className="logo" href="/"><span className="logomark">82</span><span>coin<small>MARKET & COMMUNITY</small></span></Link><nav><Link href="/">홈</Link><Link href="/market">시장정보</Link><Link href="/community">커뮤니티</Link><Link href="/benefits">혜택</Link><Link className="navLogin" href="/login">로그인</Link></nav></div></header><main className="shell">{children}</main><footer className="shell footer">© 2026 82coin · 데이터는 참고용이며 지연될 수 있습니다. 투자 판단과 책임은 사용자에게 있습니다.</footer></body></html>}
