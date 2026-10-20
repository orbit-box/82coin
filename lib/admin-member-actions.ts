"use server";
import {requireAdmin} from "@/lib/admin-auth";
import {db} from "@/lib/db";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
export async function setMemberSuspension(form:FormData){
 const actor=await requireAdmin();
 const member=Number(form.get("memberId"));
 const suspended=String(form.get("suspended"))==="true";
 const reason=String(form.get("reason")||"").trim();
 if(!Number.isSafeInteger(member)||member<=0||reason.length<10||reason.length>300)redirect("/admin/members?notice="+encodeURIComponent("회원 ID와 사유(10~300자)를 확인하세요."));
 const pool=await db(),c=await pool.connect();
 let notice="처리할 수 없습니다.";
 try{await c.query("BEGIN");
 const user=await c.query<{email:string;suspended:boolean}>("SELECT email,suspended FROM members WHERE id=$1 FOR UPDATE",[member]);
 if(!user.rowCount)throw Error("해당 회원이 없습니다.");
 if(member===actor||user.rows[0].email.toLowerCase()==="thdrudals14@gmail.com")throw Error("관리자 계정은 정지할 수 없습니다.");
 await c.query("CREATE TABLE IF NOT EXISTS admin_member_audit(id BIGSERIAL PRIMARY KEY,actor_id INT NOT NULL REFERENCES members(id),member_id INT NOT NULL REFERENCES members(id),action TEXT NOT NULL,reason TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now())");
 if(user.rows[0].suspended===suspended)throw Error("이미 같은 상태입니다.");
 await c.query("UPDATE members SET suspended=$2 WHERE id=$1",[member,suspended]);
 await c.query("INSERT INTO admin_member_audit(actor_id,member_id,action,reason) VALUES($1,$2,$3,$4)",[actor,member,suspended?"SUSPEND":"RESTORE",reason]);
 await c.query("COMMIT");notice=suspended?"회원 이용정지 완료":"회원 이용정지 해제 완료";
 }catch(e){await c.query("ROLLBACK");notice=e instanceof Error?e.message:"처리 오류"}finally{c.release()}
 revalidatePath("/admin/members");redirect("/admin/members?notice="+encodeURIComponent(notice));
}
