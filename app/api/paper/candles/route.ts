import {NextRequest,NextResponse} from "next/server";
import {PAPER_SYMBOLS} from "@/lib/paper-quote";
export const dynamic="force-dynamic";
const intervals=["1m","5m","15m","1h","4h","1d"] as const;
export async function GET(req:NextRequest){
 const symbol=req.nextUrl.searchParams.get("symbol")||"BTCUSDT";
 const interval=req.nextUrl.searchParams.get("interval")||"15m";
 if(!PAPER_SYMBOLS.includes(symbol as typeof PAPER_SYMBOLS[number])||!intervals.includes(interval as typeof intervals[number]))return NextResponse.json({error:"지원하지 않는 종목 또는 차트 주기입니다."},{status:400});
 try{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),7000);
  let response:Response;
  try{response=await fetch("https://fapi.binance.com/fapi/v1/klines?symbol="+symbol+"&interval="+interval+"&limit=300",{cache:"no-store",signal:controller.signal})}finally{clearTimeout(timer)}
  if(!response.ok)throw Error("캔들 시세를 조회하지 못했습니다.");
  const raw=await response.json() as unknown[];
  if(!Array.isArray(raw))throw Error("시세 응답이 잘못되었습니다.");
  const candles=raw.map(row=>{const r=row as unknown[];return {time:Math.floor(Number(r[0])/1000),open:Number(r[1]),high:Number(r[2]),low:Number(r[3]),close:Number(r[4])}}).filter(x=>Object.values(x).every(Number.isFinite)&&x.high>=x.low&&x.open>0&&x.close>0);
  if(candles.length<20)throw Error("차트 데이터가 부족합니다.");
  return NextResponse.json({symbol,interval,candles,source:"Binance Futures public market data",updatedAt:new Date().toISOString()},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({error:"차트 시세를 불러오지 못했습니다."},{status:503,headers:{"Cache-Control":"no-store"}})}
}
