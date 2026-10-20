"use server";
import {requireAdmin} from "@/lib/admin-auth";
import {rewardSchema} from "@/lib/rewards";
import {db} from "@/lib/db";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
const go=(m:string):never=>redirect("/admin/catalog?notice="+encodeURIComponent(m));
export async function saveCouponProduct(form:FormData){
 const actor=await requireAdmin();
 const id=Number(form.get("id")||0),title=String(form.get("title")||"").trim(),description=String(form.get("description")||"").trim();
 const cost=Number(form.get("cost")),stock=Number(form.get("stock")),active=form.get("active")==="yes";
 if(!Number.isSafeInteger(id)||id<0||title.length<2||title.length>100||description.length>1000||!Number.isSafeInteger(cost)||cost<0||cost>10000000||!Number.isSafeInteger(stock)||stock<0||stock>100000||active&&stock===0)go("상품명, 수량, 가격을 확인해주세요.");
 await rewardSchema();const pool=await db(),c=await pool.connect();let result="저장에 실패했습니다.";
 try{await c.query("BEGIN");
 await c.query("CREATE TABLE IF NOT EXISTS admin_catalog_audit(id BIGSERIAL PRIMARY KEY,actor_id INT NOT NULL REFERENCES members(id),coupon_id BIGINT NOT NULL,action TEXT NOT NULL,details JSONB NOT NULL,created_at TIMESTAMPTZ DEFAULT now())");
 let product:number;
 if(id){const found=await c.query<{id:string}>("SELECT id FROM reward_coupons WHERE id=$1 FOR UPDATE",[id]);if(!found.rowCount)throw Error("상품을 찾을 수 없습니다.");
 await c.query("UPDATE reward_coupons SET title=$2,description=$3,cost=$4,stock=$5,active=$6 WHERE id=$1",[id,title,description,cost,stock,active]);product=id;
 }else{const n=await c.query<{id:string}>("INSERT INTO reward_coupons(title,description,cost,stock,active) VALUES($1,$2,$3,$4,$5) RETURNING id",[title,description,cost,stock,active]);product=Number(n.rows[0].id);}
 await c.query("INSERT INTO admin_catalog_audit(actor_id,coupon_id,action,details) VALUES($1,$2,$3,$4::jsonb)",[actor,product,id?"UPDATE":"CREATE",JSON.stringify({title,description,cost,stock,active})]);await c.query("COMMIT");result="상품이 저장되었습니다.";
 }catch(e){await c.query("ROLLBACK");result=e instanceof Error?e.message:"저장 오류"}finally{c.release()}
 revalidatePath("/admin/catalog");revalidatePath("/benefits/coupons");go(result);
}
