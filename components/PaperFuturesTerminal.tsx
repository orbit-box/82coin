"use client";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import PaperTradingChart from "@/components/PaperTradingChart";
import PaperOrderBook from "@/components/PaperOrderBook";
import {useRouter} from "next/navigation";
type Side="LONG"|"SHORT";
type Position={id:number;symbol:string;side:Side;quantity:number;entryPrice:number;marginKrw:number;leverage:number;openedAt:string};
type History={id:number;symbol:string;side:Side;realizedPnlKrw:number;closedAt:string};
type Mark={symbol:string;markUsdt:number;usdKrw:number;asOf:string};
type State={balanceKrw:number;equityKrw?:number;lockedMarginKrw?:number;remainingResets?:number;resetEligible?:boolean;positions:Position[];history:History[];mark:Mark|null};
type Summary={price:number|null;change24hPct:number|null;fundingRatePct:number|null;asOf:string};
const krw=(n:number)=>Math.round(n).toLocaleString("ko-KR")+"원";
const price=(n:number)=>n.toLocaleString("en-US",{maximumFractionDigits:5});
const options=["BTCUSDT","ETHUSDT","SOLUSDT","XRPUSDT","DOGEUSDT"];
export default function PaperFuturesTerminal({initialBalance,initialPositions,loggedIn}:{initialBalance:number|null;initialPositions:Position[];loggedIn:boolean}){
 const router=useRouter(),pending=useRef(false);
 const [symbol,setSymbol]=useState("BTCUSDT"),[leverage,setLeverage]=useState(3),[margin,setMargin]=useState("50000"),[side,setSide]=useState<Side>("LONG");
 const [market,setMarket]=useState<Summary|null>(null),[state,setState]=useState<State>({balanceKrw:initialBalance??0,positions:initialPositions,history:[],mark:null});
 const [tab,setTab]=useState<"positions"|"history">("positions"),[notice,setNotice]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 const [confirm,setConfirm]=useState<null|{action:"OPEN"|"CLOSE"|"RESET";positionId?:number;requestId:string}>(null);
 const update=useCallback(async()=>{if(!loggedIn)return;try{const r=await fetch("/api/paper/state",{cache:"no-store"});if(!r.ok)throw Error("state");const data=await r.json() as State;setState(old=>{if(JSON.stringify(old)===JSON.stringify(data))return old;if(JSON.stringify(old.positions)===JSON.stringify(data.positions))data.positions=old.positions;return data})}catch{}},[loggedIn]);
 useEffect(()=>{void update();const timer=window.setInterval(()=>void update(),15000);return()=>window.clearInterval(timer)},[update]);
 useEffect(()=>{let active=true;const ctl=new AbortController();const load=async()=>{try{const r=await fetch("/api/paper/market-summary?symbol="+symbol,{cache:"no-store",signal:ctl.signal});if(!r.ok)throw Error();const data=await r.json() as Summary;if(active)setMarket(data)}catch{if(active)setMarket(null)}};setMarket(null);void load();const t=window.setInterval(()=>void load(),30000);return()=>{active=false;ctl.abort();window.clearInterval(t)}},[symbol]);
 const marginValue=Number(margin);
 const available=Math.max(0,state.balanceKrw),maxMargin=available*.25;
 const estimatedSize=Number.isFinite(marginValue)&&marginValue>0?marginValue*leverage:0;
 const open=state.positions[0];
 const chartPositions=useMemo(()=>state.positions.map(x=>({id:x.id,symbol:x.symbol,side:x.side,entryPrice:x.entryPrice,openedAt:x.openedAt})),[state.positions]);
 const unrealized=useMemo(()=>{if(!open||!state.mark||state.mark.symbol!==open.symbol)return null;
 const n=(state.mark.markUsdt-open.entryPrice)*open.quantity*state.mark.usdKrw*(open.side==="LONG"?1:-1);
 return Number.isFinite(n)?n:null},[open,state.mark]);
 const pct=unrealized===null||!open?null:unrealized/open.marginKrw*100;
 const estimateFee=Math.round(estimatedSize*.0005);
 const begin=(action:"OPEN"|"CLOSE"|"RESET",positionId?:number)=>{setError("");setNotice("");if(!loggedIn){setError("로그인 후 거래할 수 있어요.");return}
 if(action==="OPEN"&&(open||!Number.isFinite(marginValue)||marginValue<10000||marginValue>maxMargin||!Number.isInteger(leverage)||leverage<1||leverage>20)){setError(open?"진행 중인 포지션을 먼저 청산해 주세요.":"증거금은 1만원 이상, 가용 잔고의 최대 25%까지 사용할 수 있어요.");return}
 setConfirm({action,positionId,requestId:crypto.randomUUID()})};
 const submit=async()=>{if(!confirm||busy||pending.current)return;pending.current=true;setBusy(true);setError("");try{
 const body=confirm.action==="OPEN"?{action:"OPEN",symbol,side,marginKrw:marginValue,leverage,requestId:confirm.requestId}:{action:"CLOSE",positionId:confirm.positionId,requestId:confirm.requestId};
 const r=await fetch(confirm.action==="RESET"?"/api/paper/reset":"/api/paper/trade",{method:"POST",headers:{"Content-Type":"application/json"},body:confirm.action==="RESET"?"{}":JSON.stringify(body),credentials:"same-origin"});const j=await r.json();if(!r.ok)throw Error(j.error||"주문 처리에 실패했습니다.");
 setNotice(confirm.action==="OPEN"?"가상 포지션 진입이 완료됐어요.":confirm.action==="CLOSE"?"포지션 청산이 완료됐어요.":"가상잔고가 초기화됐어요.");setConfirm(null);await update();router.refresh()
 }catch(e){setError(e instanceof Error?e.message:"거래 처리 오류. 내역을 확인해 주세요.")}finally{pending.current=false;setBusy(false)}};
 return <>
 <div className="paperTerminalLayout paperExchangeLayout">
 <PaperTradingChart positions={chartPositions} selectedSymbol={symbol} onSymbolChange={setSymbol}/>
 <PaperOrderBook symbol={symbol}/>
 <aside className="paperTerminalSide paperExchangeOrder">
   <div className="paperExchangeTitle"><strong>선물 주문</strong><span>USDT 무기한 · 모의거래</span></div>
   <div className="paperExchangeMode"><span className="selected">격리</span><span>{leverage}x</span><span>단방향</span></div>
   <div className="paperExchangeBalance"><small>주문 가능 가상잔고</small><strong>{loggedIn?krw(available):"로그인 필요"}</strong></div>
   <div className="paperExchangeSymbol"><label htmlFor="paperSymbolSelect">거래 종목</label><select id="paperSymbolSelect" value={symbol} onChange={e=>setSymbol(e.target.value)}>{options.map(x=><option key={x} value={x}>{x.replace("USDT","")}/USDT</option>)}</select></div>
   <div className="paperExchangeTabs" role="tablist"><button type="button" className="selected" aria-selected="true">시장가</button><button type="button" disabled title="지정가는 체결 안정성 검증 후 제공">지정가</button></div>
   <div className="paperExchangeSides"><button type="button" className={side==="LONG"?"long selected":"long"} onClick={()=>setSide("LONG")}>매수 / 롱</button><button type="button" className={side==="SHORT"?"short selected":"short"} onClick={()=>setSide("SHORT")}>매도 / 숏</button></div>
   <div className="paperExchangeMark"><span>참고 현재가</span><strong>{market?.price?price(market.price)+" USDT":"—"}</strong></div>
   <label className="paperExchangeField">레버리지 <strong>{leverage}배</strong><input type="range" min="1" max="20" step="1" value={leverage} onChange={e=>setLeverage(Number(e.target.value))}/><div className="paperExchangeTicks"><span>1x</span><span>5x</span><span>10x</span><span>15x</span><span>20x</span></div></label>
   <label className="paperExchangeField">증거금 (KRW)<input type="number" min="10000" max={maxMargin} step="1000" value={margin} onChange={e=>setMargin(e.target.value)}/></label>
   <div className="paperExchangePercent">{[.1,.25,.5,1].map(x=><button type="button" key={x} onClick={()=>setMargin(String(Math.floor(maxMargin*x/1000)*1000))}>{Math.round(x*100)}%</button>)}</div>
   <div className="paperExchangeEstimate"><div><span>예상 포지션 규모</span><b>{krw(estimatedSize)}</b></div><div><span>예상 진입 수수료</span><b>{krw(estimateFee)}</b></div><div><span>최대 사용 가능 증거금</span><b>{krw(maxMargin)}</b></div></div>
   <button className={side==="LONG"?"paperExchangeSubmit long":"paperExchangeSubmit short"} type="button" disabled={!loggedIn||busy||!!open} onClick={()=>begin("OPEN")}>{!loggedIn?"로그인 후 거래 시작":open?"포지션 보유 중":side==="LONG"?"롱 포지션 진입":"숏 포지션 진입"}</button>
   <p className="paperExchangeDisclosure">가상자금만 사용하는 모의 선물매매입니다. 실제 자산 거래는 발생하지 않습니다.</p>
   {error&&<p className="paperExchangeError" role="alert">{error}</p>}{notice&&<p className="paperExchangeSuccess" role="status">{notice}</p>}
 </aside></div>
 <section className="paperExchangePositions"><div className="paperExchangeAccountTools"><span>순자산 {krw(state.equityKrw??available+(state.lockedMarginKrw??0))}</span><button type="button" disabled={!loggedIn||!state.resetEligible||busy} onClick={()=>begin("RESET")}>가상잔고 초기화 · 잔여 {state.remainingResets??0}회</button></div>
   <div className="paperExchangePositionTabs"><button type="button" onClick={()=>setTab("positions")} className={tab==="positions"?"selected":""}>보유 포지션 ({state.positions.length})</button><button type="button" onClick={()=>setTab("history")} className={tab==="history"?"selected":""}>체결 내역</button></div>
   {tab==="positions"?(state.positions.length?<div className="paperExchangePositionList">{state.positions.map(pos=><div className="paperExchangePositionRow" key={pos.id}><div className="paperExchangePositionMain"><b>{pos.symbol.replace("USDT","")}/USDT</b><span className={pos.side==="LONG"?"paperLongTag":"paperShortTag"}>{pos.side==="LONG"?"롱":"숏"} {pos.leverage}x</span></div><div><small>평단가</small><strong>{price(pos.entryPrice)} USDT</strong></div><div><small>증거금</small><strong>{krw(pos.marginKrw)}</strong></div><div><small>미실현 손익</small><strong className={unrealized!==null?(unrealized>=0?"paperProfit":"paperLoss"):""}>{unrealized===null?"시세 확인 중":krw(unrealized)+(pct!==null?" ("+pct.toFixed(2)+"%)":"")}</strong></div><button className="paperExchangeClose" type="button" onClick={()=>begin("CLOSE",pos.id)}>전량 청산</button></div>)}</div>:<p className="paperExchangeEmpty">보유 중인 포지션이 없습니다.</p>):(state.history.length?<div className="paperExchangePositionList">{state.history.map(h=><div className="paperExchangeHistoryRow" key={h.id}><strong>{h.symbol.replace("USDT","")}/USDT</strong><span>{h.side==="LONG"?"롱":"숏"} · {new Date(h.closedAt).toLocaleString("ko-KR")}</span><b className={h.realizedPnlKrw>=0?"paperProfit":"paperLoss"}>{h.realizedPnlKrw>=0?"+":""}{krw(h.realizedPnlKrw)}</b></div>)}</div>:<p className="paperExchangeEmpty">아직 체결 내역이 없습니다.</p>)}
 </section>
 {confirm&&<div className="paperExchangeOverlay" role="dialog" aria-modal="true" aria-label="가상 주문 확인"><div className="paperExchangeConfirm"><h3>{confirm.action==="OPEN"?"가상 주문 확인":confirm.action==="CLOSE"?"포지션 전량 청산 확인":"가상잔고 초기화 확인"}</h3><p>{confirm.action==="OPEN"?symbol.replace("USDT","")+"/USDT · "+(side==="LONG"?"롱":"숏")+" "+leverage+"배 · 증거금 "+krw(marginValue):confirm.action==="CLOSE"?"선택한 포지션을 현재 거래소 마크가격 기준으로 전량 청산합니다.":"조건을 충족하면 가상잔고를 100만원으로 재설정합니다. 과거 손실 기록은 월간 순위에 반영됩니다."}</p><small>체결 시점의 실제 조회 가격으로 계산되어 표시 가격과 차이가 발생할 수 있어요.</small><div><button type="button" disabled={busy} onClick={()=>setConfirm(null)}>취소</button><button type="button" disabled={busy} onClick={submit}>{busy?"처리 중...":"확인 및 실행"}</button></div>{error&&<p role="alert">{error}</p>}</div></div>}
 </>;
}
