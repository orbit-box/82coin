import Link from "next/link";
import RewardNav from "@/components/RewardNav";
import {sessionId} from "@/lib/auth";
import {attendanceDetails} from "@/lib/rewards";
import {attendanceAction} from "@/lib/reward-actions";
import {CalendarDays,Gift,Ticket,Flame,Check,LockKeyhole} from "lucide-react";
export const dynamic="force-dynamic";
export default async function Attendance({searchParams}:{searchParams:Promise<{status?:string;stamp?:string}>}){
 const member=await sessionId(),params=await searchParams;
 let data:Awaited<ReturnType<typeof attendanceDetails>>|null=null;
 try{data=await attendanceDetails(member)}catch{}
 const stamp=params.stamp==="1"&&data?.attended;
 return <div className="rewardsPage">
 <div className="rewardSubHead"><span className="eyebrow">DAILY CHECK-IN</span><h1>출석체크</h1><p>하루 한 번 출석하고, 7일 연속 달성하면 룰렛 쿠폰을 받으세요.</p></div>
 <RewardNav current="/benefits/attendance"/>
 {params.status&&<div className="rewardNotice" role="status">{params.status.slice(0,130)}</div>}
 <section className="attendanceMain">
 <div className="attendanceCalendar">
 <div className="attendanceSectionTitle"><div><span className="eyebrow">WEEKLY STAMP</span><h2>7일 출석 도장판</h2></div><CalendarDays color="#358FE5" size={24}/></div>
 <p className="attendanceLead">매일 출석하면 10T부터 70T까지 차곡차곡 보상이 커져요.</p>
 <div className="attendanceStampGrid">{(data?.cycle??Array.from({length:7},(_,i)=>({step:i+1,reward:(i+1)*10,complete:false,current:i===0}))).map(x=><div className={"attendanceDay "+(x.complete?"isStamped ":"")+(x.current?"isToday ":"")+(stamp&&x.complete&&x.step===((data!.streak-1)%7+1)?"justStamped":"")} key={x.step}><small>{x.step}일차</small><div className="attendanceStampMark">{x.complete?<span className="attendanceStampedCircle"><Check size={22} strokeWidth={3}/><em>출석</em></span>:x.step===7?<Gift size={23}/>:<span className="attendanceBlankCircle">82</span>}</div><b>{x.reward}T</b>{x.step===7&&<span className="attendanceGiftLabel">+ 쿠폰 1장</span>}</div>)}</div>
 <div className="attendanceCalendarBottom"><span>7일 연속 출석 <strong>총 280T + 쿠폰 1장</strong></span><span>{data&&member?data.daysUntilSeven===0?"7일 보상 달성!":`다음 쿠폰까지 ${data.daysUntilSeven}일`:"로그인 후 현황 확인"}</span></div>
 </div>
 <div className="attendanceSide"><div className="attendanceSectionTitle"><div><span className="eyebrow">TODAY'S REWARD</span><h2>오늘의 출석</h2></div><span className="attendanceTodayDate">{data?.today??"—"} KST</span></div>
 <div className="attendanceTodayAmount"><span>{data?.attended?"오늘의 출석 완료":"오늘 받을 수 있는 보상"}</span><strong>{member&&data?data.attended?"완료":`+${data.nextReward}T`:"—"}</strong></div>
 {member&&data?<form action={attendanceAction}><button className="rewardAttendButton" disabled={data.attended}>{data.attended?"오늘 출석 완료":`출석 도장 찍고 ${data.nextReward}T 받기`}</button></form>:member?<p>출석 정보를 불러오지 못했습니다.</p>:<Link className="rewardAttendButton" href="/login">로그인하고 출석하기</Link>}
 <div className="attendanceStats"><div><Flame size={17}/><span>연속 출석</span><strong>{member&&data?data.streak+"일":"—"}</strong></div><div><CalendarDays size={17}/><span>이번 달 출석</span><strong>{member&&data?data.monthCount+"일":"—"}</strong></div><div><Ticket size={17}/><span>룰렛 쿠폰</span><strong>{member&&data?data.coupons+"장":"—"}</strong></div></div>
 </div></section>
 <div className="attendanceBonus"><div className="attendanceBonusIcon"><Gift/></div><div><h3>30일 연속 출석 특별 보상</h3><p>룰렛 쿠폰 5장 + 개근왕 배지. 7일 보상 주기는 반복되지만 연속 출석 기록은 유지돼요.</p></div><span>{member&&data?Math.min(data.streak,30)+"/30일":"로그인 후 확인"}</span></div>
 <p className="rewardDisclaimer">출석일은 한국시간 기준이며, 하루라도 놓치면 다음 출석 보상은 1일차부터 시작합니다. 이미 지급된 보상은 유지됩니다. 기존 출석 내역도 연속 출석 계산에 포함됩니다. 룰렛 쿠폰 사용 기능은 아직 준비 중입니다.</p>
 </div>
}
