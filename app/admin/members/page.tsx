import {db} from "@/lib/db";
import {setMemberSuspension} from "@/lib/admin-member-actions";
export const dynamic="force-dynamic";
export default async function Members({searchParams}:{searchParams:Promise<{q?:string;notice?:string}>}){
 const p=await searchParams,q=(p.q||"").trim().slice(0,80),pool=await db();
 const members=await pool.query<{id:number;email:string;name:string;suspended:boolean;created_at:Date}>("SELECT id,email,name,suspended,created_at FROM members WHERE ($1='' OR email ILIKE '%'||$1||'%' OR name ILIKE '%'||$1||'%' OR id::text=$1) ORDER BY id DESC LIMIT 50",[q]);
 return <><div className="adminPageTitle"><span>MEMBERS</span><h1>회원 관리</h1><p>회원 검색 · 이용정지 · 정지 해제</p></div>{p.notice&&<p className="rewardNotice">{p.notice}</p>}
 <form action="/admin/members" className="adminSearch"><input name="q" defaultValue={q} placeholder="이메일, 닉네임 또는 회원번호 검색"/><button className="button">회원 찾기</button></form>
 <section className="adminSection"><h2>회원 목록 <small>최근 50명까지 표시</small></h2><div className="adminRewardScroll"><table><thead><tr><th>회원번호</th><th>닉네임 / 이메일</th><th>가입일</th><th>상태</th><th>관리</th></tr></thead><tbody>{members.rows.map(m=><tr key={m.id}><td>#{m.id}</td><td><b>{m.name}</b><small className="adminRewardRef">{m.email}</small></td><td>{new Date(m.created_at).toLocaleDateString("ko-KR")}</td><td>{m.suspended?"이용정지":"정상"}</td><td>{m.email.toLowerCase()==="thdrudals14@gmail.com"?"관리자 계정":<details className="adminInlineDetails"><summary>{m.suspended?"정지 해제":"이용정지"}</summary><form action={setMemberSuspension}><input type="hidden" name="memberId" value={m.id}/><input type="hidden" name="suspended" value={String(!m.suspended)}/><textarea name="reason" required minLength={10} maxLength={300} placeholder="처리 사유를 10자 이상 입력" rows={2}/><button className="subtleButton">변경 확정</button></form></details>}</td></tr>)}</tbody></table></div></section></>;
}
