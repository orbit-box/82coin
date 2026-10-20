"use server";
import {requireAdmin} from "@/lib/admin-auth";
import {db} from "@/lib/db";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
export async function saveRouletteDraft(form:FormData){
 const actor=await requireAdmin();
 const values=[1,10,100,500,1000].map(t=>Number(form.get("p"+t)));
 if(values.some(v=>!Number.isInteger(v)||v<0||v>100)||values.reduce((a,b)=>a+b,0)!==100)redirect("/admin/roulette?notice="+encodeURIComponent("확률은 0~100의 정수이며 합계는 100이어야 합니다."));
 const pool=await db(),c=await pool.connect();let notice="저장 실패";
 try{await c.query("BEGIN");
 await c.query("CREATE TABLE IF NOT EXISTS admin_roulette_drafts(id SMALLINT PRIMARY KEY CHECK(id=1),probabilities JSONB NOT NULL,enabled BOOLEAN NOT NULL DEFAULT false,updated_by INTEGER REFERENCES members(id),updated_at TIMESTAMPTZ NOT NULL DEFAULT now())");
 await c.query("INSERT INTO admin_roulette_drafts(id,probabilities,enabled,updated_by) VALUES(1,$1::jsonb,false,$2) ON CONFLICT(id) DO UPDATE SET probabilities=EXCLUDED.probabilities,enabled=false,updated_by=EXCLUDED.updated_by,updated_at=now()",[JSON.stringify(Object.fromEntries([1,10,100,500,1000].map((n,i)=>[n,values[i]]))),actor]);
 await c.query("COMMIT");notice="룰렛 확률 초안 저장 완료 (실제 룰렛 비활성)";
 }catch(e){await c.query("ROLLBACK");notice="저장 실패: "+(e instanceof Error?e.message:"오류")}finally{c.release()}
 revalidatePath("/admin/roulette");redirect("/admin/roulette?notice="+encodeURIComponent(notice));
}
