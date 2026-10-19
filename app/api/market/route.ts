import {NextResponse} from "next/server";
export const dynamic="force-dynamic";
const codes=["BTC","ETH","XRP","SOL","DOGE"];
async function json(url:string){const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),6500);try{const r=await fetch(url,{signal:controller.signal,cache:"no-store",headers:{"Accept":"application/json"}});if(!r.ok)throw Error("HTTP "+r.status);return await r.json()}finally{clearTimeout(timeout)}}
type Quote={ticker:string;krwPrice:number;change24h:number};
type Upbit={market:string;trade_price:number;signed_change_rate:number};
type Binance={symbol:string;lastPrice:string};
const ids:{[key:string]:string}={BTC:"bitcoin",ETH:"ethereum",XRP:"ripple",SOL:"solana",DOGE:"dogecoin"};
export async function GET(){
const [up,bi,fx,foreign]=await Promise.allSettled([
  json("https://api.upbit.com/v1/ticker?markets="+codes.map(t=>"KRW-"+t).join("%2C")),
  json("https://api.bithumb.com/public/ticker/ALL_KRW"),
  json("https://open.er-api.com/v6/latest/USD"),
  json("https://api.binance.com/api/v3/ticker/price")
]);
let domestic:Quote[]=[];let domesticSource="";
if(up.status==="fulfilled"&&Array.isArray(up.value)){domestic=(up.value as Upbit[]).filter(x=>Number.isFinite(x.trade_price)&&x.trade_price>0).map(x=>({ticker:x.market.replace("KRW-",""),krwPrice:x.trade_price,change24h:x.signed_change_rate*100}));domesticSource="Upbit";}
if(!domestic.length&&bi.status==="fulfilled"&&bi.value?.status==="0000"){domestic=codes.map(t=>({ticker:t,krwPrice:Number(bi.value.data?.[t]?.closing_price),change24h:Number(bi.value.data?.[t]?.fluctate_rate_24H)})).filter(x=>Number.isFinite(x.krwPrice)&&x.krwPrice>0);domesticSource="Bithumb";}
const foreignPrices=new Map<string,number>();if(foreign.status==="fulfilled"&&Array.isArray(foreign.value))for(const x of foreign.value as Binance[]){const token=x.symbol.endsWith("USDT")?x.symbol.slice(0,-4):"";if(codes.includes(token))foreignPrices.set(token,Number(x.lastPrice));}
let currency=fx.status==="fulfilled"?Number(fx.value?.rates?.KRW):NaN;
let fallbackData:any=null;
if(!domestic.length){try{fallbackData=await json("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin%2Cethereum%2Cripple%2Csolana%2Cdogecoin&vs_currencies=krw%2Cusd&include_24hr_change=true");domestic=codes.map(t=>({ticker:t,krwPrice:Number(fallbackData?.[ids[t]]?.krw),change24h:Number(fallbackData?.[ids[t]]?.krw_24h_change||0)})).filter(x=>Number.isFinite(x.krwPrice)&&x.krwPrice>0);domesticSource="CoinGecko (글로벌 참고가격)";}catch(e){console.warn("[82coin market] all domestic price providers failed",e instanceof Error?e.message:"unknown")}}
if(!domestic.length)return NextResponse.json({coins:[],error:"모든 시세 공급처에 연결할 수 없습니다.",updatedAt:new Date().toISOString()},{status:503,headers:{"Cache-Control":"no-store"}});
const hasFX=Number.isFinite(currency)&&currency>0;
const coins=domestic.map(x=>{const overseas=foreignPrices.get(x.ticker)||null;const premium=domesticSource!=="CoinGecko (글로벌 참고가격)"&&hasFX&&overseas&&overseas>0?(x.krwPrice/(overseas*currency)-1)*100:null;return {...x,usdtPrice:overseas,premium}});
return NextResponse.json({coins,domesticSource,usdKrw:hasFX?currency:null,updatedAt:new Date().toISOString(),partial:!hasFX||!foreignPrices.size||domesticSource!=="Upbit",disclaimer:"김치프리미엄은 가격 공급처와 USD/KRW 환율의 수집 시차, USDT/USD 차이, 수수료가 반영되지 않은 참고용 추정치입니다."},{headers:{"Cache-Control":"no-store"}})
}
