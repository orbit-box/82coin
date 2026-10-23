import {NextResponse} from "next/server";
import {Pool} from "pg";
export const dynamic="force-dynamic";
const g=globalThis as unknown as {liquidationsPool?:Pool};
const pool=g.liquidationsPool??new Pool({connectionString:process.env.DATABASE_URL,max:3,connectionTimeoutMillis:5000});if(!g.liquidationsPool)g.liquidationsPool=pool;
export async function GET(request:Request){
 const url=new URL(request.url),hours=Number(url.searchParams.get("hours")||1),ticker=(url.searchParams.get("ticker")||"ALL").toUpperCase();
 if(![1,4,12,24].includes(hours)||!["ALL","BTC","ETH","SOL"].includes(ticker))return NextResponse.json({error:"Invalid filter"},{status:400});
 if(!process.env.DATABASE_URL)return NextResponse.json({available:false,reason:"Database not configured",items:[]},{status:503});
 try{
 const sources=await pool.query<{source:string;connected:boolean;last_heartbeat:string;last_event_at:string|null;started_at:string}>(`SELECT source,connected,last_heartbeat,last_event_at,started_at FROM collector_status ORDER BY source`);
 if(!sources.rows.length)return NextResponse.json({available:false,reason:"Collector has not started",items:[],periodHours:hours});
 const rows=await pool.query<{venue:string;position_side:string;amount:string;count:string}>(`SELECT venue,position_side,SUM(amount_usdt)::text AS amount,COUNT(*)::text AS count FROM liquidation_events WHERE occurred_at>=now()-($1::int*interval '1 hour') AND ($2='ALL' OR symbol=$2||'USDT') GROUP BY venue,position_side`,[hours,ticker]);
 const coverage=await pool.query<{source:string;observed:string}>(`SELECT source,COALESCE(SUM(connected_seconds),0)::text AS observed FROM collector_coverage WHERE minute>=date_trunc('minute',now()-($1::int*interval '1 hour')) GROUP BY source`,[hours]);
 const covered=Object.fromEntries(coverage.rows.map(r=>[r.source,Number(r.observed)]));
 const missing=await pool.query<{source:string;minute:string;connected_seconds:string}>(`SELECT source,minute,connected_seconds::text FROM collector_coverage WHERE minute>=date_trunc('minute',now()-($1::int*interval '1 hour')) AND minute<date_trunc('minute',now()) ORDER BY minute DESC`,[hours]);
 const perSource=new Map<string,Map<number,number>>();for(const row of missing.rows){const m=Date.parse(row.minute);if(Number.isFinite(m)){if(!perSource.has(row.source))perSource.set(row.source,new Map());perSource.get(row.source)!.set(m,Number(row.connected_seconds))}}
 const sourcesData=sources.rows.map(s=>{const gaps:string[]=[];const obs=perSource.get(s.source)||new Map<number,number>();const cutoff=Math.floor(Date.now()/60000)*60000;for(let i=1;i<=hours*60;i++){const minute=cutoff-i*60000;if((obs.get(minute)||0)<45)gaps.push(new Date(minute).toISOString())}const seconds=covered[s.source]||0;const percent=Math.min(100,Math.round(seconds/(hours*3600)*1000)/10);const stale=Date.now()-Date.parse(s.last_heartbeat)>45000;return {source:s.source,connected:s.connected&&!stale,coveragePct:percent,lastHeartbeat:s.last_heartbeat,lastEventAt:s.last_event_at,gapMinutes:gaps.length,recentGapStarts:gaps.slice(0,8)}});
 const totalCoverage=sourcesData.length?Math.min(...sourcesData.map(s=>s.coveragePct)):0;
 const totals={LONG:0,SHORT:0};
 const byVenue:Record<string,{LONG:number;SHORT:number}>={};
 for(const r of rows.rows){const amount=Number(r.amount);if(!Number.isFinite(amount))continue;const side=r.position_side as "LONG"|"SHORT";totals[side]+=amount;(byVenue[r.venue]??={LONG:0,SHORT:0})[side]+=amount}
 const total=totals.LONG+totals.SHORT;
 const complete=totalCoverage>=95&&sourcesData.every(s=>s.connected);
 return NextResponse.json({available:sourcesData.some(s=>s.connected),periodHours:hours,ticker,windowComplete:complete,coveragePct:totalCoverage,sources:sourcesData,byVenue,longUsd:totals.LONG,shortUsd:totals.SHORT,totalUsd:total,longPct:total>0?totals.LONG/total*100:null,shortPct:total>0?totals.SHORT/total*100:null,updatedAt:new Date().toISOString(),label:"수집기 관측 청산 규모 (실제 전체 청산액 아님)",coverageInterpretation:"각 분당 정상 연결 45초 미만이면 누락 가능 구간으로 집계합니다. 재연결 시간 동안 미수집된 청산은 복원하지 못합니다.",disclaimer:"Binance 청산 스트림은 구간별 스냅샷이므로 실제 전체 청산 총액이 아닙니다. 거래소별 관측 범위가 서로 다르고 수집 누락 가능성이 있습니다."},{headers:{"Cache-Control":"public, s-maxage=10"}});
 }catch(e){console.error("liquidation aggregation error",e);return NextResponse.json({available:false,error:"Liquidation data unavailable"},{status:503})}
}
