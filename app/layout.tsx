import {sessionId} from "@/lib/auth";
import SiteChrome from "@/components/SiteChrome";
import type {Metadata} from "next";
import "./globals.css";
export const metadata:Metadata={title:"82coin | 실시간 암호화폐 정보와 커뮤니티",description:"실시간 속보, 암호화폐 시세, 김치프리미엄과 투자자 커뮤니티를 한눈에."};
export default async function RootLayout({children}:{children:React.ReactNode}){
 const signedIn=Boolean(await sessionId());
 return <html lang="ko"><body><SiteChrome signedIn={signedIn}>{children}</SiteChrome></body></html>;
}
