import {dedupeNews} from "@/lib/news-dedupe";
import {NextResponse} from "next/server";
import {readNews} from "../../../../lib/news-store";
import {db} from "@/lib/db";
export const dynamic="force-dynamic";
export async function GET(){
 try{
  const pool=await db();
  const [rows,status]=await Promise.all([
   readNews("",100),
   pool.query<{last_success_at:Date|null;last_attempt_at:Date|null;error:string|null;inserted:number}>("SELECT last_success_at,last_attempt_at,error,inserted FROM news_collector_status WHERE id=1").catch(()=>({rows:[] as {last_success_at:Date|null;last_attempt_at:Date|null;error:string|null;inserted:number}[]}))
  ]);
  const last=status.rows[0],lastSuccess=last?.last_success_at?new Date(last.last_success_at).getTime():0;
  const stale=!lastSuccess||Date.now()-lastSuccess>15*60*1000;
  const items=rows.filter(x=>x.publishedAt&&Date.parse(x.publishedAt)<=Date.now()+60000&&Date.now()-Date.parse(x.publishedAt)<3*86400000);
  const unique=dedupeNews(items).map(g=>g.article);
  return NextResponse.json({items:unique,source:"저장된 암호화폐 뉴스",lastCollectedAt:lastSuccess?new Date(lastSuccess).toISOString():null,collectorStatus:stale?"delayed":"running",stale,updatedAt:new Date().toISOString(),warning:stale?"뉴스 수집이 지연되고 있습니다. 마지막 저장된 기사를 표시합니다.":null},{headers:{"Cache-Control":"no-store"}});
 }catch(e){console.error("news archive unavailable",e);return NextResponse.json({items:[],error:"현재 뉴스 데이터를 확인할 수 없습니다.",stale:true},{status:503,headers:{"Cache-Control":"no-store"}})}
}
