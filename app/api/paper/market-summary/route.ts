import {NextRequest,NextResponse} from "next/server";
import {PAPER_SYMBOLS} from "@/lib/paper-quote";
export const dynamic="force-dynamic";
type Ticker={symbol:string;lastPrice:string;price24hPcnt:string;turnover24h:string;fundingRate:string;openInterest:string;markPrice:string};
export async function GET(req:NextRequest){
 const symbol=req.nextUrl.searchParams.get("symbol")||"BTCUSDT";
 if(!PAPER_SYMBOLS.includes(symbol as typeof PAPER_SYMBOLS[number]))return NextResponse.json({error:"지원하지 않는 종목입니다."},{status:400});
 try{
  const c=new AbortController(),t=setTimeout(()=>c.abort(),6500);let response:Response;
  try{response=await fetch("https://api.bybit.com/v5/market/tickers?category=linear&symbol="+encodeURIComponent(symbol),{signal:c.signal,cache:"no-store"})}finally{clearTimeout(t)}
  if(!response.ok)throw Error("market unavailable");
  const result=await response.json() as {retCode?:number;time?:number;result?:{list?:Ticker[]}};
  const tick=result.result?.list?.find(x=>x.symbol===symbol);
  const stamp=Number(result.time),now=Date.now();
  if(result.retCode!==0||!tick||!Number.isFinite(stamp)||stamp>now+60000||now-stamp>120000)throw Error("market stale");
  const positive=(value:string)=>{const v=Number(value);return Number.isFinite(v)&&v>0?v:null};
  const signed=(value:string)=>{const v=Number(value);return value!==""&&Number.isFinite(v)?v:null};
  return NextResponse.json({symbol,price:positive(tick.lastPrice),change24hPct:signed(tick.price24hPcnt)!==null?Number(tick.price24hPcnt)*100:null,turnover24hUsdt:positive(tick.turnover24h),fundingRatePct:signed(tick.fundingRate)!==null?Number(tick.fundingRate)*100:null,openInterestBase:positive(tick.openInterest),asOf:new Date(stamp).toISOString(),source:"Bybit USDT 무기한 선물",note:"거래량은 24시간 USDT 거래대금, OI는 기초자산 수량입니다."},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({error:"선물 시장정보를 확인할 수 없습니다."},{status:503,headers:{"Cache-Control":"no-store"}})}
}
