import {query} from "@/lib/db";
import {moderate} from "@/lib/moderation";
export const dynamic="force-dynamic";
export default async function ContentAdmin(){
 const [posts,reports]=await Promise.all([
 query<{id:number;title:string;hidden:boolean;name:string|null}>("SELECT p.id,p.title,p.hidden,m.name FROM posts p LEFT JOIN members m ON m.id=p.member_id ORDER BY p.id DESC LIMIT 30"),
 query<{id:number;reason:string;status:string;post_id:number}>("SELECT id,reason,status,post_id FROM reports ORDER BY id DESC LIMIT 30")]);
 return <><div className="adminPageTitle"><span>COMMUNITY</span><h1>게시글·신고 관리</h1><p>게시글 숨김 · 복구 · 신고 처리</p></div><div className="adminManageGrid"><section className="adminSection"><h2>최근 게시글</h2>{posts.rows.map(p=><div className="adminListRow" key={p.id}><span><b>#{p.id} {p.title}</b><small>{p.name||"탈퇴 회원"} · {p.hidden?"숨김":"공개"}</small></span><form action={moderate}><input type="hidden" name="target" value={p.id}/><button name="action" value={p.hidden?"show":"hide"} className="subtleButton">{p.hidden?"복구":"숨기기"}</button></form></div>)}</section><section className="adminSection"><h2>최근 신고</h2>{reports.rows.map(r=><div className="adminListRow" key={r.id}><span><b>신고 #{r.id} · 게시글 #{r.post_id}</b><small>{r.reason} · {r.status}</small></span>{r.status!=="resolved"&&<form action={moderate}><input type="hidden" name="target" value={r.id}/><button name="action" value="resolve" className="subtleButton">처리 완료</button></form>}</div>)}</section></div></>;
}
