import {NextResponse} from "next/server";
export const dynamic="force-dynamic";
const codes=["BTC","ETH","XRP","SOL","DOGE"] as const;
type Ticker={market:string;trade_price:number;signed_change_rate:number;timestamp:number};
type Binance={symbol:string;lastPrice:string};
async function json<T>(url:string):Promise<T>{
 const c=new AbortController(),timer=setTimeout(()=>c.abort(),6500);
 try{const r=await fetch(url,{signal:c.signal,cache:"no-store",headers:{Accept:"application/json"}});if(!r.ok)throw Error("HTTP "+r.status+" "+new URL(url).hostname);return await r.json() as T}finally{clearTimeout(timer)}
}
export async function GET(){
 try{
  const [domestic,foreign,fx]=await Promise.allSettled([
   json<Ticker[]>("https://api.upbit.com/v1/ticker?markets="+codes.map(t=>"KRW-"+t).join("%2C")),
   json<Binance[]>("https://api.binance.com/api/v3/ticker/price"),
   json<{rates?:{KRW?:number};time_last_update_unix?:number}>("https://open.er-api.com/v6/latest/USD")
  ]);
  if(domestic.status!=="fulfilled"||!Array.isArray(domestic.value))throw Error("Upbit ticker unavailable");
  const now=Date.now(),fxTime=fx.status==="fulfilled"?Number(fx.value.time_last_update_unix)*1000:NaN;
  const rate=fx.status==="fulfilled"?Number(fx.value.rates?.KRW):NaN;
  const fxReady=Number.isFinite(rate)&&rate>0&&Number.isFinite(fxTime)&&fxTime>0&&now-fxTime<48*3600000&&now>=fxTime-60000;
  const overseas=new Map<string,number>();
  if(foreign.status==="fulfilled"&&Array.isArray(foreign.value)){
   for(const q of foreign.value){const coin=q.symbol.endsWith("USDT")?q.symbol.slice(0,-4):"";const price=Number(q.lastPrice);if(codes.includes(coin as typeof codes[number])&&Number.isFinite(price)&&price>0)overseas.set(coin,price)}
  }
  const coins=domestic.value.filter(x=>codes.some(t=>x.market==="KRW-"+t)&&Number.isFinite(x.trade_price)&&x.trade_price>0&&Number.isFinite(x.signed_change_rate)&&Number.isFinite(x.timestamp)&&now-x.timestamp<120000&&now>=x.timestamp-60000).map(x=>{
   const ticker=x.market.slice(4),usdtPrice=overseas.get(ticker)??null;
   return {ticker,krwPrice:x.trade_price,change24h:x.signed_change_rate*100,usdtPrice,premium:fxReady&&usdtPrice!==null?(x.trade_price/(usdtPrice*rate)-1)*100:null,sourceUpdatedAt:new Date(x.timestamp).toISOString()};
  });
  if(!coins.length)throw Error("No fresh Upbit prices");
  return NextResponse.json({coins,domesticSource:"Upbit",foreignSource:foreign.status==="fulfilled"?"Binance Spot":"unavailable",usdKrw:fxReady?rate:null,fxUpdatedAt:fxReady?new Date(fxTime).toISOString():null,updatedAt:new Date().toISOString(),partial:coins.length<codes.length||!fxReady||overseas.size<codes.length,disclaimer:"국내 Upbit 원화, 해외 Binance 현물 USDT 가격입니다. 환율·시세 수집 시차 및 USDT/USD 차이·수수료를 반영하지 않은 참고용 김프 추정치입니다."},{headers:{"Cache-Control":"no-store"}});
 }catch(e){console.warn("[market]",e instanceof Error?e.message:"unknown");return NextResponse.json({coins:[],error:"현재 검증 가능한 시세를 가져오지 못했습니다."},{status:503,headers:{"Cache-Control":"no-store"}})}
}
