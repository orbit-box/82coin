import {PAPER_MAX_LEVERAGE,PAPER_MAX_MARGIN_FRACTION,PAPER_TAKER_FEE_RATE,paperQuantity} from "@/lib/paper-math";
export const PAPER_SYMBOLS=["BTCUSDT","ETHUSDT","SOLUSDT","XRPUSDT","DOGEUSDT"] as const;
export type PaperSymbol=typeof PAPER_SYMBOLS[number];
export type PaperQuote={symbol:PaperSymbol;markUsdt:number;usdKrw:number;asOf:string;fetchedAt:string;source:string;stale:boolean};
const MAX_MARK_AGE=15_000;
const MAX_FX_AGE=10*60_000;
async function json<T>(url:string){const c=new AbortController();const timeout=setTimeout(()=>c.abort(),4500);try{const res=await fetch(url,{cache:"no-store",signal:c.signal});if(!res.ok)throw Error("Quote HTTP "+res.status);return await res.json() as T}finally{clearTimeout(timeout)}}
export async function fetchPaperQuote(symbol:string):Promise<PaperQuote>{
 if(!PAPER_SYMBOLS.includes(symbol as PaperSymbol))throw Error("지원하지 않는 거래 종목입니다.");
 const [mark,fx]=await Promise.all([
 json<{symbol:string;markPrice:string;time:number}>("https://fapi.binance.com/fapi/v1/premiumIndex?symbol="+encodeURIComponent(symbol)),
 json<{time_last_update_unix?:number;rates?:{KRW?:number}}>("https://open.er-api.com/v6/latest/USD")
 ]);
 const price=Number(mark.markPrice),usdKrw=Number(fx.rates?.KRW),now=Date.now();
 if(mark.symbol!==symbol||!Number.isFinite(price)||price<=0||!Number.isFinite(usdKrw)||usdKrw<=0)throw Error("시세 검증 실패");
 const quoteAge=now-Number(mark.time),fxAge=now-Number(fx.time_last_update_unix)*1000;
 const stale=!Number.isFinite(quoteAge)||quoteAge<0||quoteAge>MAX_MARK_AGE||!Number.isFinite(fxAge)||fxAge<0||fxAge>MAX_FX_AGE;
 return {symbol:symbol as PaperSymbol,markUsdt:price,usdKrw,asOf:new Date(mark.time).toISOString(),fetchedAt:new Date(now).toISOString(),source:"Binance Futures mark · open.er-api USD/KRW",stale};
}
export function previewPaperOrder(input:{side:"LONG"|"SHORT";symbol:PaperSymbol;marginKrw:number;leverage:number},quote:PaperQuote,equityKrw:number){
 if(input.side!=="LONG"&&input.side!=="SHORT")throw Error("포지션 방향이 올바르지 않습니다.");
 if(quote.stale)throw Error("시세 또는 환율이 지연되어 계산할 수 없습니다.");
 if(input.symbol!==quote.symbol)throw Error("시세와 종목 불일치");
 if(!Number.isFinite(equityKrw)||equityKrw<=0)throw Error("잔고가 부족합니다.");
 if(!Number.isFinite(input.marginKrw)||input.marginKrw<10000||input.marginKrw>equityKrw*PAPER_MAX_MARGIN_FRACTION)throw Error("증거금은 1만원 이상, 순자산의 25% 이하여야 합니다.");
 const quantity=paperQuantity(input.marginKrw,input.leverage,quote.markUsdt,quote.usdKrw);
 const notionalKrw=quantity*quote.markUsdt*quote.usdKrw;
 const estimatedOpeningFeeKrw=Math.round(notionalKrw*PAPER_TAKER_FEE_RATE*100)/100;
 if(input.marginKrw+estimatedOpeningFeeKrw>equityKrw)throw Error("수수료 포함 사용 가능 잔고를 초과했습니다.");
 return {...input,quantity,notionalKrw,estimatedOpeningFeeKrw,markUsdt:quote.markUsdt,usdKrw:quote.usdKrw,asOf:quote.asOf,source:quote.source,previewOnly:true as const};
}
