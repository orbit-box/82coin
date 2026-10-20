import Link from "next/link";
import {adminId} from "@/lib/admin-auth";
import {redirect} from "next/navigation";
const pages=[["/admin","대시보드"],["/admin/members","회원 관리"],["/admin/rewards","82토큰 관리"],["/admin/coupons","룰렛 쿠폰"],["/admin/roulette","룰렛 설정"],["/admin/content","게시글·신고"]];
export default async function AdminLayout({children}:{children:React.ReactNode}){
 if(!await adminId())redirect("/login");
 return <div className="adminCenter"><aside className="adminSide"><div className="adminBrand"><strong>82coin</strong><span>관리자센터</span></div><nav aria-label="관리자 메뉴">{pages.map(([href,label])=><Link key={href} href={href}>{label}<span>→</span></Link>)}</nav><Link className="adminBack" href="/">← 사이트 돌아가기</Link></aside><div className="adminCenterMain">{children}</div></div>;
}
