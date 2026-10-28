"use client";
import {usePathname} from "next/navigation";
import Link from "next/link";
import NewsSearch from "@/components/NewsSearch";
import {logout} from "@/lib/actions";
export default function SiteChrome({children,signedIn}:{children:React.ReactNode;signedIn:boolean}){
 const path=usePathname();
 if(path==="/admin"||path?.startsWith("/admin/"))return <main className="adminStandalone">{children}</main>;
 return <>
 <header className="header"><div className="shell headerInner">
 <Link className="logo" href="/" aria-label="82coin 홈"><img className="officialHeaderLogo" src="/82coin-header-logo.png" width="178" height="54" alt="82coin MARKET & COMMUNITY"/></Link>
 <nav aria-label="주요 메뉴" className="mainNav"><Link href="/">홈</Link><Link href="/market">시장정보</Link><Link href="/community">커뮤니티</Link><Link href="/benefits">리워드존</Link><Link href="/paper-trading">가상매매</Link><Link href="/information-subscription">정보구독</Link></nav>
 <div className="headerActions"><NewsSearch/><Link className="headerAccount" href="/profile">MY</Link>{signedIn?<form action={logout} className="headerLogoutForm"><button className="headerSignIn" type="submit">로그아웃</button></form>:<Link className="headerSignIn" href="/login">로그인</Link>}</div>
 </div></header>
 <main className="shell">{children}</main>
 <footer className="footer"><div className="shell footerInner"><div><strong>82coin</strong><p>실시간 암호화폐 정보와 자유로운 투자자 커뮤니티</p></div><div className="footerLinks"><Link href="/notices">이용 안내</Link><Link href="/calendar">경제 일정</Link><Link href="/community">커뮤니티</Link></div><p className="footerDisclaimer">© 2026 82coin · 제공 정보는 참고용입니다. 투자 판단과 책임은 이용자에게 있습니다.</p></div></footer>
 </>;
}