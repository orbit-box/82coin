import {NextResponse} from "next/server";
export const dynamic="force-dynamic";
type Market={market:string;korean_name:string;english_name:string};
type Ticker={market:string;trade_price:number;signed_change_rate:number;acc_trade_price_24h:number;acc_trade_volume_24h:number};
type Entry={ticker:string;market:string;name:string;englishName:string;krwPrice:number;change24h:number;volume24hKrw:number;quantity24h:number;premium:number|null;foreignPrice:number|null};
type Snapshot={at:number;coins:Entry[];fx:number|null;source:string;foreignSource:string;coverage:number};
let cached:Snapshot|null=null;
const coinIds:Record<string,string>={BTC:"bitcoin",ETH:"ethereum",XRP:"ripple",SOL:"solana",DOGE:"dogecoin",ADA:"cardano",AVAX:"avalanche-2",DOT:"polkadot",LINK:"chainlink",TRX:"tron",BNB:"binancecoin",USDT:"tether",USDC:"usd-coin",SUI:"sui",APT:"aptos",NEAR:"near",ATOM:"cosmos",BCH:"bitcoin-cash",LTC:"litecoin",ETC:"ethereum-classic",XLM:"stellar",HBAR:"hedera-hashgraph",FIL:"filecoin",ARB:"arbitrum",OP:"optimism",UNI:"uniswap",AAVE:"aave",SHIB:"shiba-inu",PEPE:"pepe",INJ:"injective-protocol",TIA:"celestia",SEI:"sei-network",TON:"the-open-network",ALGO:"algorand",STX:"blockstack",VET:"vechain",ICP:"internet-computer",SAND:"the-sandbox",MANA:"decentraland",GRT:"the-graph",IMX:"immutable-x",WLD:"worldcoin-wld",JUP:"jupiter-exchange-solana",RENDER:"render-token",FET:"fetch-ai",BONK:"bonk",WIF:"dogwifcoin",FLOKI:"floki",JASMY:"jasmycoin",GALA:"gala",ZEC:"zcash",XTZ:"tezos",EOS:"eos",KAVA:"kava",RAY:"raydium",PENDLE:"pendle",ENS:"ethereum-name-service",CRV:"curve-dao-token",COMP:"compound-governance-token",MKR:"maker",LDO:"lido-dao",PYTH:"pyth-network",THETA:"theta-token",FLOW:"flow",CHZ:"chiliz",CAKE:"pancakeswap-token",MASK:"mask-network",AXS:"axie-infinity",SUSHI:"sushi",1INCH:"1inch",ZRX:"0x",BAT:"basic-attention-token"};
async function json<T>(url:string,timeout=7000):Promise<T>{const c=new AbortController();const t=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(url,{signal:c.signal,cache:"no-store",headers:{Accept:"application/json"}});if(!r.ok)throw Error("HTTP "+r.status+" "+new URL(url).hostname);return await r.json() as T}finally{clearTimeout(t)}}
const valid=(v:number)=>Number.isFinite(v)&&v>0;
async function foreignQuotes(){const endpoints=["https://api.binance.com/api/v3/ticker/price","https://data-api.binance.vision/api/v3/ticker/price","https://api1.binance.com/api/v3/ticker/price"];
 for(const url of endpoints){try{const quotes=await json<{symbol:string;price:string}[]>(url,3200);const p=new Map<string,number>();for(const q of quotes){if(q.symbol.endsWith("USDT")){const n=Number(q.price);if(valid(n))p.set(q.symbol.slice(0,-4),n)}}if(p.size>5)return {prices:p,source:new URL(url).hostname}}catch{}}
 return {prices:new Map<string,number>(),source:"unavailable"};
}
async function usdFallback(){const ids=[...new Set(Object.values(coinIds))].join(",");try{const result=await json<Record<string,{usd?:number}>>("https://api.coingecko.com/api/v3/simple/price?ids="+encodeURIComponent(ids)+"&vs_currencies=usd",7000);const prices=new Map<string,number>();for(const [symbol,id] of Object.entries(coinIds)){const value=Number(result[id]?.usd);if(valid(value))prices.set(symbol,value)}return prices}catch{return new Map<string,number>()}}
async function fxRate(){const queries=[()=>json<{rates?:{KRW?:number}}>("https://open.er-api.com/v6/latest/USD",5000).then(x=>Number(x.rates?.KRW)),()=>json<{data?:{rates?:{KRW?:string}}}>("https://api.coinbase.com/v2/exchange-rates?currency=USD",5000).then(x=>Number(x.data?.rates?.KRW))];for(const run of queries){try{const n=await run();if(valid(n))return n}catch{}}return null}
const respond=(snap:Snapshot,stale=false)=>NextResponse.json({coins:snap.coins,source:snap.source,updatedAt:new Date(snap.at).toISOString(),usdKrw:snap.fx,foreignSource:snap.foreignSource,premiumCoverage:snap.coverage,stale},{headers:{"Cache-Control":"public, s-maxage=15, stale-while-revalidate=10"}});
export async function GET(){try{
 if(cached&&Date.now()-cached.at<25000)return respond(cached);
 const [markets,foreign,fx]=await Promise.all([json<Market[]>("https://api.upbit.com/v1/market/all?isDetails=false"),foreignQuotes(),fxRate()]);
 const krw=markets.filter(x=>x.market.startsWith("KRW-"));if(!krw.length)throw Error("No KRW markets");
 const batches:Market[][]=[];for(let i=0;i<krw.length;i+=80)batches.push(krw.slice(i,i+80));
 const replies=await Promise.all(batches.map(batch=>json<Ticker[]>("https://api.upbit.com/v1/ticker?markets="+encodeURIComponent(batch.map(m=>m.market).join(",")))));
 const overseas=foreign.prices;let foreignSource=foreign.source;
 if(overseas.size<30){const fallback=await usdFallback();for(const [symbol,price] of fallback)if(!overseas.has(symbol))overseas.set(symbol,price);if(fallback.size)foreignSource=foreign.source==="unavailable"?"CoinGecko USD":"Binance USDT + CoinGecko USD"}
 const names=new Map(krw.map(m=>[m.market,m]));
 const coins:Entry[]=replies.flat().filter(t=>valid(t.trade_price)).map(t=>{const ticker=t.market.slice(4),foreignPrice=overseas.get(ticker)??null;return {ticker,market:t.market,name:names.get(t.market)?.korean_name||ticker,englishName:names.get(t.market)?.english_name||"",krwPrice:t.trade_price,change24h:t.signed_change_rate*100,volume24hKrw:t.acc_trade_price_24h,quantity24h:t.acc_trade_volume_24h,premium:fx&&foreignPrice?(t.trade_price/(foreignPrice*fx)-1)*100:null,foreignPrice}}).sort((a,b)=>b.volume24hKrw-a.volume24hKrw);
 if(!coins.length)throw Error("No prices");
 cached={at:Date.now(),coins,fx,source:"Upbit KRW",foreignSource,coverage:coins.filter(x=>x.premium!==null).length};return respond(cached);
 }catch(e){console.warn("82coin markets data error",e instanceof Error?e.message:"unknown");if(cached)return respond(cached,true);return NextResponse.json({coins:[],error:"전체 코인 시세를 불러오지 못했습니다."},{status:503})}}
