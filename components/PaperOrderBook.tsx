"use client";
import {useEffect,useState} from "react";
type Book={asks:number[][];bids:number[][];asOf:string};
const fmt=(x:number)=>x.toLocaleString("en-US",{maximumFractionDigits:x<10?5:2});
export default function PaperOrderBook({symbol}:{symbol:string}){
 const [data,setData]=useState<Book|null>(null),[delayed,setDelayed]=useState(false);
 useEffect(()=>{let mounted=true;const ctrl=new AbortController();
 const load=async()=>{try{const r=await fetch("/api/paper/orderbook?symbol="+symbol,{cache:"no-store",signal:ctrl.signal});if(!r.ok)throw Error();const v=await r.json() as Book;if(mounted){setData(v);setDelayed(false)}}catch{if(mounted){setDelayed(true);setData(null)}}};
 setData(null);void load();const timer=window.setInterval(()=>void load(),5000);return()=>{mounted=false;ctrl.abort();window.clearInterval(timer)}},[symbol]);
 const asks=(data?.asks||[]).slice(0,9).reverse(),bids=(data?.bids||[]).slice(0,9),max=Math.max(1,...asks.map(x=>x[1]),...bids.map(x=>x[1]));
 const mid=data&&data.bids[0]&&data.asks[0]?(data.bids[0][0]+data.asks[0][0])/2:null;
 return <aside className="paperOrderBook" aria-label="선물 호가창">
 <div className="paperOrderBookHead"><strong>호가창</strong><small>USDT 무기한</small></div>
 <div className="paperOrderBookColumns"><span>가격 (USDT)</span><span>수량</span></div>
 {delayed?<p className="paperOrderBookLoading">호가 연결이 지연되고 있어요.</p>:!data?<p className="paperOrderBookLoading">호가를 불러오는 중…</p>:<>
 <div className="paperOrderBookRows">{asks.map(([p,q],i)=><div className="paperOrderBookRow asks" key={"a"+i}><div className="depth" style={{width:(100*q/max)+"%"}}/><b>{fmt(p)}</b><span>{fmt(q)}</span></div>)}</div>
 <div className="paperOrderBookMid">{mid===null?"—":fmt(mid)} <small>중간가</small></div>
 <div className="paperOrderBookRows">{bids.map(([p,q],i)=><div className="paperOrderBookRow bids" key={"b"+i}><div className="depth" style={{width:(100*q/max)+"%"}}/><b>{fmt(p)}</b><span>{fmt(q)}</span></div>)}</div>
 </>}
 <p className="paperOrderBookFoot">시장 호가 조회 · 가상 주문은 별도 모의 체결</p>
 </aside>;
}
