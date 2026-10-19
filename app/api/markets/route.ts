import {NextResponse} from "next/server";
export const dynamic="force-dynamic";
type Market={market:string;korean_name:string;english_name:string};
type Ticker={market:string;trade_price:number;signed_change_rate:number;acc_trade_price_24h:number;acc_trade_volume_24h:number};
let cached:{at:number;items:unknown[];fx:number|null}|null=null;
async function getJSON<T>(url:string):Promise<T>{const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8500);try{const response=await fetch(url,{signal:controller.signal,headers:{"Accept":"application/json"},cache:"no-store"});if(!response.ok)throw Error("Upbit "+response.status);return await response.json() as T}finally{clearTimeout(timer)}}
export async function GET(){
 try{
 if(cached&&Date.now()-cached.at<25000)return NextResponse.json({coins:cached.items,source:"Upbit KRW",updatedAt:new Date(cached.at).toISOString(),cached:true,usdKrw:cached.fx},{headers:{"Cache-Control":"public, s-maxage=20, stale-while-revalidate=10"}});
 const [allMarkets,foreignResult,fxResult]=await Promise.allSettled([getJSON<Market[]>("https://api.upbit.com/v1/market/all?isDetails=false"),getJSON<Array<{symbol:string;price:string}>>("https://api.binance.com/api/v3/ticker/price"),getJSON<{rates?:{KRW?:number}}>("https://open.er-api.com/v6/latest/USD")]);
 if(allMarkets.status!=="fulfilled")throw Error("Market list unavailable");
 const markets=allMarkets.value.filter(m=>m.market.startsWith("KRW-"));
 if(!markets.length)throw Error("No KRW markets");
 const batches:Market[][]=[];for(let i=0;i<markets.length;i+=80)batches.push(markets.slice(i,i+80));
 const replies=await Promise.all(batches.map(async batch=>{const query=batch.map(m=>m.market).join(",");return getJSON<Ticker[]>("https://api.upbit.com/v1/ticker?markets="+encodeURIComponent(query))}));
 const names=new Map(markets.map(m=>[m.market,m]));
 const prices=new Map<string,number>();if(foreignResult.status==="fulfilled"&&Array.isArray(foreignResult.value)){for(const p of foreignResult.value){if(p.symbol.endsWith("USDT")){const n=Number(p.price);if(Number.isFinite(n)&&n>0)prices.set(p.symbol.slice(0,-4),n)}}}
 const fx=fxResult.status==="fulfilled"?Number(fxResult.value.rates?.KRW):NaN;
 const rate=Number.isFinite(fx)&&fx>0?fx:null;
 const coins=replies.flat().filter(t=>Number.isFinite(t.trade_price)&&t.trade_price>0).map(t=>({ticker:t.market.slice(4),market:t.market,name:names.get(t.market)?.korean_name||t.market.slice(4),englishName:names.get(t.market)?.english_name||"",krwPrice:t.trade_price,change24h:t.signed_change_rate*100,volume24hKrw:t.acc_trade_price_24h,quantity24h:t.acc_trade_volume_24h,premium:rate&&prices.has(t.market.slice(4))?(t.trade_price/(prices.get(t.market.slice(4))!*rate)-1)*100:null})).sort((a,b)=>b.volume24hKrw-a.volume24hKrw);
 if(!coins.length)throw Error("No quotes");
 cached={at:Date.now(),items:coins,fx:rate};
 return NextResponse.json({coins,source:"Upbit KRW",updatedAt:new Date(cached.at).toISOString(),usdKrw:rate},{headers:{"Cache-Control":"public, s-maxage=20, stale-while-revalidate=10"}})
 }catch(e){if(cached)return NextResponse.json({coins:cached.items,source:"Upbit KRW",updatedAt:new Date(cached.at).toISOString(),stale:true,usdKrw:cached.fx});return NextResponse.json({coins:[],error:"전체 코인 시세를 불러오지 못했습니다.",source:"Upbit KRW"},{status:503})}
}
