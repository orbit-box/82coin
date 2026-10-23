import {NextRequest,NextResponse} from "next/server";
import {PAPER_SYMBOLS} from "@/lib/paper-quote";
export const dynamic="force-dynamic";
const intervals=["1m","5m","15m","1h","4h","1d"] as const;
type Candle={time:number;open:number;high:number;low:number;close:number};
async function getJson(url:string){
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),6000);
 try{const r=await fetch(url,{signal:ctl.signal,cache:"no-store"});if(!r.ok)throw Error("market HTTP "+r.status);return await r.json() as unknown}finally{clearTimeout(timer)}
}
function parseRows(data:unknown,reverse=false):Candle[]{
 if(!Array.isArray(data))throw Error("invalid candle result");
 const rows=data.map(x=>{if(!Array.isArray(x))return null;const [t,o,h,l,c]=x;return {time:Math.floor(Number(t)/1000),open:Number(o),high:Number(h),low:Number(l),close:Number(c)};})
 .filter((x):x is Candle=>!!x&&Number.isFinite(x.time)&&x.time>0&&[x.open,x.high,x.low,x.close].every(n=>Number.isFinite(n)&&n>0)&&x.high>=Math.max(x.open,x.close,x.low)&&x.low<=Math.min(x.open,x.close,x.high));
 const unique=new Map(rows.map(c=>[c.time,c]));
 return [...unique.values()].sort((a,b)=>a.time-b.time);
}
export async function GET(req:NextRequest){
 const symbol=req.nextUrl.searchParams.get("symbol")||"BTCUSDT",interval=req.nextUrl.searchParams.get("interval")||"15m";
 if(!PAPER_SYMBOLS.includes(symbol as typeof PAPER_SYMBOLS[number])||!intervals.includes(interval as typeof intervals[number]))return NextResponse.json({error:"지원하지 않는 종목 또는 차트 주기입니다."},{status:400});
 const sources=[
  {label:"Binance USDⓈ-M 선물",url:"https://fapi.binance.com/fapi/v1/klines?symbol="+symbol+"&interval="+interval+"&limit=300",parse:(j:unknown)=>parseRows(j)},
  {label:"Bybit USDT 무기한 선물",url:"https://api.bybit.com/v5/market/kline?category=linear&symbol="+symbol+"&interval="+({ "1m":"1","5m":"5","15m":"15","1h":"60","4h":"240","1d":"D"} as Record<string,string>)[interval]+"&limit=300",parse:(j:unknown)=>{const v=j as {retCode?:number;result?:{list?:unknown}};if(v.retCode!==0)throw Error("Bybit response error");return parseRows(v.result?.list);}},
  {label:"Binance 현물 (선물 시세 대체 참고용)",url:"https://data-api.binance.vision/api/v3/klines?symbol="+symbol+"&interval="+interval+"&limit=300",parse:(j:unknown)=>parseRows(j)}
 ];
 for(const source of sources){
  try{const candles=source.parse(await getJson(source.url));if(candles.length<20)continue;
   return NextResponse.json({symbol,interval,candles,source:source.label,isSpotFallback:source.label.includes("현물"),updatedAt:new Date().toISOString()},{headers:{"Cache-Control":"no-store"}});
  }catch(e){console.warn("paper candles source unavailable",source.label,e instanceof Error?e.message:"unknown")}
 }
 return NextResponse.json({error:"현재 차트 시세를 불러올 수 없습니다. 거래소 연결을 확인해 주세요."},{status:503,headers:{"Cache-Control":"no-store"}});
}
