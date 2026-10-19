import MarketDataPanel from "./MarketDataPanel";
"use client";
import {useEffect,useState} from "react";
type Post={author:string;title:string;url:string;publishedAt:string|null;platform:string};
type Row={symbol:string;fundingPercent:number|null;markPrice:number|null;longPct:number|null;shortPct:number|null;openInterest:number|null};
type News={title:string;url:string;source:string;publishedAt:string|null};
type Liquidation={available:boolean;longUsd?:number;shortUsd?:number;totalUsd?:number;longPct?:number|null;shortPct?:number|null;coveragePct?:number;windowComplete?:boolean;disclaimer?:string;sources?:Array<{source:string;coveragePct:number;connected:boolean}>};
type Tab="ratio"|"liquidation"|"funding"|"openInterest"|"macro";
const tabs:{id:Tab;label:string}[]=[{id:"ratio",label:"롱숏 비율"},{id:"liquidation",label:"강제청산 비율"},{id:"funding",label:"펀딩 비율"},{id:"openInterest",label:"미결제약정"},{id:"macro",label:"주요 경제뉴스"}];
export default function LiveMarketSection(){
 const[liq,setLiq]=useState<Liquidation|null>(null),[hours,setHours]=useState(1),[ticker,setTicker]=useState("ALL"),[posts,setPosts]=useState<Post[]>([]),[items,setItems]=useState<Row[]>([]),[news,setNews]=useState<News[]>([]),[loaded,setLoaded]=useState(false),[active,setActive]=useState<Tab>("ratio");
 useEffect(()=>{let alive=true;const refresh=async()=>{const results=await Promise.allSettled(["/api/influencers","/api/derivatives","/api/news"].map(p=>fetch(p,{cache:"no-store"}).then(r=>r.json())));if(!alive)return;if(results[0].status==="fulfilled")setPosts(results[0].value.items||[]);if(results[1].status==="fulfilled")setItems(results[1].value.items||[]);if(results[2].status==="fulfilled")setNews(results[2].value.items||[]);setLoaded(true)};refresh();const timer=setInterval(refresh,180000);return()=>{alive=false;clearInterval(timer)}},[]);
 useEffect(()=>{let mounted=true;const refresh=async()=>{try{const r=await fetch("/api/liquidations?hours="+hours+"&ticker="+ticker,{cache:"no-store"});const data=await r.json();if(mounted)setLiq(data)}catch{if(mounted)setLiq({available:false})}};refresh();const id=setInterval(refresh,30000);return()=>{mounted=false;clearInterval(id)}},[hours,ticker]);
 const has=(r:Row)=>active==="ratio"?r.longPct!==null&&r.shortPct!==null:active==="funding"?r.fundingPercent!==null:r.openInterest!==null;
 return <section className="liveMarketSplit" aria-label="인플루언서 라이브와 선물 마켓데이터">
 <div className="liveColumn"><div className="liveHead"><div><span className="sectionKicker">CREATOR LIVE</span><h2><span className="liveDot"/>인플루언서 라이브</h2><p>공개된 최신 영상·시장 관점 원문 모음</p></div><a href="https://www.youtube.com/@CoinBureau" target="_blank" rel="noopener noreferrer" className="viewMore">원본 채널 ↗</a></div><div className="liveFeed">{posts.length?posts.slice(0,5).map((p,i)=><a className="liveFeedRow" href={p.url} key={p.url+i} target="_blank" rel="noopener noreferrer"><span className="creatorAvatar">CB</span><span className="liveFeedContent"><span className="creatorByline">{p.author} <small>{p.publishedAt?new Date(p.publishedAt).toLocaleDateString("ko-KR"):""}</small></span><strong>{p.title}</strong><small>{p.platform} · 원문보기 ↗</small></span></a>):<div className="liveEmpty">{loaded?"현재 불러올 수 있는 공식 게시물이 없습니다.":"공식 공개 채널의 게시물을 불러오는 중입니다."}</div>}</div><p className="dataFoot">현재 Coin Bureau의 공식 YouTube 공개 영상 피드부터 시범 연동했습니다. 게시물 본문을 복제하지 않으며 인플루언서와 82coin의 제휴를 의미하지 않습니다. 추가 출처는 순차적으로 검증합니다.</p></div>
 <MarketDataPanel/>
 </section>
}
