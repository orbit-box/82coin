import Link from "next/link";
import RewardNav from "@/components/RewardNav";
import {Ticket,LockKeyhole,ArrowRight,ShieldCheck} from "lucide-react";
export const metadata={title:"82coin 룰렛 | 리워드존"};
export default function Roulette(){
 return <div className="rewardsPage roulettePage">
 <div className="rewardSubHead"><span className="eyebrow">82COIN ROULETTE</span><h1>82 룰렛</h1><p>출석으로 모은 룰렛 쿠폰을 사용할 수 있는 공간입니다.</p></div>
 <RewardNav current="/benefits/roulette"/>
 <section className="rouletteComingSoon"><div className="rouletteVisual" aria-hidden="true"><div className="rouletteWheel"><div className="rouletteWheelCenter"><img src="/82token_256.png" alt="" width="90" height="90"/></div></div></div><div className="rouletteCopy"><span className="rouletteFlag"><LockKeyhole size={15}/> 기능 준비 중</span><h2>매일 출석하고,<br/>룰렛 오픈을 기다려 주세요!</h2><p>룰렛 참여권은 출석 보상으로 받을 수 있어요. 확률·당첨 보상과 운영 기준을 검증한 뒤 정식으로 제공할 예정입니다.</p><div className="rouletteSafety"><ShieldCheck size={18}/><span>현재는 룰렛 참여·쿠폰 차감·토큰 지급이 진행되지 않습니다.</span></div><div className="rouletteLinks"><Link className="button" href="/benefits/attendance"><Ticket size={17}/> 출석체크 하러 가기</Link><Link className="subtleButton" href="/benefits/coupons">쿠폰샵 살펴보기 <ArrowRight size={16}/></Link></div></div></section>
 </div>;
}