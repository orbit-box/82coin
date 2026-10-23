"use client";
import {useEffect,useRef,useState} from "react";
import {createChart,ColorType,CrosshairMode,LineStyle} from "lightweight-charts";
type Candle={time:number;open:number;high:number;low:number;close:number};
type Position={id:number;symbol:string;side:"LONG"|"SHORT";entryPrice:number;openedAt:string};
const intervals=["1m","5m","15m","1h","4h","1d"] as const;
export default function PaperTradingChart({positions=[]}:{positions?:Position[]}){
 const host=useRef<HTMLDivElement>(null),[symbol,setSymbol]=useState("BTCUSDT"),[interval,setInterval]=useState<string>("15m"),[error,setError]=useState(""),[source,setSource]=useState(""),[busy,setBusy]=useState(false);
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
 return <section className="paperTerminalChart"><div className="paperChartToolbar"><div className="paperSymbolTabs">{["BTCUSDT","ETHUSDT","SOLUSDT","XRPUSDT","DOGEUSDT"].map(x=><button key={x} className={symbol===x?"selected":""} onClick={()=>setSymbol(x)}>{x.replace("USDT","")}</button>)}</div><div className="paperIntervalTabs">{intervals.map(x=><button key={x} className={interval===x?"selected":""} onClick={()=>setInterval(x)}>{x}</button>)}</div></div><div className="paperChartCanvas" ref={host}/>{busy&&<span className="paperChartLoading">차트 불러오는 중…</span>}{error&&<p role="alert" className="paperPreviewError">{error}</p>}<p className="paperChartFootnote">TradingView Lightweight Charts · {source||"거래소 연결 확인 중"} · 표시 가격은 참고용입니다. 열린 포지션의 평단가와 진입 위치가 차트에 표시됩니다.</p></section>
}
