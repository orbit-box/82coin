import {NextResponse} from "next/server";
import {newToken,mailReady,validEmail} from "../../../../lib/email-tokens";
import {query} from "../../../../lib/db";
export const dynamic="force-dynamic";
const response=(data:Record<string,unknown>,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});
export async function POST(req:Request){
 try{
  if(!mailReady())return response({ok:false,error:"이메일 발송 설정을 확인해주세요."},503);
  const origin=req.headers.get("origin");
  const host=req.headers.get("x-forwarded-host")?.split(",")[0].trim()||req.headers.get("host")||new URL(req.url).host;
  if(!origin||new URL(origin).host!==host)return response({ok:false,error:"올바르지 않은 요청입니다."},403);
  const {email}=await req.json();
  const addr=String(email||"").trim().toLowerCase();
  if(!validEmail(addr))return response({ok:false,error:"이메일 형식을 확인해주세요."},400);
  const exists=await query("SELECT id FROM members WHERE email=$1 LIMIT 1",[addr]);
  if(!exists.rowCount)return response({ok:false,error:"등록되지 않은 이메일 주소입니다. 주소를 확인하거나 회원가입을 진행해주세요."},404);
  try{
   await newToken(addr,"reset",new URL(origin).origin);
   return response({ok:true,message:"비밀번호 재설정 메일을 발송했습니다. 받은편지함과 스팸함을 확인해주세요."});
  }catch(e){
   if((e as Error).message==="TOO_SOON")return response({ok:false,error:"최근에 재설정 메일을 발송했습니다. 90초 후 다시 시도하거나 기존 메일을 확인해주세요."},429);
   throw e;
  }
 }catch{
  return response({ok:false,error:"이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요."},503);
 }
}
