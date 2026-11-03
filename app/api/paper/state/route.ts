import {NextResponse} from "next/server";
import {sessionId} from "@/lib/auth";
import {paperTerminalState} from "@/lib/paper-engine";
export const dynamic="force-dynamic";
export async function GET(){
 const member=await sessionId();if(!member)return NextResponse.json({error:"로그인이 필요합니다."},{status:401});
 try{return NextResponse.json(await paperTerminalState(member),{headers:{"Cache-Control":"no-store"}})}
 catch(e){console.error("paper state",e instanceof Error?e.message:"unknown");return NextResponse.json({error:"거래 정보를 불러오지 못했습니다."},{status:503})}
}
