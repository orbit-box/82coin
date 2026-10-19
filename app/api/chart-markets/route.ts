import {NextResponse} from "next/server";
export const dynamic="force-dynamic";
type Market={market:string;korean_name:string;english_name:string;market_warning?:string};
export async function GET(){try{
 const c=new AbortController();const timer=setTimeout(()=>c.abort(),7000);
 let response:Response;try{response=await fetch("https://api.upbit.com/v1/market/all?isDetails=true",{signal:c.signal,next:{revalidate:3600},headers:{Accept:"application/json"}})}finally{clearTimeout(timer)}
 if(!response.ok)throw Error("upbit market list unavailable");
 const raw=await response.json() as Market[];
 if(!Array.isArray(raw))throw Error("invalid market list");
 const items=raw.filter(x=>/^KRW-[A-Z0-9]+$/.test(x.market)).map(x=>({ticker:x.market.slice(4),name:x.korean_name,englishName:x.english_name,market:x.market,symbol:"UPBIT:"+x.market.slice(4)+"KRW"})).sort((a,b)=>a.name.localeCompare(b.name,"ko"));
 return NextResponse.json({items,source:"Upbit KRW markets",count:items.length,updatedAt:new Date().toISOString()},{headers:{"Cache-Control":"public, s-maxage=3600, stale-while-revalidate=3600"}});
}catch{return NextResponse.json({items:[],error:"코인 목록을 불러오지 못했습니다."},{status:503})}}
