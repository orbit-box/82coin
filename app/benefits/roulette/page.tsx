import Link from "next/link";
import {randomUUID} from "node:crypto";
import RewardNav from "@/components/RewardNav";
import {sessionId} from "@/lib/auth";
import {rouletteData} from "@/lib/roulette";
import {spinRoulette} from "@/lib/roulette-actions";
import {Ticket,Trophy,History,ShieldCheck} from "lucide-react";
export const dynamic="force-dynamic";
export const metadata={title:"82 룰렛 | 82coin"};
const hiddenName=(name:string)=>name.length<2?"*":name.slice(0,1)+"*".repeat(Math.min(3,name.length-1))+(name.length>3?name.slice(-1):"");
export default async function Roulette({searchParams}:{searchParams:Promise<{notice?:string}>}){
 const user=await sessionId();const data=await rouletteData(user);const params=await searchParams;
 return <div className="rewardsPage roulettePage">
 <div className="rewardSubHead"><span className="eyebrow">82COIN ROULETTE</span><h1>82 룰렛</h1><p>룰렛 쿠폰 1장으로 참여하고 82토큰에 도전해 보세요.</p></div>
 <RewardNav current="/benefits/roulette"/>
 {params.notice&&<p className="rewardNotice" role="status">{params.notice.slice(0,160)}</p>}
 <section className="rouletteComingSoon rouletteLivePanel">
  <div className="rouletteVisual" aria-hidden="true"><div className="rouletteWheel"><div className="rouletteWheelCenter"><img src="/82token_256.png" alt="" width="90" height="90"/></div></div></div>
  <div className="rouletteCopy">
   <span className="rouletteFlag"><Ticket size={15}/>{data.enabled?"82 룰렛 운영 중":"룰렛 운영 준비 중"}</span>
   <h2>{data.enabled?"오늘의 행운을 확인하세요!":"룰렛 오픈을 기다려 주세요!"}</h2>
   <p>참여할 때 쿠폰 1장이 사용되며 당첨된 토큰은 나의 토큰함으로 지급됩니다.</p>
   <div className="rouletteSafety"><ShieldCheck size={18}/><span>보유 룰렛 쿠폰 <b>{user?data.coupons:"로그인 필요"}</b>{user?"장":""} · 당첨 결과는 서버에서 결정됩니다.</span></div>
   {data.enabled&&user&&data.coupons>0?<form action={spinRoulette} className="rouletteSpinForm"><input type="hidden" name="operationId" value={randomUUID()}/><button className="button" type="submit">쿠폰 1장으로 룰렛 돌리기 →</button></form>:<div className="rouletteLinks"><Link className="button" href={user?"/benefits/attendance":"/login"}>{user?"출석체크 하러 가기":"로그인 후 참여"}</Link><Link className="subtleButton" href="/benefits/wallet">토큰함 살펴보기 →</Link></div>}
  </div>
 </section>
 <section className="rouletteWinnerSection">
  <div className="rouletteWinnerHeader"><div><span className="eyebrow">LUCKY WINNERS</span><h2>최근 당첨 내역</h2></div><span className="rouletteWinCount">총 최근 {data.recent.length}건</span></div>
  {data.top&&<div className="rouletteTopWinner"><Trophy size={23}/><strong>{hiddenName(data.top.name)}님이 최고 당첨액 {data.top.prize.toLocaleString()}T에 당첨되셨습니다!</strong><small>실제 당첨 기록 기준</small></div>}
  {data.recent.length?<div className="rouletteWinnerList">{data.recent.map(x=><div key={x.id} className="rouletteWinnerRow"><span className="rouletteWinAvatar"><Ticket size={18}/></span><div><strong>{hiddenName(x.name)}님</strong><small>{new Date(x.created_at).toLocaleString("ko-KR",{timeZone:"Asia/Seoul"})}</small></div><b>+{x.prize.toLocaleString()} T</b></div>)}</div>:<div className="rouletteHistoryEmpty"><History size={24}/><p>아직 당첨 내역이 없어요. 첫 번째 행운의 주인공이 되어보세요!</p></div>}
 </section>
 </div>;
}
