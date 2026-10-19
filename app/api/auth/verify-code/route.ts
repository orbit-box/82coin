import {NextResponse} from "next/server";
import {validateToken,validEmail,mailReady} from "@/lib/email-tokens";
export const dynamic="force-dynamic";
export async function POST(req:Request){
 try{
 if(!mailReady())return NextResponse.json({verified:false,message:"이메일 발송 설정이 완료되지 않았습니다."},{status:503});
 const origin=req.headers.get("origin");if(!origin||new URL(origin).origin!==new URL(req.url).origin)return NextResponse.json({verified:false,message:"요청 출처를 확인할 수 없습니다."},{status:403});
 const b=await req.json() as {email?:unknown;code?:unknown};
 const email=String(b.email||"").trim().toLowerCase(),code=String(b.code||"");
 if(!validEmail(email)||!/^[0-9]{6}$/.test(code))return NextResponse.json({verified:false,message:"이메일과 6자리 인증번호를 확인하세요."},{status:400});
 const verified=await validateToken(email,"verify",code,false);
 return NextResponse.json({verified,message:verified?"이메일 인증번호가 확인됐습니다.":"인증번호가 올바르지 않거나 만료됐습니다."},{status:verified?200:400,headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({verified:false,message:"인증 처리 중 오류가 발생했습니다."},{status:503})}
}
