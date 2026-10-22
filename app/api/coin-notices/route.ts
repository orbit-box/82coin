import {NextResponse} from "next/server";
import {XMLParser} from "fast-xml-parser";
export const dynamic="force-dynamic";
type Item={id:string;title:string;url:string;source:string;publishedAt:string;type:"상장"|"거래지원 종료"|"거래유의"|"기타";ticker:string|null};
const regListing=/신규 거래지원|거래지원 개시|신규 상장|상장 안내|상장 예정/i;
const regDelisting=/거래지원 종료|상장폐지|거래지원 중단|거래지원 종료 예정/i;
const regCaution=/투자유의 종목|거래 유의 종목|유의종목 지정/i;
export async function GET(){try{const q="(site:upbit.com OR site:bithumb.com OR site:coinone.co.kr) (신규 거래지원 OR 상장 OR 거래지원 종료 OR 상장폐지 OR 유의종목) when:14d";const ctl=new AbortController();const timeout=setTimeout(()=>ctl.abort(),7000);
let response:Response;try{response=await fetch("https://news.google.com/rss/search?q="+encodeURIComponent(q)+"&hl=ko&gl=KR&ceid=KR:ko",{signal:ctl.signal,next:{revalidate:900}})}finally{clearTimeout(timeout)}
if(!response.ok)throw Error("RSS failed");const xml=new XMLParser({ignoreAttributes:false}).parse(await response.text());const raw=xml?.rss?.channel?.item;const entries=Array.isArray(raw)?raw:raw?[raw]:[];const seen=new Set<string>();
const items:Item[]=entries.flatMap((x:{title?:string;link?:string;pubDate?:string;source?:string|{"#text"?:string}})=>{const title=String(x.title||"").trim(),url=String(x.link||""),time=Date.parse(x.pubDate||"");if(!title||!url.startsWith("https://")||!Number.isFinite(time)||Date.now()-time>14*86400000)return [];const type=regDelisting.test(title)?"거래지원 종료":regListing.test(title)?"상장":regCaution.test(title)?"거래유의":"기타";if(type==="기타")return [];const key=title.replace(/\s/g,"").slice(0,60);if(seen.has(key))return [];seen.add(key);const match=title.match(/\(([A-Z0-9]{2,12})\)/);return [{id:key,title:title.slice(0,190),url,source:typeof x.source==="string"?x.source:x.source?.["#text"]||"공식 공지 검색",publishedAt:new Date(time).toISOString(),type,ticker:match?.[1]||null}]});
items.sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt));return NextResponse.json({items:items.slice(0,18),note:"거래소 사이트 키워드를 검색한 결과이며 공식 거래소 공지의 진위와 게시 시점을 직접 확인하지 않았습니다. 공지에 명시된 시각만 확정 정보로 간주해야 하며, 일정은 반드시 원문에서 확인하세요.",source:"Google News RSS 검색 결과 (거래소 공지 직접 API 아님)",verifiedOfficial:false},{headers:{"Cache-Control":"public, s-maxage=600"}})
}catch{return NextResponse.json({items:[],warning:"거래소 공지 수집에 연결할 수 없습니다."},{status:503})}}
