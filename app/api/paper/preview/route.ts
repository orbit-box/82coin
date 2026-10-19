import {NextRequest,NextResponse} from "next/server";
import {sessionId} from "@/lib/auth";
import {accountSnapshot} from "@/lib/paper";
import {fetchPaperQuote,PAPER_SYMBOLS,previewPaperOrder} from "@/lib/paper-quote";
export const dynamic="force-dynamic";
export async function POST(req:NextRequest){
 try{
 const origin=req.headers.get("origin");
 if(!origin||new URL(origin).origin!==req.nextUrl.origin)return NextResponse.json({error:"요청 출처를 확인할 수 없습니다."},{status:403});
 const member=await sessionId();if(!member)return NextResponse.json({error:"로그인이 필요합니다."},{status:401});
 const body=await req.json() as Record<string,unknown>;
 if(!body||typeof body.symbol!=="string"||!PAPER_SYMBOLS.includes(body.symbol as typeof PAPER_SYMBOLS[number])||
 (body.side!=="LONG"&&body.side!=="SHORT")||typeof body.marginKrw!=="number"||typeof body.leverage!=="number")
 return NextResponse.json({error:"주문 정보를 확인해 주세요."},{status:400});
 const account=await accountSnapshot(member);
 if(account.openPositions)return NextResponse.json({error:"열린 포지션 정산을 먼저 완료해야 합니다."},{status:409});
 const quote=await fetchPaperQuote(body.symbol);
 const preview=previewPaperOrder({symbol:body.symbol as typeof PAPER_SYMBOLS[number],side:body.side,marginKrw:body.marginKrw,leverage:body.leverage},quote,account.balance);
 return NextResponse.json({preview,warning:"계산 전용 미리보기입니다. 가상 주문을 제출하거나 자금을 차감하지 않습니다."},{headers:{"Cache-Control":"no-store"}});
 }catch(e){const message=e instanceof Error?e.message:"미리보기를 계산할 수 없습니다.";return NextResponse.json({error:message},{status:422,headers:{"Cache-Control":"no-store"}})}
}
