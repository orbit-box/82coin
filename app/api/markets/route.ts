import {NextResponse} from "next/server";
export const dynamic="force-dynamic";
type Market={market:string;korean_name:string;english_name:string};
type Ticker={market:string;trade_price:number;signed_change_rate:number;acc_trade_price_24h:number;acc_trade_volume_24h:number};
let cached:{at:number;items:unknown[]}|null=null;
async function getJSON<T>(url:string):Promise<T>{const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),8500);try{const response=await fetch(url,{signal:controller.signal,headers:{"Accept":"application/json"},cache:"no-store"});if(!response.ok)throw Error("Upbit "+response.status);return await response.json() as T}finally{clearTimeout(timer)}}
export async function GET(){
 try{
 if(cached&&Date.now()-cached.at<25000)return NextResponse.json({coins:cached.items,source:"Upbit KRW",updatedAt:new Date(cached.at).toISOString(),cached:true},{headers:{"Cache-Control":"public, s-maxage=20, stale-while-revalidate=10"}});
 const markets=(await getJSON<Market[]>("https://api.upbit.com/v1/market/all?isDetails=false")).filter(m=>m.market.startsWith("KRW-"));
 if(!markets.length)throw Error("No KRW markets");
 const batches:Market[][]=[];for(let i=0;i<markets.length;i+=80)batches.push(markets.slice(i,i+80));
 const replies=await Promise.all(batches.map(async batch=>{const query=batch.map(m=>m.market).join(",");return getJSON<Ticker[]>("https://api.upbit.com/v1/ticker?markets="+encodeURIComponent(query))}));
 const names=new Map(markets.map(m=>[m.market,m]));
 const coins=replies.flat().filter(t=>Number.isFinite(t.trade_price)&&t.trade_price>0).map(t=>({ticker:t.market.slice(4),market:t.market,name:names.get(t.market)?.korean_name||t.market.slice(4),englishName:names.get(t.market)?.english_name||"",krwPrice:t.trade_price,change24h:t.signed_change_rate*100,volume24hKrw:t.acc_trade_price_24h,quantity24h:t.acc_trade_volume_24h})).sort((a,b)=>b.volume24hKrw-a.volume24hKrw);
 if(!coins.length)throw Error("No quotes");
 cached={at:Date.now(),items:coins};
 return NextResponse.json({coins,source:"Upbit KRW",updatedAt:new Date(cached.at).toISOString()},{headers:{"Cache-Control":"public, s-maxage=20, stale-while-revalidate=10"}})
 }catch(e){if(cached)return NextResponse.json({coins:cached.items,source:"Upbit KRW",updatedAt:new Date(cached.at).toISOString(),stale:true});return NextResponse.json({coins:[],error:"전체 코인 시세를 불러오지 못했습니다.",source:"Upbit KRW"},{status:503})}
}
