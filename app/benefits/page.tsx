import Link from "next/link";
import RewardNav from "@/components/RewardNav";
import {sessionId} from "@/lib/auth";
import {rewardOverview,attendanceDetails,ATTENDANCE_REWARD,kstDay} from "@/lib/rewards";
import {db} from "@/lib/db";
import {CalendarCheck,Coins,Ticket,Gift,BookOpen,ArrowUpRight,CheckCircle2,LockKeyhole,History,Sparkles} from "lucide-react";
export const dynamic="force-dynamic";
export const metadata={title:"리워드존 | 82coin"};
const fmt=(n:number)=>n.toLocaleString("ko-KR");
async function checkInStreak(member:number){try{const pool=await db();const r=await pool.query<{reference:string}>("SELECT reference FROM reward_ledger WHERE member_id=$1 AND kind='ATTENDANCE' ORDER BY reference DESC LIMIT 90",[member]);const days=new Set(r.rows.map(x=>x.reference));const now=kstDay(),cursor=new Date(now+"T00:00:00Z");if(!days.has(now))cursor.setUTCDate(cursor.getUTCDate()-1);let count=0;while(days.has(cursor.toISOString().slice(0,10))&&count<90){count++;cursor.setUTCDate(cursor.getUTCDate()-1)}return count}catch{return null}}
export default async function RewardsHome(){
 const member=await sessionId();
 let data:Awaited<ReturnType<typeof rewardOverview>>|null=null;
 try{data=await rewardOverview(member)}catch{}
 const balance=member&&data?data.wallet?.balance??0:null;
 const earned=member&&data?data.wallet?.earned??0:null;
 const streak=member?await checkInStreak(member):null;
 const checked=member&&data?data.attended:null;
 const attendance=member?await attendanceDetails(member).catch(()=>null):null;
 const mission=[{title:"오늘의 출석체크",description:"하루 한 번 받는 출석 보상",reward:"+"+(attendance?.nextReward??ATTENDANCE_REWARD)+" T",href:"/benefits/attendance",status:checked?"완료":member?"오늘 가능":"로그인 필요",icon:CalendarCheck,enabled:true},{title:"커뮤니티 글 작성",description:"게시글 활동 보상은 악용 방지 규칙 확정 후 적용",reward:"보상 준비 중",href:"/community",status:"준비 중",icon:BookOpen,enabled:false},{title:"커뮤니티 이벤트",description:"진행 중인 보상 이벤트는 아직 없습니다",reward:"추후 공지",href:"/benefits/events",status:"준비 중",icon:Gift,enabled:false}];
 return <div className="rewardsPage rewardDashboard">
 <section className="rewardDashboardHero"><div><span className="eyebrow">82COIN REWARD ZONE</span><h1>매일 쌓이는 혜택,<br/>82coin 리워드존</h1><p>출석하고, 활동하고, 82토큰으로 혜택을 만나보세요.</p></div><div className="rewardDashboardCoin rewardTokenImage" aria-hidden="true"><img src="/82token_256.png" alt="" width="164" height="164"/></div></section>
 <RewardNav current="/benefits"/>
 <div className="rewardDashboardHeading"><div><span className="eyebrow">MY REWARDS</span><h2>나의 리워드 현황</h2></div><span>실제 회원 데이터 기준</span></div>
 <div className="rewardDashboardStats">
 <Link href={member?"/benefits/wallet":"/login"} className="rewardStatWallet"><div className="rewardStatLabel"><span>나의 82토큰</span><img className="rewardTokenInline" src="/82token_64.png" alt="" width="28" height="28"/></div><div className="rewardStatNumber">{balance===null?"—":fmt(balance)}<small>{balance===null?"로그인 후 확인":"82T"}</small></div><div className="rewardStatWalletBottom"><span>누적 획득 <b>{earned===null?"—":fmt(earned)+" T"}</b></span><span>토큰함 바로가기 <ArrowUpRight size={15}/></span></div></Link>
 <div className="rewardStatAttendance"><div className="rewardStatLabel"><span>오늘의 출석체크</span><CalendarCheck size={22}/></div><div className="rewardStatAttendanceMain"><strong>{checked?"오늘 출석 완료":"+"+(attendance?.nextReward??ATTENDANCE_REWARD)+" T"}</strong><span>{streak===null?"로그인 후 연속 출석 확인":streak+"일 연속 출석"}</span></div><div className="rewardCycleDots">{Array.from({length:7},(_,i)=><span key={i} className={streak!==null&&i<streak%7?"done":""}>{i+1}</span>)}</div><Link className="rewardStatAction" href={member?"/benefits/attendance":"/login"}>{checked?"출석 내역 확인":"출석체크 하러 가기"} <ArrowUpRight size={15}/></Link><small className="rewardCycleNote">7일 연속 출석 시 룰렛 쿠폰 1장</small></div>
 <div className="rewardStatTicket"><div className="rewardStatLabel"><span>나의 룰렛 쿠폰</span><Ticket size={22}/></div><div className="rewardTicketEmpty"><LockKeyhole size={25}/><strong>{member&&attendance?attendance.coupons+"장":"로그인 후 확인"}</strong><span>룰렛 사용 기능은 준비 중입니다.</span></div><div className="rewardStatAction rewardDisabledAction">룰렛 오픈 예정 <LockKeyhole size={14}/></div></div>
 </div>
 <div className="rewardDashboardHeading rewardSpacing"><div><span className="eyebrow">DAILY MISSION</span><h2>오늘의 리워드 미션</h2></div><Link href="/benefits/earn">토큰 획득방법 <ArrowUpRight size={15}/></Link></div>
 <div className="rewardMissionList">{mission.map(m=><div className="rewardMission" key={m.title}><div className="rewardMissionIcon"><m.icon size={23}/></div><div className="rewardMissionText"><h3>{m.title}</h3><p>{m.description}</p></div><div className="rewardMissionSide"><b>{m.reward}</b><span className={m.status==="완료"?"completed":""}>{m.status==="완료"&&<CheckCircle2 size={13}/>} {m.status}</span></div>{m.enabled?<Link className="rewardMissionGo" href={member?m.href:"/login"} aria-label={m.title+" 이동"}><ArrowUpRight size={18}/></Link>:<span className="rewardMissionPending"><LockKeyhole size={15}/></span>}</div>)}</div>
 <div className="rewardDashboardHeading rewardSpacing"><div><span className="eyebrow">EXPLORE</span><h2>리워드 서비스</h2></div></div>
 <div className="rewardServiceGrid"><Link href="/benefits/wallet" className="rewardServiceCard"><span className="rewardServiceIcon"><img src="/82token_64.png" alt="" width="34" height="34"/></span><h3>토큰함</h3><p>보유량과 최근 지급 내역을 확인하세요.</p><ArrowUpRight className="rewardServiceArrow" size={18}/></Link><Link href="/benefits/coupons" className="rewardServiceCard"><span className="rewardServiceIcon"><Ticket/></span><h3>쿠폰샵</h3><p>새로운 교환 혜택을 준비하고 있어요.</p><ArrowUpRight className="rewardServiceArrow" size={18}/></Link><Link href="/benefits/events" className="rewardServiceCard"><span className="rewardServiceIcon"><Gift/></span><h3>커뮤니티 이벤트</h3><p>다가올 미션과 이벤트를 살펴보세요.</p><ArrowUpRight className="rewardServiceArrow" size={18}/></Link><Link href="/benefits/earn" className="rewardServiceCard"><span className="rewardServiceIcon"><Sparkles/></span><h3>토큰 획득방법</h3><p>토큰을 모으는 방법과 조건을 확인하세요.</p><ArrowUpRight className="rewardServiceArrow" size={18}/></Link></div>
 <div className="rewardDashboardBottom"><section className="rewardBottomCard"><div className="rewardBottomTitle"><History size={19}/><h2>최근 토큰 획득 내역</h2></div>{!member?<p>로그인하면 나의 획득 기록이 표시됩니다.</p>:!data?<p>지급 내역을 불러오지 못했습니다.</p>:data.history.length?data.history.slice(0,4).map((x,i)=><div className="rewardBottomLedger" key={i}><span>{x.kind==="ATTENDANCE"?"출석체크":x.kind} · {x.reference}</span><b>{Number(x.amount)>0?"+":""}{fmt(Number(x.amount))} T</b></div>):<p>아직 획득 내역이 없어요. 첫 출석으로 시작해 보세요.</p>}<Link href="/benefits/wallet">모든 내역 보기 →</Link></section><section className="rewardBottomCard rewardBottomEvent"><div className="rewardBottomTitle"><Gift size={19}/><h2>이벤트 안내</h2></div><strong>새로운 보상 이벤트를 준비 중입니다</strong><p>운영 조건이 확정되면 이곳에 안내할게요.</p><Link href="/benefits/events">이벤트 안내 확인 →</Link></section></div>
 <p className="rewardDisclaimer">82토큰은 사이트 내부 포인트로 현금 환전 및 외부 전송을 지원하지 않습니다. 쿠폰 교환·룰렛 참여는 운영 정책과 기능이 확정된 뒤 제공됩니다.</p>
 </div>
}
