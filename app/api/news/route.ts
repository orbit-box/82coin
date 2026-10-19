import {NextResponse} from "next/server";
import {XMLParser} from "fast-xml-parser";
export const dynamic="force-dynamic";
type Raw={title?:string;link?:string;pubDate?:string;source?:string|{"#text"?:string}};
const priority=[{re:/금리|FOMC|연준|파월|CPI|물가|PCE|고용지표|실업률|비농업/i,weight:5,category:"거시경제"},{re:/SEC|ETF|승인|규제|법안|관세|과세|재무부|연방준비제도/i,weight:5,category:"정책·규제"},{re:/해킹|유출|거래소 중단|파산|디페깅|청산|상장 폐지|상장폐지/i,weight:6,category:"시장 리스크"},{re:/비트코인|BTC|이더리움|ETH|리플|XRP|솔라나|SOL/i,weight:2,category:"주요 코인"}];
const noise=/가격 전망|목표가|몇 배|급등 예고|투자해야|추천 코인|전문가 추천|밈코인 추천|에어드롭 받는 법|오늘의 운세/i;
export async function GET(){try{
 const q="(비트코인 OR 암호화폐 OR 연준 OR CPI OR FOMC OR SEC OR ETF) when:2d";
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),7000);
 let r:Response;try{r=await fetch("https://news.google.com/rss/search?q="+encodeURIComponent(q)+"&hl=ko&gl=KR&ceid=KR:ko",{signal:controller.signal,next:{revalidate:300}})}finally{clearTimeout(timer)}
 if(!r.ok)throw Error("news unavailable");
 const parsed=new XMLParser({ignoreAttributes:false}).parse(await r.text());
 const sourceItems=parsed?.rss?.channel?.item as Raw|Raw[]|undefined;
 const arr=Array.isArray(sourceItems)?sourceItems:sourceItems?[sourceItems]:[];
 const cutoff=Date.now()-48*3600000;
 const seen=new Set<string>();
 const stories=arr.map(item=>{const title=String(item.title||"").slice(0,180).trim();const hits=priority.filter(p=>p.re.test(title));const category=hits.sort((a,b)=>b.weight-a.weight)[0]?.category||"기타";const score=hits.reduce((s,p)=>s+p.weight,0)+(noise.test(title)?-12:0);return {title,url:String(item.link||""),publishedAt:item.pubDate||null,source:typeof item.source==="string"?item.source:item.source?.["#text"]||"Google News",category,importanceScore:score};}).filter(item=>{if(!item.url.startsWith("https://")||item.importanceScore<4)return false;const t=Date.parse(item.publishedAt||"");if(!Number.isFinite(t)||t<cutoff)return false;const key=item.title.replace(/\s+/g,"").replace(/[-–|].{0,18}$/,"").slice(0,50);if(seen.has(key))return false;seen.add(key);return true});
 stories.sort((a,b)=>b.importanceScore-a.importanceScore||Date.parse(b.publishedAt||"")-Date.parse(a.publishedAt||""));
 const items=stories.slice(0,10);
 return NextResponse.json({items,updatedAt:new Date().toISOString(),source:"Google News RSS · 키워드 기반 선별",selection:"48시간 이내 / 거시경제·정책·규제·시장 리스크 중심 / 중복·홍보성 제목 제외",note:"자동 선별은 편집자 검증이 아니며 출처의 이용약관과 기사 원문을 확인해야 합니다."},{headers:{"Cache-Control":"public, s-maxage=300"}});
 }catch{return NextResponse.json({items:[],error:"중요 뉴스 공급처에 연결할 수 없습니다.",updatedAt:new Date().toISOString()},{status:503})}}
