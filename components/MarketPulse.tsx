"use client";
import {useEffect,useMemo,useState} from "react";
import CoinIcon from "./CoinIcon";
type Coin={ticker:string;name:string;krwPrice:number;change24h:number;premium:number|null;volume24hKrw:number};
type MarketResponse={coins:Coin[];updatedAt?:string;foreignSource?:string;usdKrw?:number|null;premiumCoverage?:number};
const formatPrice=(n:number)=>n>=100?Math.round(n).toLocaleString("ko-KR"):n.toLocaleString("ko-KR",{maximumFractionDigits:5});
export default function MarketPulse(){
 const [data,setData]=useState<MarketResponse>({coins:[]}),[failed,setFailed]=useState(false);
 useEffect(()=>{let mounted=true;const refresh=async()=>{try{const response=await fetch("/api/markets",{cache:"no-store"});if(!response.ok)throw Error("No quotes");const body=await response.json() as MarketResponse;if(mounted){setData(body);setFailed(false)}}catch{if(mounted)setFailed(true)}};refresh();const id=setInterval(refresh,60000);return()=>{mounted=false;clearInterval(id)}},[]);
 const signals=useMemo(()=>{
 const pool=data.coins.filter(c=>Number.isFinite(c.volume24hKrw)&&c.volume24hKrw>=1_000_000_000&&Number.isFinite(c.change24h)&&Math.abs(c.change24h)>=4&&!["USDT","USDC","DAI","TUSD","FDUSD"].includes(c.ticker));
 // 24h absolute change and KRW turnover define eligibility. Outlier-aware ranking favors liquid, consequential moves.
 return [...pool].sort((a,b)=>{const score=(x:Coin)=>Math.min(Math.abs(x.change24h),35)*Math.log10(Math.max(x.volume24hKrw,1)/1_000_000_000+1);return score(b)-score(a)}).slice(0,4);
 },[data.coins]);
 return <section className="pulseSection"><div className="lowerTitle"><div><span className="sectionKicker">82COIN MARKET SIGNALS</span><h2>지금 시장에서 눈여겨볼 변화</h2><p>전체 원화마켓에서 유동성과 실제 가격 변동을 함께 확인해 선별합니다.</p></div><a href="/market#all-coins" className="viewMore">전체 시장보기 ↗</a></div>
 <div className="pulseGrid">{signals.length?signals.map(c=><a key={c.ticker} href={"/market#all-coins"} className="pulseCard"><div className="pulseCardTop"><span className="pulseAsset"><CoinIcon ticker={c.ticker} size={25}/><strong>{c.ticker}</strong></span><span className={c.change24h>=0?"up":"down"}>{c.change24h>0?"+":""}{c.change24h.toFixed(2)}%</span></div><div className="pulsePrice">{formatPrice(c.krwPrice)}<small> KRW</small></div><div className="pulseCardBottom"><span>24시간 거래대금 {(c.volume24hKrw/100_000_000).toLocaleString("ko-KR",{maximumFractionDigits:1})}억원</span><span>{c.premium===null?"김프 미확인":"김프 "+(c.premium>0?"+":"")+c.premium.toFixed(2)+"%"}</span></div></a>):<div className="pulseNoData">{failed?"시세 데이터 연결 상태를 확인 중입니다.":data.coins.length?"현재 기준을 충족하는 시장 변화가 없습니다.":"전체 종목 시세를 불러오는 중입니다."}</div>}</div>
</section>;
}
