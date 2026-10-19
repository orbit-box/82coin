import {db} from "@/lib/db";
import {readFile} from "node:fs/promises";
import {join} from "node:path";
import type {PoolClient} from "pg";

export const PAPER_START_KRW=1000000;
export function monthKst(date=new Date()){return new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit"}).format(date)}
export function weekKst(date=new Date()){
 const day=new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date);
 const p=(key:string)=>Number(day.find(x=>x.type===key)?.value||0);
 const d=new Date(Date.UTC(p("year"),p("month")-1,p("day")));
 const offset=(d.getUTCDay()+6)%7;d.setUTCDate(d.getUTCDate()-offset);return d.toISOString().slice(0,10);
}
let schemaPromise:Promise<void>|undefined;
export async function paperSchema(){
 if(!schemaPromise)schemaPromise=(async()=>{const pool=await db();const sql=await readFile(join(process.cwd(),"db/migrations/20261019_paper_futures_v1.sql"),"utf8");await pool.query(sql)})().catch(e=>{schemaPromise=undefined;throw e});
 await schemaPromise;
}
export async function ensurePaperAccount(memberId:number){
 await paperSchema();const pool=await db();const c=await pool.connect();
 try{await c.query("BEGIN");
 await c.query("SELECT pg_advisory_xact_lock($1)",[memberId]);
 const exists=await c.query("INSERT INTO paper_accounts(member_id) VALUES ($1) ON CONFLICT DO NOTHING RETURNING member_id",[memberId]);
 if(exists.rowCount)await c.query("INSERT INTO paper_ledger(member_id,kind,amount_krw,balance_after_krw,reference_key) VALUES ($1,'INITIAL',1000000,1000000,$2)",[memberId,"initial:"+memberId]);
 await ensureSeason(c,memberId);
 await c.query("COMMIT")
 }catch(e){await c.query("ROLLBACK");throw e}finally{c.release()}
}
async function ensureSeason(c:PoolClient,memberId:number){
 const m=monthKst(),[year,month]=m.split("-").map(Number);
 const from=new Date(Date.UTC(year,month-1,0,15)),to=new Date(Date.UTC(year,month,0,15));
 await c.query("INSERT INTO paper_seasons(month_key,opens_at,closes_at) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",[m,from,to]);
 // Season baseline is measured after any trades settle at rollover. In v1 trade engine is disabled.
 await c.query("INSERT INTO paper_season_entries(month_key,member_id,start_equity_krw) SELECT $1,member_id,balance_krw FROM paper_accounts WHERE member_id=$2 ON CONFLICT DO NOTHING",[m,memberId]);
}
export async function accountSnapshot(memberId:number){
 await ensurePaperAccount(memberId);
 const pool=await db();
 const m=monthKst(),w=weekKst();
 const [a,r,e,open]=await Promise.all([
 pool.query<{balance_krw:string;cumulative_reset_adjustment_krw:string}>("SELECT balance_krw,cumulative_reset_adjustment_krw FROM paper_accounts WHERE member_id=$1",[memberId]),
 pool.query<{total:string}>("SELECT count(*)::text AS total FROM paper_resets WHERE member_id=$1 AND week_key=$2",[memberId,w]),
 pool.query<{start_equity_krw:string;reset_injections_krw:string;closed_trade_count:number}>("SELECT start_equity_krw,reset_injections_krw,closed_trade_count FROM paper_season_entries WHERE month_key=$1 AND member_id=$2",[m,memberId]),
 pool.query("SELECT 1 FROM paper_positions WHERE member_id=$1 AND closed_at IS NULL LIMIT 1",[memberId])
 ]);
 const balance=Number(a.rows[0].balance_krw),entry=e.rows[0];
 const pnl=balance-Number(entry.start_equity_krw)-Number(entry.reset_injections_krw);
 return {balance,month:m,week:w,remainingResets:Math.max(0,2-Number(r.rows[0].total)),openPositions:open.rowCount!>0,adjustedPnl:pnl,adjustedRoi:entry.start_equity_krw?100*pnl/Number(entry.start_equity_krw):0,tradeCount:entry.closed_trade_count,resetEligible:balance<=500000&&Number(r.rows[0].total)<2&&!open.rowCount};
}
export async function resetVirtualWallet(memberId:number){
 await ensurePaperAccount(memberId);const pool=await db(),c=await pool.connect();
 try{
 await c.query("BEGIN");
 const row=await c.query<{balance_krw:string}>("SELECT balance_krw FROM paper_accounts WHERE member_id=$1 FOR UPDATE",[memberId]);const balance=Number(row.rows[0].balance_krw);
 if(balance>500000)throw Error("초기화 조건은 순자산 50만원 이하입니다.");
 const positions=await c.query("SELECT 1 FROM paper_positions WHERE member_id=$1 AND closed_at IS NULL LIMIT 1",[memberId]);
 if(positions.rowCount)throw Error("열린 포지션을 모두 청산한 뒤 초기화할 수 있습니다.");
 const week=weekKst(),month=monthKst();
 const counts=await c.query("SELECT count(*)::int AS n FROM paper_resets WHERE member_id=$1 AND week_key=$2",[memberId,week]);
 if(Number(counts.rows[0].n)>=2)throw Error("이번 주 초기화 가능 횟수를 모두 사용했습니다.");
 const injection=1000000-balance;
 await c.query("UPDATE paper_accounts SET balance_krw=1000000,cumulative_reset_adjustment_krw=cumulative_reset_adjustment_krw+$2,updated_at=now() WHERE member_id=$1",[memberId,injection]);
 await c.query("UPDATE paper_season_entries SET reset_injections_krw=reset_injections_krw+$3 WHERE month_key=$1 AND member_id=$2",[month,memberId,injection]);
 await c.query("INSERT INTO paper_resets(member_id,week_key,amount_krw) VALUES ($1,$2,$3)",[memberId,week,injection]);
 await c.query("INSERT INTO paper_ledger(member_id,kind,amount_krw,balance_after_krw,details) VALUES ($1,'RESET',$2,1000000,$3::jsonb)",[memberId,injection,JSON.stringify({week,month})]);
 await c.query("INSERT INTO paper_audit(member_id,action,context) VALUES ($1,'RESET',$2::jsonb)",[memberId,JSON.stringify({week,month,injection})]);
 await c.query("COMMIT");return {success:true,injection};
 }catch(e){await c.query("ROLLBACK");throw e}finally{c.release()}
}
export async function leaderboard(){
 await paperSchema();const pool=await db();const month=monthKst();
 // Participation requires closed trades; reset deposits are excluded. Never rank idle funded accounts.
 const r=await pool.query<{member_id:number;name:string;one_liner:string;closed_trade_count:number;adjusted_pnl:string;start_equity_krw:string}>(`
 SELECT e.member_id,m.name,e.one_liner,e.closed_trade_count,
 (a.balance_krw - e.start_equity_krw - e.reset_injections_krw)::text AS adjusted_pnl,
 e.start_equity_krw::text
 FROM paper_season_entries e JOIN paper_accounts a ON a.member_id=e.member_id
 JOIN members m ON m.id=e.member_id
 WHERE e.month_key=$1 AND e.closed_trade_count>=3 AND e.one_liner_hidden=false
 AND NOT EXISTS(SELECT 1 FROM paper_positions p WHERE p.member_id=e.member_id AND p.closed_at IS NULL)
 ORDER BY (a.balance_krw-e.start_equity_krw-e.reset_injections_krw)/NULLIF(e.start_equity_krw,0) DESC, (a.balance_krw-e.start_equity_krw-e.reset_injections_krw) DESC,e.member_id ASC LIMIT 100`,[month]);
 return {month,standings:r.rows.map((x,i)=>({rank:i+1,memberId:x.member_id,nickname:x.name,message:x.one_liner,pnl:Number(x.adjusted_pnl),roi:100*Number(x.adjusted_pnl)/Number(x.start_equity_krw),trades:x.closed_trade_count}))};
}
