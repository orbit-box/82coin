import {NextResponse} from "next/server";
import {db} from "@/lib/db";
import {adminId} from "@/lib/admin-auth";
export const dynamic="force-dynamic";
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!/^[1-9][0-9]{0,14}$/.test(id))return new NextResponse(null,{status:404});
 const pool=await db();
 const r=await pool.query<{content:Buffer;mime:string;active:boolean}>("SELECT i.content,i.mime,c.active FROM reward_coupon_images i JOIN reward_coupons c ON c.id=i.coupon_id WHERE i.coupon_id=$1",[id]).catch(()=>null);
 if(!r?.rows.length)return new NextResponse(null,{status:404});
 const x=r.rows[0];
 if(!x.active&&!await adminId())return new NextResponse(null,{status:404});
 return new NextResponse(new Uint8Array(x.content),{headers:{"Content-Type":x.mime,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
}
