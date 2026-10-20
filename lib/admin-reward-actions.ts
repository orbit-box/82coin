"use server";
import {db} from "@/lib/db";
import {rewardSchema} from "@/lib/rewards";
import {requireAdmin} from "@/lib/admin-auth";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
const result=(msg:string)=>redirect("/admin/rewards?notice="+encodeURIComponent(msg));
export async function adjustReward(form:FormData){
 const actor=await requireAdmin();
 const member=Number(form.get("memberId")), amount=Number(form.get("amount")),reason=String(form.get("reason")||"").trim(),kind=String(form.get("kind")||"");
 const operationId=String(form.get("operationId")||"");
 if(!Number.isSafeInteger(member)||member<=0||!Number.isSafeInteger(amount)||amount<1||amount>10000||reason.length<10||reason.length>300||!["grant","deduct"].includes(kind)||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(operationId))result("입력값을 확인해주세요. 1~10,000T, 사유 10~300자");
 await rewardSchema();const pool=await db(),c=await pool.connect();
 let outcome="처리에 실패했습니다.";
 try{
  await c.query("BEGIN");
  const target=await c.query("SELECT id FROM members WHERE id=$1",[member]);
  if(!target.rowCount)throw Error("대상 회원을 찾을 수 없습니다.");
  await c.query("INSERT INTO reward_wallets(member_id) VALUES($1) ON CONFLICT DO NOTHING",[member]);
  const w=await c.query<{balance:string}>("SELECT balance FROM reward_wallets WHERE member_id=$1 FOR UPDATE",[member]);
  const delta=kind==="grant"?amount:-amount;
  if(Number(w.rows[0].balance)+delta<0)throw Error("보유 토큰보다 많이 회수할 수 없습니다.");
  await c.query("CREATE TABLE IF NOT EXISTS reward_admin_audit(id BIGSERIAL PRIMARY KEY,actor_id INTEGER NOT NULL REFERENCES members(id),member_id INTEGER NOT NULL REFERENCES members(id),delta INTEGER NOT NULL,reason VARCHAR(300) NOT NULL,ledger_reference TEXT NOT NULL UNIQUE,created_at TIMESTAMPTZ NOT NULL DEFAULT now())");
  const reference="admin:"+operationId;
  const existing=await c.query("SELECT id FROM reward_admin_audit WHERE ledger_reference=$1",[reference]);
  if(existing.rowCount)throw Error("이미 처리된 요청입니다. 기록을 확인해주세요.");
  await c.query("INSERT INTO reward_ledger(member_id,amount,kind,reference) VALUES($1,$2,$3,$4)",[member,delta,"ADMIN_ADJUST",reference]);
  await c.query("UPDATE reward_wallets SET balance=balance+$2,earned=earned+$3,updated_at=now() WHERE member_id=$1",[member,delta,delta>0?delta:0]);
  await c.query("INSERT INTO reward_admin_audit(actor_id,member_id,delta,reason,ledger_reference) VALUES($1,$2,$3,$4,$5)",[actor,member,delta,reason,reference]);
  await c.query("COMMIT");outcome=(delta>0?"+":"")+delta+"T 처리 완료";
 }catch(e){await c.query("ROLLBACK");outcome=e instanceof Error?e.message:"처리 중 오류가 발생했습니다."}finally{c.release()}
 revalidatePath("/admin/rewards");revalidatePath("/benefits");revalidatePath("/benefits/wallet");revalidatePath("/profile");result(outcome)
}
