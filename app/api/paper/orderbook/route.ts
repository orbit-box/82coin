import {NextRequest,NextResponse} from "next/server";
import {PAPER_SYMBOLS} from "@/lib/paper-quote";
export const dynamic="force-dynamic";
type Raw={retCode:number;time:number;result?:{s:string;a:string[][];b:string[][];ts:number}};
export async function GET(req:NextRequest){
 const symbol=req.nextUrl.searchParams.get("symbol")||"BTCUSDT";
 if(!PAPER_SYMBOLS.includes(symbol as typeof PAPER_SYMBOLS[number]))return NextResponse.json({error:"종목을 확인해 주세요."},{status:400});
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
 try{
  const response=await fetch("https://api.bybit.com/v5/market/orderbook?category=linear&symbol="+symbol+"&limit=25",{signal:controller.signal,cache:"no-store"});
  if(!response.ok)throw Error("source unavailable");
  const data=await response.json() as Raw;const snapshot=data.result;
  const stamp=Number(snapshot?.ts||data.time);
  if(data.retCode!==0||snapshot?.s!==symbol||!Number.isFinite(stamp)||Date.now()-stamp>10000||stamp>Date.now()+60000)throw Error("stale orderbook");
  const parse=(rows:string[][]|undefined)=>Array.isArray(rows)?rows.map(x=>[Number(x[0]),Number(x[1])]).filter(x=>x.length===2&&x.every(v=>Number.isFinite(v)&&v>0)).slice(0,12):[];
  const asks=parse(snapshot.a),bids=parse(snapshot.b);
  if(!asks.length||!bids.length)throw Error("empty orderbook");
  return NextResponse.json({symbol,asks,bids,asOf:new Date(stamp).toISOString(),source:"Bybit linear futures"},{headers:{"Cache-Control":"public, s-maxage=2, stale-while-revalidate=2"}});
 }catch{return NextResponse.json({error:"호가 정보를 확인할 수 없습니다."},{status:503,headers:{"Cache-Control":"no-store"}})}finally{clearTimeout(timer)}
}
