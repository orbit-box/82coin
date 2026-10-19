import {NextResponse} from "next/server";
export const dynamic="force-dynamic";
type Event={id:string;title:string;category:string;priority:"high"|"medium";dateTime:string|null;dateLabel:string;timeLabel:string;source:string;url:string;status:"confirmed-date"|"date-only"};
// Official schedules: FOMC 2026 meeting calendar, BLS November 2026 release schedule.
// All clock times are KST; BLS publishes 08:30 US Eastern, converted with DST.
const events:Event[]=[
{id:"fomc-2026-10",title:"미국 FOMC 금리 결정 회의",category:"FOMC",priority:"high",dateTime:"2026-10-29T03:00:00+09:00",dateLabel:"10월 29일 (목)",timeLabel:"03:00 KST · 미국 10/28",source:"Federal Reserve",url:"https://www.federalreserve.gov/newsevents/2026-october.htm",status:"confirmed-date"},
{id:"nfp-2026-11",title:"미국 비농업 고용보고서 (10월)",category:"고용",priority:"high",dateTime:"2026-11-06T22:30:00+09:00",dateLabel:"11월 6일 (금)",timeLabel:"22:30 KST",source:"BLS",url:"https://www.bls.gov/schedule/2026/11_sched_list.htm",status:"confirmed-date"},
{id:"cpi-2026-11",title:"미국 소비자물가지수 CPI (10월)",category:"CPI",priority:"high",dateTime:"2026-11-10T22:30:00+09:00",dateLabel:"11월 10일 (화)",timeLabel:"22:30 KST",source:"BLS",url:"https://www.bls.gov/schedule/news_release/cpi.htm",status:"confirmed-date"},
{id:"ppi-2026-11",title:"미국 생산자물가지수 PPI (10월)",category:"PPI",priority:"medium",dateTime:"2026-11-13T22:30:00+09:00",dateLabel:"11월 13일 (금)",timeLabel:"22:30 KST",source:"BLS",url:"https://www.bls.gov/schedule/2026/11_sched_list.htm",status:"confirmed-date"},
{id:"fomc-2026-12",title:"미국 FOMC 금리 결정 회의",category:"FOMC",priority:"high",dateTime:"2026-12-10T04:00:00+09:00",dateLabel:"12월 10일 (목)",timeLabel:"04:00 KST · 미국 12/09",source:"Federal Reserve",url:"https://www.federalreserve.gov/newsevents/2026-december.htm",status:"confirmed-date"},
{id:"cpi-2026-12",title:"미국 소비자물가지수 CPI (11월)",category:"CPI",priority:"high",dateTime:"2026-12-10T22:30:00+09:00",dateLabel:"12월 10일 (목)",timeLabel:"22:30 KST",source:"BLS",url:"https://www.bls.gov/schedule/news_release/cpi.htm",status:"confirmed-date"}];
export async function GET(){const now=Date.now();const upcoming=events.filter(e=>e.dateTime&&Date.parse(e.dateTime)>now).sort((a,b)=>Date.parse(a.dateTime||"")-Date.parse(b.dateTime||""));
return NextResponse.json({items:upcoming,timezone:"Asia/Seoul",source:"미 연준·BLS 공식 발표 일정",lastVerified:"2026-10-19",note:"공식 일정 변경 가능. FOMC 발표시간은 미 연준 월간 일정의 오후 2시 미국 동부시간을 한국시간으로 변환했습니다. 업데이트가 필요한 정적 검증 일정입니다."},{headers:{"Cache-Control":"public, s-maxage=1800"}})}
