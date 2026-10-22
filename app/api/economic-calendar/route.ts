import {NextResponse} from "next/server";
export const dynamic="force-dynamic";
type Event={id:string;title:string;category:string;priority:"high"|"medium";dateTime:string;dateLabel:string;timeLabel:string;source:string;url:string;status:"confirmed-date"};
const kstDate=new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul",month:"long",day:"numeric",weekday:"short",hour:"2-digit",minute:"2-digit",hour12:false});
function display(instant:Date){
 const parts=kstDate.formatToParts(instant),get=(type:string)=>parts.find(x=>x.type===type)?.value||"";
 return {dateLabel:get("month")+" "+get("day")+" ("+get("weekday")+")",timeLabel:get("hour")+":"+get("minute")+" KST"};
}
function zoneInstant(y:number,m:number,d:number,h:number,min:number,zone:string){
 const guess=Date.UTC(y,m-1,d,h,min);
 const parts=new Intl.DateTimeFormat("en-US",{timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date(guess));
 const read=(type:string)=>Number(parts.find(x=>x.type===type)?.value);
 const local=Date.UTC(read("year"),read("month")-1,read("day"),read("hour"),read("minute"));
 return new Date(guess-(local-guess));
}
function parseIcsDate(raw:string,key:string){
 const m=raw.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z?)/);
 if(!m)return null;
 const [y,month,day,h,min]=m.slice(1,6).map(Number);
 return m[7]==="Z"?new Date(Date.UTC(y,month-1,day,h,min)):zoneInstant(y,month,day,h,min,key.includes("TZID=")?key.split("TZID=")[1]?.split(";")[0]||"America/New_York":"America/New_York");
}
function blsEntries(ics:string){
 const unfolded=ics.replace(/\r?\n[ \t]/g,""),blocks=unfolded.split("BEGIN:VEVENT").slice(1);
 const now=Date.now();
 return blocks.flatMap((block,i)=>{
  const lines=block.split(/\r?\n/),summary=lines.find(x=>x.startsWith("SUMMARY"))?.split(":").slice(1).join(":")||"";
  const start=lines.find(x=>x.startsWith("DTSTART")),key=start?.split(":")[0]||"",date=start?parseIcsDate(start.split(":").slice(1).join(":"),key):null;
  if(!date||!Number.isFinite(date.getTime())||date.getTime()<=now||date.getTime()>now+370*86400000)return [];
  const summaryLow=summary.toLowerCase();
  const c=summaryLow.includes("consumer price index")?"CPI":summaryLow.includes("producer price index")?"PPI":summaryLow.includes("employment situation")?"고용":null;
  if(!c)return [];
  const formatted=display(date),url=c==="CPI"?"https://www.bls.gov/schedule/news_release/cpi.htm":c==="PPI"?"https://www.bls.gov/schedule/news_release/ppi.htm":"https://www.bls.gov/schedule/news_release/empsit.htm";
  return [{id:"bls-"+i+"-"+date.getTime(),title:c==="CPI"?"미국 소비자물가지수 CPI":c==="PPI"?"미국 생산자물가지수 PPI":"미국 비농업 고용보고서",category:c,priority:c==="PPI"?"medium" as const:"high" as const,dateTime:date.toISOString(),dateLabel:formatted.dateLabel,timeLabel:formatted.timeLabel,source:"BLS 공식 iCalendar",url,status:"confirmed-date" as const}];
 });
}
function fomc(){
 // FOMC meeting dates verified against the Federal Reserve 2026 calendar.
 // 2 PM ET on the second day; independently re-check official date changes.
 const meetings=[[2026,10,28],[2026,12,9]];
 return meetings.map(([y,m,d])=>{const instant=zoneInstant(y,m,d,14,0,"America/New_York"),v=display(instant);
 return {id:"fomc-"+y+"-"+m,title:"미국 FOMC 금리 결정",category:"FOMC",priority:"high" as const,dateTime:instant.toISOString(),dateLabel:v.dateLabel,timeLabel:v.timeLabel,source:"Federal Reserve 2026 회의 일정",url:"https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",status:"confirmed-date" as const}});
}
export async function GET(){
 let bls:Event[]=[];let feedAvailable=false;
 try{
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),7000);
  let response:Response;try{response=await fetch("https://www.bls.gov/schedule/news_release/bls.ics",{cache:"no-store",signal:ctl.signal,headers:{"User-Agent":"82coin-market-calendar/1.0"}})}finally{clearTimeout(timer)}
  if(!response.ok)throw Error("BLS "+response.status);
  const raw=await response.text();if(!raw.includes("BEGIN:VCALENDAR"))throw Error("invalid ICS");
  bls=blsEntries(raw);feedAvailable=true;
 }catch(e){console.warn("economic calendar BLS feed unavailable",e instanceof Error?e.message:"unknown")}
 const items=[...fomc(),...bls].filter(x=>Date.parse(x.dateTime)>Date.now()).sort((a,b)=>Date.parse(a.dateTime)-Date.parse(b.dateTime));
 return NextResponse.json({items,timezone:"Asia/Seoul",source:feedAvailable?"BLS 공식 iCalendar + Federal Reserve 회의 일정":"Federal Reserve 회의 일정 (BLS 자동 일정 연결 실패)",blsFeedAvailable:feedAvailable,updatedAt:new Date().toISOString(),note:feedAvailable?"BLS 일정은 공식 피드에서 조회합니다. FOMC는 공식 회의 일정 기준이며 변경 가능성이 있습니다.":"BLS 일정 수집이 실패해 CPI·PPI·고용 일정을 표시하지 않습니다. 정확한 일정은 BLS 공식 사이트에서 확인하세요."},{headers:{"Cache-Control":"public, s-maxage=900"}});
}
