import {NextResponse} from "next/server";
import {readNews,ingestNews,lastNewsRefresh,fetchCuratedNews} from "../../../../lib/news-store";
export const dynamic="force-dynamic";
export async function GET(){
 try{
  let refreshFailed=false;
  if(Date.now()-lastNewsRefresh()>5*60*1000){
   try{await ingestNews()}catch(e){refreshFailed=true;console.warn("82coin news refresh failed",e instanceof Error?e.message:"unknown")}
  }
  const rows=await readNews("",100);
  const recent=rows.filter(x=>x.publishedAt&&Date.now()-Date.parse(x.publishedAt)<7*86400000&&Date.parse(x.publishedAt)<=Date.now()+60000);
  if(recent.length)return NextResponse.json({items:recent,updatedAt:new Date().toISOString(),refreshFailed,source:"Google News RSS / 저장 뉴스",stale:refreshFailed},{headers:{"Cache-Control":"no-store"}});
  const fallback=(await fetchCuratedNews()).filter(x=>x.publishedAt&&Date.now()-Date.parse(x.publishedAt)<7*86400000);
  return NextResponse.json({items:fallback,updatedAt:new Date().toISOString(),refreshFailed,source:"Google News RSS",stale:false},{headers:{"Cache-Control":"no-store"}});
 }catch(e){console.error("82coin news archive error",e);return NextResponse.json({items:[],error:"현재 검증 가능한 뉴스가 없습니다.",stale:true},{status:503,headers:{"Cache-Control":"no-store"}})}
}
