import {NextRequest,NextResponse} from "next/server";
import {sessionId} from "@/lib/auth";
import {resetVirtualWallet} from "@/lib/paper";
export const dynamic="force-dynamic";
export async function POST(req:NextRequest){
 const origin=req.headers.get("origin");
 if(!origin||new URL(origin).origin!==req.nextUrl.origin)return NextResponse.json({error:"요청 출처를 확인할 수 없습니다."},{status:403});
 const member=await sessionId();if(!member)return NextResponse.json({error:"로그인이 필요합니다."},{status:401});
 try{
  const result=await resetVirtualWallet(member);
  return NextResponse.json(result,{headers:{"Cache-Control":"no-store"}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"초기화를 처리하지 못했습니다."},{status:422,headers:{"Cache-Control":"no-store"}})}
}
