import Link from "next/link";
import {sessionId} from "@/lib/auth";
import {rewardOverview,ATTENDANCE_REWARD,kstDay} from "@/lib/rewards";
import {attendanceAction} from "@/lib/reward-actions";
export const dynamic="force-dynamic";
export const metadata={title:"리워드존 · 82토큰 | 82coin"};
const fmt=(n:number)=>n.toLocaleString("ko-KR");
export default async function Benefits({searchParams}:{searchParams:Promise<{status?:string}>}){
 const member=await sessionId(),params=await searchParams;
 let data:Awaited<ReturnType<typeof rewardOverview>>|null=null,error=false;
 try{data=await rewardOverview(member)}catch{error=true}
 const wallet=data?.wallet;
 return <div className="rewardsPage">
 <section className="rewardHero"><div><span className="eyebrow">82COIN REWARD ZONE</span><h1>리워드존</h1><p>활동할수록 차곡차곡 쌓이는 나만의 82토큰. 오늘의 출석부터 시작해 보세요.</p><div className="rewardHeroTags"><span>매일 출석체크</span><span>활동 리워드</span><span>회원 전용 쿠폰</span></div></div><div className="rewardHeroArt"><div className="rewardCoinCircle">82<span> TOKEN</span></div><small>82coin 내부 활동 포인트</small></div></section>
 {params.status&&<div className="rewardNotice" role="status">{params.status.slice(0,130)}</div>}
 <div className="rewardNav"><a href="#wallet">토큰함</a><a href="#checkin">출석체크</a><a href="#coupons">쿠폰</a><a href="#events">커뮤니티 이벤트</a><a href="#earn">토큰 획득방법</a></div>
 <div className="rewardTopGrid">
 <section className="rewardCard rewardWallet" id="wallet"><div className="rewardCardTitle"><h2>나의 토큰함</h2><span>82 TOKEN</span></div><p>현재 보유 토큰</p><div className="rewardAmount"><strong>{member&&!error?fmt(wallet?.balance||0):"—"}</strong><span>82T</span></div><div className="rewardWalletFoot"><div><small>누적 획득</small><b>{member&&!error?fmt(wallet?.earned||0)+" T":"—"}</b></div><Link href={member?"/profile":"/login"}>{member?"내 계정 보기 →":"로그인하고 시작하기 →"}</Link></div></section>
 <section className="rewardCard" id="checkin"><div className="rewardCardTitle"><h2>오늘의 출석체크</h2><span className="rewardMiniBadge">DAILY</span></div><p>하루 한 번, 출석할 때마다 82토큰을 모아보세요.</p><div className="rewardAttend"><div className="rewardAttendIcon">✓</div><div><strong>+{ATTENDANCE_REWARD} 82T</strong><small>매일 첫 출석 보상 · {kstDay()} (KST)</small></div></div>{error?<p className="rewardMuted">리워드 정보를 확인할 수 없습니다.</p>:member?<form action={attendanceAction}><button className="rewardAttendButton" disabled={data?.attended}>{data?.attended?"오늘 출석 완료":"오늘 출석하고 10토큰 받기"}</button></form>:<Link className="rewardAttendButton" href="/login">로그인하고 출석하기</Link>}</section>
 </div>
 <div className="rewardSectionHead" id="coupons"><div><h2>토큰 쿠폰샵</h2><p>모은 82토큰으로 이용할 수 있는 회원 혜택을 만나보세요.</p></div><span>쿠폰 준비 중</span></div>
 {data?.coupons.length?<div className="rewardCouponGrid">{data.coupons.map(c=><article className="rewardCoupon" key={c.id}><span className="rewardCouponIcon">82</span><h3>{c.title}</h3><p>{c.description}</p><strong>{fmt(Number(c.cost))} T</strong><small>재고 {c.stock}개 · 교환 기능 준비 중</small></article>)}</div>:<div className="rewardEmptyCoupon"><div>🎟️</div><h3>첫 번째 쿠폰을 준비하고 있어요</h3><p>이용 조건과 수량이 확정되면 쿠폰을 공개합니다. 아직 교환 가능한 쿠폰은 없습니다.</p></div>}
 <div className="rewardSectionHead" id="events"><div><h2>커뮤니티 이벤트</h2><p>82coin 회원들과 함께 참여할 이벤트를 준비하고 있습니다.</p></div></div>
 <div className="rewardEventGrid"><article className="rewardEvent"><span>COMING SOON</span><h3>커뮤니티 참여 이벤트</h3><p>참여 방법과 보상 기준이 확정되면 공개됩니다.</p><Link href="/community">커뮤니티 둘러보기 →</Link></article><article className="rewardEvent"><span>COMING SOON</span><h3>가상매매 챔피언십 이벤트</h3><p>가상매매 랭킹과 연계한 이벤트는 공정성 검증 후 안내됩니다.</p><Link href="/paper-trading">챔피언십 확인하기 →</Link></article></div>
 <div className="rewardSectionHead" id="earn"><div><h2>82토큰 획득방법</h2><p>확정된 보상부터 투명하게 안내합니다.</p></div></div>
 <div className="rewardEarnGrid"><div className="rewardEarn"><span>01</span><div><h3>매일 출석체크</h3><p>하루 1회 출석하면 자동 지급</p></div><b>+10 T</b></div><div className="rewardEarn"><span>02</span><div><h3>커뮤니티 이벤트</h3><p>이벤트별 지급 조건 및 일정 추후 안내</p></div><b>준비 중</b></div><div className="rewardEarn"><span>03</span><div><h3>활동 보상</h3><p>글·댓글 보상은 악용 방지 규칙 확정 후 제공</p></div><b>준비 중</b></div></div>
 {member&&!!data?.history.length&&<section className="rewardHistory"><h2>최근 토큰 내역</h2>{data.history.map((x,i)=><div key={i}><span>{x.kind==="ATTENDANCE"?"출석체크":x.kind} · {x.reference}</span><b>{Number(x.amount)>0?"+":""}{fmt(Number(x.amount))} T</b></div>)}</section>}
 <p className="rewardDisclaimer">82토큰은 82coin 웹사이트 내부에서 사용하는 비금융 포인트입니다. 블록체인 암호화폐가 아니며 현금 환전, 외부 전송, 거래소 상장 및 투자 수익을 보장하지 않습니다. 향후 쿠폰 사용 조건은 별도 공지합니다.</p>
 </div>
}
