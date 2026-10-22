import {rewardHistoryTitle,rewardHistoryDetail} from "@/lib/reward-history-label";
import Link from "next/link";
import RewardNav from "@/components/RewardNav";
import {sessionId} from "@/lib/auth";
import {rewardOverview} from "@/lib/rewards";
export const dynamic="force-dynamic";
const number=(v:unknown)=>Number(v??0).toLocaleString("ko-KR");
export default async function Wallet(){
 const member=await sessionId();
 let data:Awaited<ReturnType<typeof rewardOverview>>|null=null;
 try{data=await rewardOverview(member)}catch{}
 const balance=member&&data?number(data.wallet?.balance):"—";
 const earned=member&&data?number(data.wallet?.earned):"—";
 const history=member&&data?data.history:[];
 return <div className="rewardsPage tokenWalletPage">
  <div className="rewardSubHead"><span className="eyebrow">82 TOKEN WALLET</span><h1>나의 토큰함</h1><p>나의 리워드를 모으고, 지금까지의 활동을 확인하세요.</p></div>
  <RewardNav current="/benefits/wallet"/>
  <section className="tokenWalletHero" aria-label="82토큰 지갑 현황">
   <div className="tokenWalletHeroContent">
    <div className="tokenWalletHeroTop"><span className="tokenWalletTag"><span className="tokenWalletDot"/> MY REWARD WALLET</span><span className="tokenWalletUnit">82COIN REWARDS</span></div>
    <div className="tokenWalletHeadline"><div><p>현재 보유한 82토큰</p><div className="tokenWalletBalance"><strong>{balance}</strong><span>82T</span></div><p className="tokenWalletSubtitle">82coin 커뮤니티 활동으로 쌓이는 나만의 리워드</p></div>
      <div className="tokenWalletCoin"><span className="tokenWalletHalo"/><img src="/82token_256.png" width="176" height="176" alt="82토큰 이미지"/></div>
    </div>
    <div className="tokenWalletHeroBottom"><div><small>지금까지 누적 획득</small><strong>{earned} <span>T</span></strong></div><div className="tokenWalletHeroLinks"><Link href={member?"/benefits/attendance":"/login"}>출석체크 하기 <span aria-hidden="true">↗</span></Link><Link href="/benefits/earn">토큰 모으는 방법 <span aria-hidden="true">→</span></Link></div></div>
   </div>
  </section>
  <section className="tokenWalletQuick" aria-label="리워드 바로가기">
   <Link href="/benefits/attendance"><span className="tokenQuickIcon">✓</span><span><strong>매일 출석체크</strong><small>하루 한 번, 꾸준히 토큰 적립</small></span><span className="tokenQuickArrow">→</span></Link>
   <Link href="/benefits/coupons"><span className="tokenQuickIcon">🎟</span><span><strong>나의 쿠폰</strong><small>보유한 룰렛 쿠폰 확인</small></span><span className="tokenQuickArrow">→</span></Link>
   <Link href="/benefits/earn"><span className="tokenQuickIcon">＋</span><span><strong>토큰 획득 방법</strong><small>참여 가능한 리워드 살펴보기</small></span><span className="tokenQuickArrow">→</span></Link>
  </section>
  <section className="tokenWalletHistory"><div className="tokenHistoryHeader"><div><span className="eyebrow">TOKEN ACTIVITY</span><h2>최근 토큰 내역</h2><p>토큰이 지급되거나 사용된 기록을 확인할 수 있어요.</p></div><span className="tokenHistoryCount">최근 {history.length}건</span></div>
   {!member?<div className="tokenHistoryEmpty"><p>로그인 후 나의 토큰 내역을 확인할 수 있어요.</p><Link href="/login">로그인하기 →</Link></div>:!data?<div className="tokenHistoryEmpty">내역을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</div>:history.length?history.map((x,i)=><div className="tokenHistoryItem" key={i}><div className={"tokenHistoryMark "+(Number(x.amount)>0?"isGain":"isSpent")}>{Number(x.amount)>0?"+":"−"}</div><div className="tokenHistoryInfo"><strong>{rewardHistoryTitle(x.kind,Number(x.amount))}</strong><small>{rewardHistoryDetail(x.kind,x.reference,x.created_at)}</small></div><b className={Number(x.amount)>0?"isGain":"isSpent"}>{Number(x.amount)>0?"+":""}{number(x.amount)} T</b></div>):<div className="tokenHistoryEmpty">아직 토큰 내역이 없어요. 오늘 첫 출석으로 시작해보세요.</div>}
  </section>
  <p className="tokenWalletLegal">82토큰은 82coin 서비스 내부에서 사용하는 리워드 포인트이며 현금 환전 및 외부 전송을 지원하지 않습니다.</p>
 </div>;
}
