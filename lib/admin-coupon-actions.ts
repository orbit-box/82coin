"use server";
import {randomUUID} from "node:crypto";
import {requireAdmin} from "@/lib/admin-auth";
import {rewardSchema} from "@/lib/rewards";
import {db} from "@/lib/db";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
export async function changeSpinCoupons(form:FormData){
 const actor=await requireAdmin();
 const member=Number(form.get("memberId")),amount=Number(form.get("amount"));
 const direction=String(form.get("direction")),reason=String(form.get("reason")||"").trim();
 const operationId=String(form.get("operationId")||"");
 if(!Number.isSafeInteger(member)||member<=0||!Number.isSafeInteger(amount)||amount<1||amount>100||!["grant","deduct"].includes(direction)||reason.length<10||reason.length>300||!/^[0-9a-f-]{36}$/i.test(operationId))redirect("/admin/coupons?notice=입력값을 확인하세요");
 await rewardSchema();const pool=await db(),c=await pool.connect();let notice="처리 오류";
 try{await c.query("BEGIN");
 const exists=await c.query("SELECT id FROM members WHERE id=$1",[member]);if(!exists.rowCount)throw Error("회원을 찾지 못했습니다.");
 await c.query("INSERT INTO reward_spin_wallets(member_id) VALUES($1) ON CONFLICT DO NOTHING",[member]);
 const w=await c.query<{balance:number}>("SELECT balance FROM reward_spin_wallets WHERE member_id=$1 FOR UPDATE",[member]);
 const delta=direction==="grant"?amount:-amount;
 if(w.rows[0].balance+delta<0)throw Error("보유 쿠폰보다 많이 회수할 수 없습니다.");
 await c.query("CREATE TABLE IF NOT EXISTS admin_coupon_audit(id BIGSERIAL PRIMARY KEY,actor_id INT NOT NULL REFERENCES members(id),member_id INT NOT NULL REFERENCES members(id),delta INT NOT NULL,reason TEXT NOT NULL,reference TEXT NOT NULL UNIQUE,created_at TIMESTAMPTZ NOT NULL DEFAULT now())");
 const ref="admin-coupon:"+operationId;
 if((await c.query("SELECT 1 FROM admin_coupon_audit WHERE reference=$1",[ref])).rowCount)throw Error("이미 처리한 요청입니다.");
 await c.query("INSERT INTO reward_spin_ledger(member_id,amount,reason,reference) VALUES($1,$2,'ADMIN_ADJUST',$3)",[member,delta,ref]);
 await c.query("UPDATE reward_spin_wallets SET balance=balance+$2,earned=earned+$3 WHERE member_id=$1",[member,delta,Math.max(0,delta)]);
 await c.query("INSERT INTO admin_coupon_audit(actor_id,member_id,delta,reason,reference) VALUES($1,$2,$3,$4,$5)",[actor,member,delta,reason,ref]);
 await c.query("COMMIT");notice=(delta>0?"+":"")+delta+"장 처리 완료";
 }catch(e){await c.query("ROLLBACK");notice=e instanceof Error?e.message:"처리 오류"}finally{c.release()}
 revalidatePath("/admin/coupons");revalidatePath("/benefits");
 redirect("/admin/coupons?notice="+encodeURIComponent(notice));
}
