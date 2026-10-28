import {NextResponse} from "next/server";
export const dynamic="force-dynamic";
// Never merge derivatives metrics from different venues into a synthetic row.
const symbols=["BTCUSDT","ETHUSDT","SOLUSDT"] as const;
async function read<T>(url:string):Promise<T>{
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),5500);
 try{const r=await fetch(url,{cache:"no-store",signal:controller.signal,headers:{Accept:"application/json"}});if(!r.ok)throw Error("HTTP "+r.status);return await r.json() as T}finally{clearTimeout(timeout)}
}
type Premium={symbol:string;lastFundingRate:string;markPrice:string;time:number};
type Ratio={symbol:string;longAccount:string;shortAccount:string;timestamp:number};
type Interest={symbol:string;openInterest:string;time:number};
const positive=(value:unknown)=>{const n=Number(value);return value!==null&&value!==undefined&&value!==""&&Number.isFinite(n)&&n>0?n:null};
const recent=(value:number,maxAge:number)=>Number.isFinite(value)&&value>0&&Date.now()>=value-60000&&Date.now()-value<=maxAge;
async function one(symbol:typeof symbols[number]){
 const b="https://fapi.binance.com";
 const [p,l,o]=await Promise.allSettled([
 read<Premium>(b+"/fapi/v1/premiumIndex?symbol="+symbol),
 read<Ratio[]>(b+"/futures/data/globalLongShortAccountRatio?symbol="+symbol+"&period=5m&limit=1"),
 read<Interest>(b+"/fapi/v1/openInterest?symbol="+symbol)
 ]);
 const premium=p.status==="fulfilled"&&p.value.symbol===symbol&&recent(p.value.time,120000)?p.value:null;
 const ratio=l.status==="fulfilled"&&Array.isArray(l.value)&&l.value[0]?.symbol===symbol&&recent(l.value[0].timestamp,12*60000)?l.value[0]:null;
 const oi=o.status==="fulfilled"&&o.value.symbol===symbol&&recent(o.value.time,120000)?o.value:null;
 const funding=premium?Number(premium.lastFundingRate):NaN;
 const long=ratio?Number(ratio.longAccount):NaN,short=ratio?Number(ratio.shortAccount):NaN;
 const usableRatio=Number.isFinite(long)&&Number.isFinite(short)&&long>=0&&short>=0&&Math.abs(long+short-1)<0.02;
 return {symbol:symbol.replace("USDT",""),
   fundingPercent:Number.isFinite(funding)&&Math.abs(funding)<=0.05?funding*100:null,
   markPrice:premium?positive(premium.markPrice):null,
   longPct:usableRatio?long*100:null,shortPct:usableRatio?short*100:null,
   openInterest:oi?positive(oi.openInterest):null,
   source:"Binance USDⓈ-M Futures",
   metricSources:{funding:premium?"Binance":null,longShort:usableRatio?"Binance":null,openInterest:oi?"Binance":null},
   timestamps:{funding:premium?new Date(premium.time).toISOString():null,longShort:usableRatio?new Date(ratio!.timestamp).toISOString():null,openInterest:oi?new Date(oi.time).toISOString():null}
 };
}
export async function GET(){
 const items=await Promise.all(symbols.map(one));
 return NextResponse.json({items,
  availability:{longShort:items.filter(x=>x.longPct!==null).length,funding:items.filter(x=>x.fundingPercent!==null).length,openInterest:items.filter(x=>x.openInterest!==null).length},
  source:"Binance USDⓈ-M Futures (single venue, no cross-exchange substitution)",
  updatedAt:new Date().toISOString(),
  definitions:{longshort:"5분 글로벌 계정 기준 롱·숏 비율 (포지션 규모 비율 아님)",openInterest:"미결제약정 기초자산 수량 (USD 금액 아님)",funding:"최근 공개된 펀딩 비율"},
  liquidations:{available:false,reason:"검증된 전체 시장 청산 합계 데이터 미연동"}
 },{headers:{"Cache-Control":"no-store"}});
}
