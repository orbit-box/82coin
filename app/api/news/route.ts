import {dedupeNews} from "@/lib/news-dedupe";
import {NextResponse} from "next/server";
import {readNews} from "../../../lib/news-store";
import {db} from "@/lib/db";
export const dynamic="force-dynamic";
export async function GET(){
 try{
  const pool=await db();
  const [items,status]=await Promise.all([readNews("",30),pool.query<{last_success_at:Date|null}>("SELECT last_success_at FROM news_collector_status WHERE id=1").catch(()=>({rows:[] as {last_success_at:Date|null}[]}))]);
  const success=status.rows[0]?.last_success_at;
  const lastCollectedAt=success?new Date(success).toISOString():null;
  const stale=!success||Date.now()-new Date(success).getTime()>15*60000;
  const recent=items.filter(x=>x.publishedAt&&Date.now()-Date.parse(x.publishedAt)<3*86400000&&Date.parse(x.publishedAt)<=Date.now()+60000).sort((a,b)=>Date.parse(b.publishedAt||"")-Date.parse(a.publishedAt||"")).slice(0,30);
  const unique=dedupeNews(recent).map(g=>g.article).slice(0,10);
  return NextResponse.json({items:unique,source:"저장된 뉴스",lastCollectedAt,stale,warning:stale?"뉴스 수집이 지연되고 있습니다.":null},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({items:[],error:"뉴스 저장소 조회 실패"},{status:503,headers:{"Cache-Control":"no-store"}})}
}
