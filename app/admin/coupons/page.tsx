import {randomUUID} from "node:crypto";
import {db} from "@/lib/db";
import {rewardSchema} from "@/lib/rewards";
import {changeSpinCoupons} from "@/lib/admin-coupon-actions";
export const dynamic="force-dynamic";
export default async function AdminCoupons({searchParams}:{searchParams:Promise<{notice?:string}>}){
 const p=await searchParams;await rewardSchema();const pool=await db();
 const users=await pool.query<{member_id:number;name:string;email:string;balance:number}>("SELECT c.member_id,m.name,m.email,c.balance FROM reward_spin_wallets c JOIN members m ON m.id=c.member_id ORDER BY c.balance DESC,c.member_id DESC LIMIT 50");
 return <><div className="adminPageTitle"><span>COUPON MANAGEMENT</span><h1>룰렛 쿠폰 관리</h1><p>쿠폰 지급 · 회수 · 보유 현황</p></div>{p.notice&&<p className="rewardNotice">{p.notice}</p>}
 <div className="adminManageGrid"><section className="adminSection"><h2>쿠폰 지급·회수</h2><form action={changeSpinCoupons} className="adminRewardForm"><input type="hidden" name="operationId" value={randomUUID()}/><label>회원번호<input name="memberId" type="number" required min="1" placeholder="회원 관리에서 번호 확인"/></label><label>작업 종류<select name="direction"><option value="grant">쿠폰 지급 (+)</option><option value="deduct">쿠폰 회수 (-)</option></select></label><label>수량 (1~100장)<input name="amount" type="number" min="1" max="100" required/></label><label>지급·회수 사유<textarea name="reason" minLength={10} maxLength={300} required rows={3} placeholder="사유를 10자 이상 입력하세요"/></label><button className="button">쿠폰 변경 실행</button></form></section>
 <section className="adminSection"><h2>쿠폰 보유 회원</h2><div className="adminRewardScroll"><table><thead><tr><th>회원</th><th>이메일</th><th>보유 수량</th></tr></thead><tbody>{users.rows.map(m=><tr key={m.member_id}><td>#{m.member_id} {m.name}</td><td>{m.email}</td><td><b>{m.balance}장</b></td></tr>)}</tbody></table></div></section></div></>;
}
