"use client";
import {useEffect,useMemo,useState} from "react";
import CoinIcon from "./CoinIcon";
type Coin={ticker:string;name:string;krwPrice:number;change24h:number;volume24hKrw:number;premium:number|null};
type RadarMode="all"|"volume"|"rise"|"fall";
const stable=new Set(["USDT","USDC","DAI","TUSD","FDUSD"]);
const turnover=(n:number)=>n>=1e12?(n/1e12).toFixed(2)+"조원":n>=1e8?(n/1e8).toLocaleString("ko-KR",{maximumFractionDigits:1})+"억원":Math.round(n/1e4).toLocaleString("ko-KR")+"만원";
const price=(n:number)=>n>=100?Math.round(n).toLocaleString("ko-KR"):n.toLocaleString("ko-KR",{maximumFractionDigits:5});
const signed=(n:number)=>(n>0?"+":"")+n.toFixed(2)+"%";
const score=(c:Coin)=>Math.min(Math.abs(c.change24h),35)*Math.log10(c.volume24hKrw/1e9+1);
export default function MarketRadar(){
 const[coins,setCoins]=useState<Coin[]>([]),[status,setStatus]=useState<"loading"|"ready"|"error">("loading"),[updated,setUpdated]=useState(""),[mode,setMode]=useState<RadarMode>("all"),[q,setQ]=useState(""),[more,setMore]=useState(15);
 useEffect(()=>{let mounted=true;const run=async()=>{try{const r=await fetch("/api/markets",{cache:"no-store"});if(!r.ok)throw Error("market api");const result=await r.json();if(mounted){setCoins(Array.isArray(result.coins)?result.coins:[]);setUpdated(result.updatedAt||"");setStatus("ready")}}catch{if(mounted)setStatus("error")}};void run();const t=setInterval(run,60000);return()=>{mounted=false;clearInterval(t)}},[]);
 const eligible=useMemo(()=>coins.filter(c=>!stable.has(c.ticker)&&Number.isFinite(c.change24h)&&Number.isFinite(c.volume24hKrw)&&c.volume24hKrw>=1e9),[coins]);
 const movers=useMemo(()=>eligible.filter(c=>Math.abs(c.change24h)>=4),[eligible]);
 const leaders=useMemo(()=>[...movers].sort((a,b)=>score(b)-score(a)).slice(0,4),[movers]);
 const filtered=useMemo(()=>{let list=mode==="rise"?eligible.filter(c=>c.change24h>=4):mode==="fall"?eligible.filter(c=>c.change24h<=-4):mode==="volume"?eligible: movers;
 if(q.trim()){const term=q.trim().toLocaleLowerCase();list=list.filter(c=>c.ticker.toLocaleLowerCase().includes(term)||c.name.toLocaleLowerCase().includes(term))}
 return [...list].sort((a,b)=>mode==="volume"?b.volume24hKrw-a.volume24hKrw:mode==="rise"?b.change24h-a.change24h:mode==="fall"?a.change24h-b.change24h:score(b)-score(a))},[eligible,movers,mode,q]);
 const filters:{id:RadarMode;label:string}[]=[{id:"all",label:"전체 변화"},{id:"volume",label:"거래대금 상위"},{id:"rise",label:"급등 탐지"},{id:"fall",label:"급락 탐지"}];
 const summary=[{name:"가격 변동 종목",count:movers.length,description:"등락률 절댓값 4% 이상"},{name:"상승 종목",count:eligible.filter(c=>c.change24h>=4).length,description:"24시간 상승률 4% 이상"},{name:"하락 종목",count:eligible.filter(c=>c.change24h<=-4).length,description:"24시간 하락률 -4% 이하"}];
 return <section className="radarExplorer">
 <div className="radarIntro"><div><h2>82coin 시장 레이더</h2><p>지금 움직이는 종목을 가격 변화와 거래대금으로 함께 확인합니다.</p></div><span className="radarTimestamp">{updated?"시세 기준 "+new Date(updated).toLocaleTimeString("ko-KR"):"시세 확인 중"}</span></div>
 <div className="radarSummary">{summary.map(s=><div key={s.name} className="radarSummaryItem"><span>{s.name}</span><strong>{status==="ready"?s.count.toLocaleString("ko-KR"):"—"}<small> 종목</small></strong><small>{s.description}</small></div>)}</div>
 <div className="radarSectionHead"><div><h3>지금 눈여겨볼 변화</h3><p>유동성과 24시간 등락률을 함께 고려해 최대 4종목을 표시합니다.</p></div></div>
 <div className="radarHighlightGrid">{leaders.map(c=><a href={"/market#all-coins"} className="radarHighlight" key={c.ticker}><div className="radarHighlightTop"><span><CoinIcon ticker={c.ticker} size={28}/><strong>{c.ticker}</strong></span><b className={c.change24h>=0?"up":"down"}>{signed(c.change24h)}</b></div><div className="radarHighlightPrice">{price(c.krwPrice)} <small>KRW</small></div><div className="radarReason"><span className="radarTag">{c.change24h>=4?"가격 급등":"가격 급락"}</span><span className="radarTag muted">거래대금 10억원 이상</span></div><div className="radarHighlightFoot">24시간 거래대금 <strong>{turnover(c.volume24hKrw)}</strong></div></a>)}{leaders.length===0&&<div className="radarEmpty">{status==="loading"?"시세 데이터를 불러오는 중입니다.":status==="error"?"시장 데이터 연결에 실패했습니다.":"현재 기준에 해당하는 종목이 없습니다."}</div>}</div>
 <div className="radarSectionHead radarTableHeading"><div><h3>전체 탐지 목록</h3><p>조건을 바꿔 비교하고 종목명을 검색할 수 있습니다.</p></div><span>{filtered.length}종목</span></div>
 <div className="radarControls"><div className="radarFilters" role="group" aria-label="시장 레이더 분류">{filters.map(f=><button key={f.id} type="button" className={mode===f.id?"active":""} aria-pressed={mode===f.id} onClick={()=>{setMode(f.id);setMore(15)}}>{f.label}</button>)}</div><input type="search" aria-label="시장 레이더 종목 검색" placeholder="코인명 또는 심볼 검색" value={q} onChange={e=>{setQ(e.target.value);setMore(15)}}/></div>
 <div className="radarTableScroll"><div className="radarTable"><div className="radarTableRow radarTableHeader"><span>종목</span><span>현재가 (KRW)</span><span>24시간 거래대금</span><span>24시간 등락</span><span>감지 기준</span></div>{filtered.slice(0,more).map(c=><div key={c.ticker} className="radarTableRow"><span className="radarCoin"><CoinIcon ticker={c.ticker} size={25}/><strong>{c.ticker}</strong><small>{c.name}</small></span><span>{price(c.krwPrice)}</span><span>{turnover(c.volume24hKrw)}</span><strong className={c.change24h>=0?"up":"down"}>{signed(c.change24h)}</strong><span>{c.change24h>=4?"상승 4% 이상":c.change24h<=-4?"하락 4% 이상":"거래대금 상위"}</span></div>)}{filtered.length===0&&<div className="radarEmpty">{status==="loading"?"데이터를 불러오는 중입니다.":status==="error"?"현재 데이터를 가져올 수 없습니다.":"선택한 조건에 맞는 종목이 없습니다."}</div>}</div></div>
 {more<filtered.length&&<button className="radarMore" onClick={()=>setMore(v=>v+15)} type="button">더보기 ({Math.min(more,filtered.length)}/{filtered.length})</button>}

</section>
}
