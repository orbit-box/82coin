import {db} from "@/lib/db";
import {saveRouletteDraft} from "@/lib/admin-roulette-actions";
export const dynamic="force-dynamic";
export default async function RouletteSettings({searchParams}:{searchParams:Promise<{notice?:string}>}){
 const p=await searchParams,pool=await db();
 await pool.query("CREATE TABLE IF NOT EXISTS admin_roulette_drafts(id SMALLINT PRIMARY KEY CHECK(id=1),probabilities JSONB NOT NULL,enabled BOOLEAN NOT NULL DEFAULT false,updated_by INTEGER REFERENCES members(id),updated_at TIMESTAMPTZ NOT NULL DEFAULT now())");
 const r=await pool.query<{probabilities:Record<string,number>;updated_at:Date}>("SELECT probabilities,updated_at FROM admin_roulette_drafts WHERE id=1");
 const probabilities=r.rows[0]?.probabilities||{"1":50,"10":30,"100":14,"500":5,"1000":1};
 return <><div className="adminPageTitle"><span>ROULETTE SETTINGS</span><h1>룰렛 설정</h1><p>보상 확률을 초안으로 저장하고 관리합니다.</p></div>{p.notice&&<p className="rewardNotice">{p.notice}</p>}
 <div className="adminManageGrid"><section className="adminSection"><h2>당첨 확률 초안</h2><form action={saveRouletteDraft} className="adminRewardForm">{[1,10,100,500,1000].map(n=><label key={n}>{n.toLocaleString()}T 당첨 확률 (%)<input type="number" min="0" max="100" step="1" defaultValue={probabilities[String(n)]} name={"p"+n} required/></label>)}<p className="hint">다섯 확률의 합계는 정확히 100%여야 합니다.</p><button className="button">초안 저장</button></form></section>
 <section className="adminSection"><h2>운영 상태</h2><p className="adminModeOff">룰렛 참여 비활성</p><p>확률 초안을 저장해도 회원의 쿠폰이 차감되거나 토큰이 지급되지 않습니다.</p><p>룰렛 실행과 지급 원장·중복 참여 방지·운영 정책 검증이 끝나야 정식 오픈할 수 있습니다.</p>{r.rows[0]&&<p className="hint">최근 초안 저장: {new Date(r.rows[0].updated_at).toLocaleString("ko-KR")}</p>}</section></div></>;
}
