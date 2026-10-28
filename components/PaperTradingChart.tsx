"use client";
import {useEffect,useRef,useState} from "react";
import {createChart,ColorType,CrosshairMode,LineStyle} from "lightweight-charts";
type Candle={time:number;open:number;high:number;low:number;close:number};
type Summary={price:number|null;change24hPct:number|null;turnover24hUsdt:number|null;fundingRatePct:number|null;openInterestBase:number|null;asOf:string;source:string};
type Position={id:number;symbol:string;side:"LONG"|"SHORT";entryPrice:number;openedAt:string};
const intervals=["1m","5m","15m","1h","4h","1d"] as const;
export default function PaperTradingChart({positions=[]}:{positions?:Position[]}){
 const host=useRef<HTMLDivElement>(null),[symbol,setSymbol]=useState("BTCUSDT"),[interval,setInterval]=useState<string>("15m"),[error,setError]=useState(""),[source,setSource]=useState(""),[busy,setBusy]=useState(false),[summary,setSummary]=useState<Summary|null>(null),[summaryError,setSummaryError]=useState(false);
 useEffect(()=>{
  const element=host.current;if(!element)return;
  const chart=createChart(element,{width:element.clientWidth,height:410,layout:{background:{type:ColorType.Solid,color:"#ffffff"},textColor:"#62768b",fontFamily:"Arial, sans-serif",fontSize:12},grid:{vertLines:{color:"#f2f5fa"},horzLines:{color:"#f2f5fa"}},crosshair:{mode:CrosshairMode.Normal},rightPriceScale:{borderColor:"#e8eef5"},timeScale:{borderColor:"#e8eef5",timeVisible:true,secondsVisible:false},handleScroll:true,handleScale:true});
  const series=chart.addCandlestickSeries({upColor:"#ef5350",downColor:"#318fe5",borderUpColor:"#ef5350",borderDownColor:"#318fe5",wickUpColor:"#ef5350",wickDownColor:"#318fe5",priceFormat:{type:"price",precision:symbol==="DOGEUSDT"?5:symbol==="XRPUSDT"?4:2,minMove:symbol==="DOGEUSDT"?0.00001:symbol==="XRPUSDT"?0.0001:0.01}});
  const markers=positions.filter(p=>p.symbol===symbol);
  for(const p of markers){series.createPriceLine({price:p.entryPrice,color:p.side==="LONG"?"#e65067":"#2988db",lineWidth:2,lineStyle:LineStyle.Dashed,axisLabelVisible:true,title:(p.side==="LONG"?"롱":"숏")+" 평단가"});}
  const resize=new ResizeObserver(()=>chart.applyOptions({width:element.clientWidth}));resize.observe(element);
  const controller=new AbortController();
  setBusy(true);setError("");
  fetch("/api/paper/candles?symbol="+symbol+"&interval="+interval,{signal:controller.signal,cache:"no-store"}).then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error||"차트 조회 오류");const rows=(data.candles as Candle[]).map(x=>({...x,time:x.time as import("lightweight-charts").UTCTimestamp}));series.setData(rows);setSource(data.source||"");series.setMarkers(markers.map(p=>{const t=Math.floor(new Date(p.openedAt).getTime()/1000);const row=[...rows].reverse().find(x=>Number(x.time)<=t)||rows[0];return {time:row.time,position:p.side==="LONG"?"belowBar" as const:"aboveBar" as const,color:p.side==="LONG"?"#e65067":"#2988db",shape:p.side==="LONG"?"arrowUp" as const:"arrowDown" as const,text:(p.side==="LONG"?"롱":"숏")+" 진입"};}).filter(x=>rows.some(row=>row.time===x.time)));chart.timeScale().fitContent()}).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:"시세를 가져오지 못했습니다.")}).finally(()=>{if(!controller.signal.aborted)setBusy(false)});
  return ()=>{controller.abort();resize.disconnect();chart.remove()};
 },[symbol,interval,positions]);
 useEffect(()=>{let active=true;const controller=new AbortController();const load=async()=>{try{const response=await fetch("/api/paper/market-summary?symbol="+symbol,{cache:"no-store",signal:controller.signal});if(!response.ok)throw Error("market unavailable");const result=await response.json() as Summary;if(active){setSummary(result);setSummaryError(false)}}catch{if(active){setSummary(null);setSummaryError(true)}}};setSummary(null);void load();const timer=window.setInterval(()=>{void load()},30000);return()=>{active=false;controller.abort();window.clearInterval(timer)}},[symbol]);
 const price=(v:number|null,digits=2)=>v===null?"—":v.toLocaleString("en-US",{maximumFractionDigits:digits});
 return <section className="paperTerminalChart"><div className="paperChartToolbar"><div className="paperSymbolTabs">{["BTCUSDT","ETHUSDT","SOLUSDT","XRPUSDT","DOGEUSDT"].map(x=><button key={x} className={symbol===x?"selected":""} onClick={()=>setSymbol(x)}>{x.replace("USDT","")}</button>)}</div><div className="paperIntervalTabs">{intervals.map(x=><button key={x} className={interval===x?"selected":""} onClick={()=>setInterval(x)}>{x}</button>)}</div></div><div className="paperChartCanvas" ref={host}/>{busy&&<span className="paperChartLoading">차트 불러오는 중…</span>}{error&&<p role="alert" className="paperPreviewError">{error}</p>}<div className="paperMarketStats" aria-label="선물 시장정보">
 {[
  {label:"현재가 (USDT)",value:price(summary?.price??null,5)},
  {label:"24시간 변동률",value:summary?.change24hPct===null||summary?.change24hPct===undefined?"—":(summary.change24hPct>=0?"+":"")+price(summary.change24hPct,2)+"%"},
  {label:"24시간 거래대금",value:summary?.turnover24hUsdt===null||summary?.turnover24hUsdt===undefined?"—":price(summary.turnover24hUsdt/1000000,1)+"M USDT"},
  {label:"펀딩비",value:summary?.fundingRatePct===null||summary?.fundingRatePct===undefined?"—":price(summary.fundingRatePct,4)+"%"},
  {label:"미결제약정 (기초자산)",value:price(summary?.openInterestBase??null,2)}
 ].map(item=><div key={item.label} className="paperMarketStat"><small>{item.label}</small><strong>{item.value}</strong></div>)}
 </div></section>
}
