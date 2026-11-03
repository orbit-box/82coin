import {NextRequest,NextResponse} from "next/server";
import {sessionId} from "@/lib/auth";
import {closePaperPosition,openPaperPosition} from "@/lib/paper-engine";
export const dynamic="force-dynamic";
export async function POST(req:NextRequest){
 try{
  const origin=req.headers.get("origin");
  if(!origin||new URL(origin).origin!==req.nextUrl.origin)return NextResponse.json({error:"요청 출처를 확인할 수 없습니다."},{status:403});
  const member=await sessionId();if(!member)return NextResponse.json({error:"로그인 후 이용할 수 있습니다."},{status:401});
  const body=await req.json() as Record<string,unknown>;
  let result:unknown;
  if(body.action==="OPEN"){
   if(typeof body.symbol!=="string"||!(body.side==="LONG"||body.side==="SHORT")||typeof body.marginKrw!=="number"||typeof body.leverage!=="number"||typeof body.requestId!=="string")return NextResponse.json({error:"주문 값을 확인해 주세요."},{status:400});
   result=await openPaperPosition(member,{symbol:body.symbol,side:body.side,marginKrw:body.marginKrw,leverage:body.leverage,requestId:body.requestId});
  }else if(body.action==="CLOSE"){
   if(typeof body.positionId!=="number"||typeof body.requestId!=="string")return NextResponse.json({error:"청산 요청을 확인해 주세요."},{status:400});
   result=await closePaperPosition(member,{positionId:body.positionId,requestId:body.requestId});
  }else return NextResponse.json({error:"지원하지 않는 주문입니다."},{status:400});
  return NextResponse.json(result,{headers:{"Cache-Control":"no-store"}});
 }catch(e){console.warn("paper action rejected",e instanceof Error?e.message:"unknown");return NextResponse.json({error:e instanceof Error?e.message:"가상 주문을 처리하지 못했습니다."},{status:422,headers:{"Cache-Control":"no-store"}})}
}
