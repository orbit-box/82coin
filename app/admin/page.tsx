import Link from "next/link";
import {query} from "@/lib/db";
import {Users,Coins,Ticket,Settings2,FileText,ArrowUpRight,ShieldCheck} from "lucide-react";
export const dynamic="force-dynamic";
export default async function Admin(){
 const [members,posts,reports]=await Promise.all([
 query<{n:string}>("SELECT count(*)::text n FROM members"),
 query<{n:string}>("SELECT count(*)::text n FROM posts"),
 query<{n:string}>("SELECT count(*)::text n FROM reports WHERE status='open'")]);
 const links=[
 {href:"/admin/members",title:"회원 관리",text:"회원 검색, 이용정지, 정지 해제",icon:Users},
 {href:"/admin/rewards",title:"82토큰 관리",text:"토큰 지급·회수, 잔고, 지급 기록",icon:Coins},
 {href:"/admin/coupons",title:"룰렛 쿠폰",text:"참여권 지급·회수와 수량 조회",icon:Ticket},
 {href:"/admin/roulette",title:"룰렛 설정",text:"보상 확률 초안, 운영 준비",icon:Settings2},
 {href:"/admin/content",title:"게시글·신고",text:"게시글 숨김, 복구, 신고 처리",icon:FileText}
 ];
 return <><div className="adminPageTitle"><span>82COIN CONTROL CENTER</span><h1>운영 대시보드</h1><p>필요한 메뉴를 눌러 사이트를 관리하세요.</p></div>
 <div className="adminKpi"><div><small>전체 회원</small><strong>{members.rows[0]?.n||0}</strong><span>명</span></div><div><small>전체 게시글</small><strong>{posts.rows[0]?.n||0}</strong><span>개</span></div><div><small>미처리 신고</small><strong>{reports.rows[0]?.n||0}</strong><span>건</span></div></div>
 <h2 className="adminSectionHeading">무엇을 관리할까요?</h2><div className="adminMenuCards">{links.map(x=><Link href={x.href} key={x.href}><span className="adminMenuIcon"><x.icon size={23}/></span><strong>{x.title}</strong><small>{x.text}</small><ArrowUpRight size={18} className="adminCardArrow"/></Link>)}</div>
 <div className="adminNotice"><ShieldCheck size={20}/><span>관리자 계정 전용 · 변경 작업은 서버에서 다시 권한을 검사하며 주요 자산 변경은 원장에 기록됩니다.</span></div></>;
}
