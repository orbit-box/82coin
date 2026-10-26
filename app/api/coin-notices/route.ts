import {query} from "@/lib/db";
import {NextResponse} from "next/server";
import {XMLParser} from "fast-xml-parser";
export const dynamic="force-dynamic";
type Item={id:string;title:string;url:string;source:string;publishedAt:string;type:"상장"|"거래지원 종료"|"거래유의"|"기타";ticker:string|null};
const titleType=(title:string):Item["type"]=>/거래지원 종료|거래지원 중단|상장폐지/i.test(title)?"거래지원 종료":/신규 거래지원|마켓 추가|거래지원 개시|신규 상장|상장 안내/i.test(title)?"상장":/거래유의|유의종목|유의 촉구|투자유의/i.test(title)?"거래유의":"기타";
const labelKey=(title:string)=>title.toLowerCase().replace(/\([^)]*\)/g," ").replace(/[^a-z0-9가-힣]/g,"").slice(0,90);
const validDate=(value:unknown)=>{const stamp=Date.parse(String(value||""));return Number.isFinite(stamp)&&stamp<Date.now()+60000&&Date.now()-stamp<7*86400000?new Date(stamp).toISOString():null};
async function loadUpbit():Promise<Item[]>{
 const r=await query<{external_id:string;title:string;url:string;published_at:Date;type:Item["type"]}>(`SELECT external_id,title,url,published_at,type FROM exchange_announcements WHERE venue='upbit' AND published_at>now()-interval '7 days' ORDER BY published_at DESC LIMIT 40`);
 return r.rows.map(x=>({id:"upbit-"+x.external_id,title:x.title,url:x.url,source:"업비트 공식 실시간 공지",publishedAt:new Date(x.published_at).toISOString(),type:x.type,ticker:x.title.match(/\\(([A-Z0-9]{2,12})\\)/)?.[1]||null}));
}
async function loadOfficial():Promise<Item[]>{
 const c=new AbortController(),timer=setTimeout(()=>c.abort(),5500);
 try{
  const r=await fetch("https://api.bithumb.com/v1/notices?count=20",{signal:c.signal,cache:"no-store"});
  if(!r.ok)throw Error("Bithumb notices HTTP "+r.status);
  const raw=await r.json() as unknown;
  const data=raw as {data?:unknown;notices?:unknown;result?:unknown};
  const rows=Array.isArray(raw)?raw:Array.isArray(data.data)?data.data:Array.isArray((data.data as {notices?:unknown})?.notices)?(data.data as {notices:unknown[]}).notices:Array.isArray(data.notices)?data.notices:Array.isArray(data.result)?data.result:[];
  if(!rows.length)throw Error("Bithumb notices response unavailable");
  return rows.flatMap((v,i)=>{const x=v as Record<string,unknown>,title=String(x.title||x.subject||"").trim(),at=validDate(x.published_at||x.publishedAt||x.created_at||x.createdAt);
   if(!title||!at)return [];
   const type=titleType(title);
   if(type==="기타")return [];
   const candidate=String(x.url||x.link||"");
   const url=/^https:\/\/(?:[^/]+\.)?(?:bithumb\.com)(?:\/|$)/i.test(candidate)?candidate:"https://feed.bithumb.com/notice";
   const ticker=title.match(/\(([A-Z0-9]{2,12})\)/)?.[1]||null;
   return [{id:"bithumb-"+String(x.id||x.notice_id||i),title:title.slice(0,190),url,source:"빗썸 공식 공지",publishedAt:at,type,ticker}];
  });
 }finally{clearTimeout(timer)}
}
async function loadSearch():Promise<Item[]>{
 const queries=[
  'site:upbit.com/service_center/notice (거래지원 OR 상장 OR 유의) when:7d',
  'site:coinone.co.kr (거래지원 OR 거래유의 OR 거래지원종료) when:7d',
  'site:bithumb.com (거래지원 OR 마켓 추가 OR 거래유의) when:7d'
 ];
 const results=await Promise.allSettled(queries.map(async(q,j)=>{
  const c=new AbortController(),t=setTimeout(()=>c.abort(),5500);
  try{const r=await fetch("https://news.google.com/rss/search?q="+encodeURIComponent(q)+"&hl=ko&gl=KR&ceid=KR:ko",{signal:c.signal,cache:"no-store"});if(!r.ok)throw Error("RSS unavailable");
   const xml=new XMLParser({ignoreAttributes:false}).parse(await r.text()),raw=xml?.rss?.channel?.item,rows=Array.isArray(raw)?raw:raw?[raw]:[];
   return rows.flatMap((x:{title?:string;link?:string;pubDate?:string;source?:string|{"#text"?:string}},i:number)=>{const title=String(x.title||"").trim(),at=validDate(x.pubDate),url=String(x.link||"");
    if(!title||!at||!url.startsWith("https://"))return [];
    const type=titleType(title);if(type==="기타")return [];
    const source=typeof x.source==="string"?x.source:x.source?.["#text"]||["업비트","코인원","빗썸"][j];
    return [{id:"search-"+j+"-"+i,title:title.slice(0,190),url,source:source+" · 뉴스 검색",publishedAt:at,type,ticker:title.match(/\(([A-Z0-9]{2,12})\)/)?.[1]||null} as Item];
   });
  }finally{clearTimeout(t)}
 }));
 return results.flatMap(r=>r.status==="fulfilled"?r.value:[]);
}
export async function GET(){
 const results=await Promise.allSettled([loadUpbit(),loadOfficial(),loadSearch()]);
 const upbit=results[0].status==="fulfilled"?results[0].value:[],official=results[1].status==="fulfilled"?results[1].value:[],search=results[2].status==="fulfilled"?results[2].value:[];
 if(results.every(x=>x.status==="rejected"))return NextResponse.json({items:[],warning:"거래소 공지 조회가 지연되고 있습니다.",stale:true},{status:503,headers:{"Cache-Control":"no-store"}});
 const seen=new Set<string>(),items=[...upbit,...official,...search].sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)).filter(x=>{const key=labelKey(x.title);if(seen.has(key))return false;seen.add(key);return true}).slice(0,18);
 return NextResponse.json({items,source:"업비트 WebSocket 저장 공지 · 빗썸 API · 뉴스 검색",upbitFeedAvailable:results[0].status==="fulfilled",officialAvailable:results[1].status==="fulfilled",updatedAt:new Date().toISOString(),warning:results[0].status==="rejected"?"업비트 실시간 공지 저장소 연결을 확인해 주세요.":results[1].status==="rejected"?"빗썸 공지 연결이 지연되고 있습니다.":null,note:"일부 항목은 뉴스 검색 결과입니다. 실제 상장·거래지원 시각은 거래소 공식 공지 원문에서 확인해야 합니다."},{headers:{"Cache-Control":"public, s-maxage=180"}});
}
