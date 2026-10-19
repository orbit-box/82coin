import {NextResponse} from "next/server";
export const dynamic="force-dynamic";
const codes=["BTC","ETH","XRP","SOL","DOGE"];
async function json(url:string){const c=new AbortController();const timeout=setTimeout(()=>c.abort(),6500);try{const r=await fetch(url,{signal:c.signal,cache:"no-store",headers:{"Accept":"application/json"}});if(!r.ok)throw Error("provider unavailable");return await r.json()}finally{clearTimeout(timeout)}}
type Upbit={market:string;trade_price:number;signed_change_rate:number};
type Binance={symbol:string;lastPrice:string};
export async function GET(){
 try{
 const [upResult,binResult,fxResult]=await Promise.allSettled([
 json("https://api.upbit.com/v1/ticker?markets="+codes.map(t=>"KRW-"+t).join("%2C")),
 json("https://api.binance.com/api/v3/ticker/24hr"),
 json("https://open.er-api.com/v6/latest/USD")
 ]);
 if(upResult.status!=="fulfilled"||!Array.isArray(upResult.value))throw Error("upbit unavailable");
 const overseas=new Map<string,number>();
 if(binResult.status==="fulfilled"&&Array.isArray(binResult.value)){for(const x of binResult.value as Binance[]){if(x.symbol.endsWith("USDT")){const token=x.symbol.slice(0,-4);if(codes.includes(token))overseas.set(token,Number(x.lastPrice))}}}
 const rate=fxResult.status==="fulfilled"?Number(fxResult.value?.rates?.KRW):NaN;
 const hasFX=Number.isFinite(rate)&&rate>0;
 const coins=(upResult.value as Upbit[]).map(x=>{const ticker=x.market.replace("KRW-","");const foreign=overseas.get(ticker)??null;const premium=(hasFX&&foreign&&foreign>0)?((x.trade_price/(foreign*rate))-1)*100:null;return {ticker,krwPrice:x.trade_price,change24h:x.signed_change_rate*100,usdtPrice:foreign,premium}});
 return NextResponse.json({coins,usdKrw:hasFX?rate:null,updatedAt:new Date().toISOString(),disclaimer:"김치프리미엄은 USDT/USD 가격 차이, 환율 갱신 시점, 거래소 간 시차 및 수수료를 반영하지 않은 참고용 추정치입니다.",partial:!hasFX||overseas.size===0},{headers:{"Cache-Control":"no-store"}})
 }catch{return NextResponse.json({error:"국내 시세 공급처에 연결할 수 없습니다.",coins:[],updatedAt:new Date().toISOString()},{status:503,headers:{"Cache-Control":"no-store"}})}
}
