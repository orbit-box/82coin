import {db} from "@/lib/db";
import {saveRouletteDraft} from "@/lib/admin-roulette-actions";
export const dynamic="force-dynamic";
export default async function RouletteSettings({searchParams}:{searchParams:Promise<{notice?:string}>}){
 const p=await searchParams,pool=await db();
 await pool.query("CREATE TABLE IF NOT EXISTS admin_roulette_drafts(id SMALLINT PRIMARY KEY CHECK(id=1),probabilities JSONB NOT NULL,enabled BOOLEAN NOT NULL DEFAULT false,updated_by INTEGER REFERENCES members(id),updated_at TIMESTAMPTZ NOT NULL DEFAULT now())");
 const r=await pool.query<{probabilities:Record<string,number>;enabled:boolean;updated_at:Date}>("SELECT probabilities,enabled,updated_at FROM admin_roulette_drafts WHERE id=1");
 const probabilities=r.rows[0]?.probabilities||{"1":50,"10":30,"100":14,"500":5,"1000":1};
 return <><div className="adminPageTitle"><span>ROULETTE SETTINGS</span><h1>룰렛 설정</h1><p>보상 확률을 초안으로 저장하고 관리합니다.</p></div>{p.notice&&<p className="rewardNotice">{p.notice}</p>}
 <div className="adminManageGrid"><section className="adminSection"><h2>당첨 확률 초안</h2><form action={saveRouletteDraft} className="adminRewardForm">{[1,10,100,500,1000].map(n=><label key={n}>{n.toLocaleString()}T 당첨 확률 (%)<input type="number" min="0" max="100" step="1" defaultValue={probabilities[String(n)]} name={"p"+n} required/></label>)}<p className="hint">다섯 확률의 합계는 정확히 100%여야 합니다.</p><label>룰렛 운영 상태<select name="enabled" defaultValue={r.rows[0]?.enabled?"yes":"no"}><option value="no">운영 중지</option><option value="yes">운영 시작 (쿠폰 실제 차감 및 토큰 지급)</option></select></label><button className="button">초안 저장</button></form></section>
 <section className="adminSection"><h2>운영 상태</h2><p className="adminModeOff">{r.rows[0]?.enabled?"룰렛 운영 중":"룰렛 운영 중지"}</p><p>운영 시작을 선택해 저장하면 회원의 룰렛 쿠폰 1장씩 차감되고 설정 확률에 따라 토큰이 실제 지급됩니다.</p><p>당첨 결과는 서버에서 결정되며 지급·차감 내역이 별도 원장에 기록됩니다. 운영 전 확률과 보상 비용을 검토하세요.</p>{r.rows[0]&&<p className="hint">최근 초안 저장: {new Date(r.rows[0].updated_at).toLocaleString("ko-KR")}</p>}</section></div></>;
}
