"use client";
import {useState} from "react";
type Preview={symbol:string;side:string;marginKrw:number;leverage:number;quantity:number;notionalKrw:number;estimatedOpeningFeeKrw:number;markUsdt:number;usdKrw:number;asOf:string;source:string;previewOnly:true};
export default function PaperOrderPreview(){
 const[symbol,setSymbol]=useState("BTCUSDT"),[side,setSide]=useState<"LONG"|"SHORT">("LONG"),[margin,setMargin]=useState("50000"),[leverage,setLeverage]=useState("3");
 const[result,setResult]=useState<Preview|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 async function calculate(){setBusy(true);setError("");setResult(null);try{const response=await fetch("/api/paper/preview",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({symbol,side,marginKrw:Number(margin),leverage:Number(leverage)})});const data=await response.json();if(!response.ok)throw Error(data.error||"시세 조회 실패");setResult(data.preview)}catch(e){setError(e instanceof Error?e.message:"미리보기에 실패했습니다.")}finally{setBusy(false)}}
 const won=(n:number)=>Math.round(n).toLocaleString("ko-KR")+"원";
 return <section className="paperPanel paperTradePreview"><div className="paperPreviewHead"><div><h2>가상 주문 미리보기</h2><p>실제 매매 기능 출시 전 계산을 확인하는 화면입니다.</p></div><span>주문 비활성화</span></div>
 <div className="paperPreviewGrid"><label>종목<select value={symbol} onChange={e=>{setSymbol(e.target.value);setResult(null)}}>{["BTCUSDT","ETHUSDT","SOLUSDT","XRPUSDT","DOGEUSDT"].map(x=><option value={x} key={x}>{x}</option>)}</select></label><label>방향<select value={side} onChange={e=>{setSide(e.target.value as "LONG"|"SHORT");setResult(null)}}><option value="LONG">롱 (상승)</option><option value="SHORT">숏 (하락)</option></select></label><label>가상 증거금(KRW)<input type="number" min="10000" step="10000" value={margin} onChange={e=>{setMargin(e.target.value);setResult(null)}}/></label><label>레버리지 (1~20배)<input type="number" min="1" max="20" step="1" value={leverage} onChange={e=>{setLeverage(e.target.value);setResult(null)}}/></label></div>
 <button className="paperPreviewButton" type="button" disabled={busy} onClick={calculate}>{busy?"계산 중...":"현재 시세로 예상 주문 계산"}</button>{error&&<p role="alert" className="paperPreviewError">{error}</p>}
 {result&&<div className="paperPreviewResult"><div><span>선물 마크가격</span><strong>${result.markUsdt.toLocaleString("en-US")}</strong></div><div><span>가상 포지션 규모</span><strong>{won(result.notionalKrw)}</strong></div><div><span>예상 진입 수수료</span><strong>{won(result.estimatedOpeningFeeKrw)}</strong></div><div><span>진입 수량</span><strong>{result.quantity.toFixed(6)} {symbol.replace("USDT","")}</strong></div><p>가격 시각: {new Date(result.asOf).toLocaleString("ko-KR")} · {result.source}</p></div>}
 <p className="paperNotice">이 결과는 주문 실행이 아닙니다. 가상잔고 변경·포지션 생성·월간 랭킹 반영은 발생하지 않습니다. 실제 체결가격·슬리피지·펀딩비·강제청산은 아직 검증 중입니다.</p>
 </section>
}
