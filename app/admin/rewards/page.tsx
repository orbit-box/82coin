import {randomUUID} from "node:crypto";
import Link from "next/link";
import {adminId} from "@/lib/admin-auth";
import {db} from "@/lib/db";
import {rewardSchema} from "@/lib/rewards";
import {adjustReward} from "@/lib/admin-reward-actions";
export const dynamic="force-dynamic";
export const metadata={title:"리워드 관리 | 82coin"};
export default async function AdminRewards({searchParams}:{searchParams:Promise<{notice?:string;q?:string}>}){
 const actor=await adminId();if(!actor)return <section className="panel"><h1>관리자 전용</h1><p>토큰 내역과 지급 기능은 관리자만 접근할 수 있습니다.</p><Link href="/admin">관리자 홈</Link></section>;
 const p=await searchParams,search=(p.q||"").trim().slice(0,70);
 let users:{id:number;name:string;email:string;balance:string;earned:string}[]=[],recent:{member_id:number;name:string;amount:string;kind:string;reference:string;created_at:Date}[]=[],audits:{actor_name:string;member_name:string;delta:number;reason:string;created_at:Date}[]=[],spin:{member_id:number;name:string;balance:number}[]=[];let error="";
 try{
  await rewardSchema();const client=await db();
  await client.query("CREATE TABLE IF NOT EXISTS reward_admin_audit(id BIGSERIAL PRIMARY KEY,actor_id INTEGER NOT NULL REFERENCES members(id),member_id INTEGER NOT NULL REFERENCES members(id),delta INTEGER NOT NULL,reason VARCHAR(300) NOT NULL,ledger_reference TEXT NOT NULL UNIQUE,created_at TIMESTAMPTZ NOT NULL DEFAULT now())");
  const rows=await Promise.all([
   client.query<{id:number;name:string;email:string;balance:string;earned:string}>("SELECT m.id,m.name,m.email,COALESCE(w.balance,0)::text balance,COALESCE(w.earned,0)::text earned FROM members m LEFT JOIN reward_wallets w ON w.member_id=m.id WHERE ($1='' OR m.name ILIKE '%'||$1||'%' OR m.email ILIKE '%'||$1||'%' OR m.id::text=$1) ORDER BY m.id DESC LIMIT 30",[search]),
   client.query<{member_id:number;name:string;amount:string;kind:string;reference:string;created_at:Date}>("SELECT l.member_id,m.name,l.amount::text amount,l.kind,l.reference,l.created_at FROM reward_ledger l JOIN members m ON m.id=l.member_id ORDER BY l.id DESC LIMIT 35"),
   client.query<{actor_name:string;member_name:string;delta:number;reason:string;created_at:Date}>("SELECT a.name actor_name,m.name member_name,x.delta,x.reason,x.created_at FROM reward_admin_audit x JOIN members a ON a.id=x.actor_id JOIN members m ON m.id=x.member_id ORDER BY x.id DESC LIMIT 30"),
   client.query<{member_id:number;name:string;balance:number}>("SELECT s.member_id,m.name,s.balance FROM reward_spin_wallets s JOIN members m ON m.id=s.member_id WHERE s.balance>0 ORDER BY s.balance DESC LIMIT 20")
  ]);[users,recent,audits,spin]=rows.map(x=>x.rows) as [typeof users,typeof recent,typeof audits,typeof spin];
 }catch(e){error=e instanceof Error?e.message:"조회 오류"}
 return <div className="adminRewards"><div className="pageHeading"><div><span className="eyebrow">82COIN ADMIN</span><h1>82토큰 운영 관리</h1><p>지급·회수, 쿠폰 잔고와 토큰 원장을 관리합니다.</p></div><Link href="/admin" className="subtleButton">관리자 홈 →</Link></div>
 {p.notice&&<p className="rewardNotice" role="status">{p.notice.slice(0,160)}</p>}{error&&<p className="authError">조회 오류: {error}</p>}
 <div className="adminRewardColumns"><section className="panel"><h2>토큰 수동 지급·회수</h2><p className="hint">작업자와 사유가 감사 원장에 남습니다. 회원별 1회 최대 10,000T, 회수는 보유 잔고 이내에서만 가능합니다.</p><form action={adjustReward} className="adminRewardForm"><input type="hidden" name="operationId" value={randomUUID()}/><label>회원 ID<input type="number" name="memberId" required min="1" placeholder="회원 검색 후 ID 입력"/></label><label>구분<select name="kind"><option value="grant">지급 (+)</option><option value="deduct">회수 (-)</option></select></label><label>토큰 수량<input type="number" name="amount" required min="1" max="10000" placeholder="예: 100"/></label><label>사유 (10자 이상)<textarea name="reason" required minLength={10} maxLength={300} rows={3} placeholder="오류제보 검수 승인 등 지급·회수 사유"/></label><button className="button" type="submit">지급·회수 실행</button></form></section>
 <section className="panel"><h2>회원별 토큰 조회</h2><form action="/admin/rewards" className="searchbar"><input name="q" placeholder="회원 이름 / 이메일 / ID" defaultValue={search}/><button className="subtleButton">검색</button></form><div className="adminRewardScroll"><table><thead><tr><th>ID</th><th>닉네임</th><th>현재 잔고</th><th>누적 획득</th></tr></thead><tbody>{users.map(x=><tr key={x.id}><td>{x.id}</td><td title={x.email}>{x.name}</td><td>{Number(x.balance).toLocaleString()} T</td><td>{Number(x.earned).toLocaleString()} T</td></tr>)}</tbody></table></div></section></div>
 <div className="adminRewardColumns"><section className="panel"><h2>최근 토큰 지급 내역</h2><div className="adminRewardScroll"><table><thead><tr><th>회원</th><th>구분</th><th>수량</th><th>날짜 / 참조</th></tr></thead><tbody>{recent.map((x,i)=><tr key={i}><td>{x.name} (#{x.member_id})</td><td>{x.kind==="ATTENDANCE"?"출석":"관리자 조정"}</td><td>{Number(x.amount)>0?"+":""}{Number(x.amount).toLocaleString()} T</td><td>{new Date(x.created_at).toLocaleString("ko-KR")}<small className="adminRewardRef">{x.reference}</small></td></tr>)}</tbody></table></div></section>
 <section className="panel"><h2>관리자 처리 감사 기록</h2><div className="adminRewardScroll"><table><thead><tr><th>작업자</th><th>대상</th><th>변경</th><th>사유</th></tr></thead><tbody>{audits.map((x,i)=><tr key={i}><td>{x.actor_name}</td><td>{x.member_name}</td><td>{x.delta>0?"+":""}{x.delta} T</td><td>{x.reason}<small className="adminRewardRef">{new Date(x.created_at).toLocaleString("ko-KR")}</small></td></tr>)}</tbody></table></div></section></div>
 <section className="panel"><h2>룰렛 쿠폰 보유 현황</h2><p className="hint">쿠폰 사용 기능은 아직 비활성화되어 있으며, 여기서는 조회만 가능합니다.</p><div className="adminRewardScroll"><table><thead><tr><th>회원 ID</th><th>닉네임</th><th>보유 쿠폰</th></tr></thead><tbody>{spin.map(x=><tr key={x.member_id}><td>{x.member_id}</td><td>{x.name}</td><td>{x.balance}장</td></tr>)}</tbody></table></div></section>
 </div>
}
