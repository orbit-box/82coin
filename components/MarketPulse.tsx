"use client";
import {useEffect,useState} from "react";
type Coin={ticker:string;krwPrice:number;change24h:number;premium:number|null};
export default function MarketPulse(){
 const [coins,setCoins]=useState<Coin[]>([]);
 const [source,setSource]=useState("");
 useEffect(()=>{let mounted=true;const refresh=async()=>{try{const r=await fetch("/api/market",{cache:"no-store"});if(!r.ok)return;const d=await r.json();if(mounted){setCoins(d.coins||[]);setSource(d.domesticSource||"")}}catch{}};refresh();const timer=setInterval(refresh,30000);return()=>{mounted=false;clearInterval(timer)}},[]);
 const moving=[...coins].sort((a,b)=>Math.abs(b.change24h)-Math.abs(a.change24h)).slice(0,4);
 return <section className="pulseSection"><div className="lowerTitle"><div><span className="sectionKicker">82COIN SIGNAL BOARD</span><h2>지금 시장에서 눈여겨볼 변화</h2><p>주요 종목의 변동률을 비교하고 관심 있는 시장을 더 깊게 살펴보세요.</p></div><a href="/market" className="viewMore">시세 전체보기 ↗</a></div><div className="pulseGrid">{moving.length?moving.map(c=><a key={c.ticker} href="/market" className="pulseCard"><div className="pulseCardTop"><strong>{c.ticker}</strong><span className={c.change24h>=0?"up":"down"}>{c.change24h>0?"+":""}{c.change24h.toFixed(2)}%</span></div><div className="pulsePrice">{Math.round(c.krwPrice).toLocaleString("ko-KR")}<small> KRW</small></div><div className="pulseCardBottom"><span>24시간 변동률</span><span>{c.premium===null?"김프 —":"김프 "+c.premium.toFixed(2)+"%"}</span></div></a>):<div className="pulseNoData">시장 데이터 연결 중입니다. 현재 수치가 확인되면 자동으로 표시됩니다.</div>}</div><p className="dataFoot">데이터: {source||"연결 대기"} · 변동률 순 정렬 · 투자 추천이나 급등 예측이 아닙니다.</p></section>
}
