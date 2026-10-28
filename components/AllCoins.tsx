"use client";
import {useEffect,useMemo,useState} from "react";
import CoinIcon from "./CoinIcon";
type Coin={ticker:string;market:string;name:string;krwPrice:number;change24h:number;volume24hKrw:number;premium:number|null};
type Sort="hot"|"gain"|"loss"|"high"|"low"|"priceHigh"|"priceLow";
const formatPrice=(v:number)=>v>=100?Math.round(v).toLocaleString("ko-KR"):v>=1?v.toLocaleString("ko-KR",{maximumFractionDigits:3}):v.toLocaleString("ko-KR",{maximumFractionDigits:6});
const formatValue=(n:number)=>n>=1e12?(n/1e12).toFixed(2)+"조":n>=1e8?(n/1e8).toFixed(1)+"억":n>=1e4?(n/1e4).toFixed(0)+"만":n.toLocaleString("ko-KR");
export default function AllCoins({compact=false}:{compact?:boolean}){
 const[sourceAt,setSourceAt]=useState(""),[stale,setStale]=useState(false),[coverage,setCoverage]=useState<number|null>(null),[foreignSource,setForeignSource]=useState(""),[coins,setCoins]=useState<Coin[]>([]),[tab,setTab]=useState<Sort>("hot"),[q,setQ]=useState(""),[page,setPage]=useState(1),[status,setStatus]=useState("연결 중"),[updated,setUpdated]=useState("");
 useEffect(()=>{let active=true;const load=async()=>{try{const r=await fetch("/api/markets",{cache:"no-store"});const d=await r.json();if(!r.ok)throw Error(d.error||"조회 실패");if(active){setCoins(d.coins||[]);setStatus(d.stale?"시세 지연":"시세 조회 중");setStale(Boolean(d.stale));setSourceAt(d.sourceUpdatedAt||"");setUpdated(d.updatedAt);setCoverage(typeof d.premiumCoverage==="number"?d.premiumCoverage:null);setForeignSource(d.foreignSource||"")}}catch{if(active)setStatus("데이터 연결 실패")}};load();const id=setInterval(load,30000);return()=>{active=false;clearInterval(id)}},[]);
 const sorted=useMemo(()=>{const filtered=coins.filter(c=>!q||c.ticker.toLowerCase().includes(q.toLowerCase())||c.name.includes(q));return [...filtered].sort((a,b)=>tab==="priceHigh"?b.krwPrice-a.krwPrice:tab==="priceLow"?a.krwPrice-b.krwPrice:tab==="high"?b.volume24hKrw-a.volume24hKrw:tab==="low"?a.volume24hKrw-b.volume24hKrw:tab==="gain"?b.change24h-a.change24h:tab==="loss"?a.change24h-b.change24h:Math.abs(b.change24h)-Math.abs(a.change24h))},[coins,q,tab]);
 const length=compact?10:50;const rows=compact?sorted.slice(0,10):sorted.slice(0,page*length);
 return <section className={"allCoins "+(compact?"compactCoins":"fullCoins")}>
 <div className="coinSectionHead"><div><h2>{compact?"실시간 코인 랭킹":"전체 코인 시세"}</h2><span className="marketSource">{status} · Upbit 원화마켓 {coins.length?coins.length+"종목":""}</span></div>{compact?<a className="viewMore" href="/market#all-coins">전체보기 ↗</a>:<span className="marketSource">{sourceAt?new Date(sourceAt).toLocaleTimeString("ko-KR"):"시세 확인 중"} 거래소 기준</span>}</div>
 <div className="rankTabs" role="group" aria-label="코인 정렬">{([{id:"hot",label:"HOT"},{id:"gain",label:"상승 높은순"},{id:"loss",label:"하락 높은순"},{id:"high",label:"거래량 높은순"},{id:"low",label:"거래량 낮은순"},{id:"priceHigh",label:"가격 높은순"},{id:"priceLow",label:"가격 낮은순"}] as const).map(x=><button type="button" key={x.id} onClick={()=>{setTab(x.id);setPage(1)}} className={tab===x.id?"active":""}>{x.label}</button>)}</div>
 {!compact&&<input className="coinSearch" type="search" value={q} onChange={e=>{setQ(e.target.value);setPage(1)}} placeholder="코인명 또는 심볼 검색" aria-label="코인 검색"/>}
 <div className="coinsTableHead coinsTableHeadFive"><span>종목</span><button type="button" onClick={()=>setTab(tab==="high"?"low":"high")}>24H 거래대금 <span aria-hidden="true">↕</span></button><button type="button" onClick={()=>setTab(tab==="priceHigh"?"priceLow":"priceHigh")}>현재가 (KRW) <span aria-hidden="true">↕</span></button><button type="button" onClick={()=>setTab(tab==="gain"?"loss":"gain")}>24H 변동 <span aria-hidden="true">↕</span></button><span>김프</span></div>
 <div aria-live="polite">{rows.map((c,i)=><div className="coinsTableRow" key={c.market}><div className="coinsTitle"><span className="coinOrder">{i+1}</span><CoinIcon ticker={c.ticker} size={compact?23:27}/><span className="coinIdentity"><strong>{c.ticker}</strong>{!compact&&<small>{c.name}</small>}</span></div><span className="coinVolume">{formatValue(c.volume24hKrw)}원</span><strong className="coinPrice">{formatPrice(c.krwPrice)}</strong><span className={"coinChange "+(c.change24h>=0?"up":"down")}>{(c.change24h>0?"+":"")+c.change24h.toFixed(2)+"%"}</span><span className={"coinPremium "+(c.premium===null?"":c.premium>=0?"up":"down")}>{c.premium===null?"—":(c.premium>0?"+":"")+c.premium.toFixed(2)+"%"}</span></div>)}</div>
 {!rows.length&&<div className="coinsEmpty">{coins.length?"검색 결과가 없습니다.":status==="연결 중"?"시세를 불러오는 중입니다.":"현재 시세를 표시할 수 없습니다."}</div>}
 {!compact&&rows.length<sorted.length&&<button className="coinMore" type="button" onClick={()=>setPage(p=>p+1)}>더 보기 ({rows.length}/{sorted.length})</button>}


 </section>
}
