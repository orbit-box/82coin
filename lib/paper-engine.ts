import {randomUUID} from "node:crypto";
import {db} from "@/lib/db";
import {ensurePaperAccount,paperSchema,monthKst} from "@/lib/paper";
import {fetchPaperQuote,PAPER_SYMBOLS,previewPaperOrder,type PaperSymbol} from "@/lib/paper-quote";
import {paperUnrealized,PAPER_TAKER_FEE_RATE} from "@/lib/paper-math";
import type {PoolClient} from "pg";
import {readFile} from "node:fs/promises";
import {join} from "node:path";

export type PaperSide="LONG"|"SHORT";
const round=(n:number)=>Math.round((n+Number.EPSILON)*10000)/10000;
const isUuid=(s:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
let setup:Promise<void>|undefined;
async function schema(){
 if(!setup)setup=(async()=>{await paperSchema();const pool=await db();await pool.query(await readFile(join(process.cwd(),"db/migrations/20261103_paper_live_v3.sql"),"utf8"))})().catch(e=>{setup=undefined;throw e});
 await setup;
}
function assertFresh(at:string){const age=Date.now()-Date.parse(at);if(!Number.isFinite(age)||age<0||age>25000)throw Error("시세가 갱신되지 않았습니다. 다시 시도해 주세요.");}
async function lock(c:PoolClient,id:number){await c.query("SELECT pg_advisory_xact_lock($1)",[id]);}
async function audit(c:PoolClient,id:number,action:string,context:unknown){await c.query("INSERT INTO paper_audit(member_id,action,context) VALUES($1,$2,$3::jsonb)",[id,action,JSON.stringify(context)])}
async function existing(c:PoolClient,member:number,key:string){
 const r=await c.query<{response:unknown}>("SELECT response FROM paper_requests WHERE member_id=$1 AND key=$2",[member,key]);
 return r.rows.length?r.rows[0].response:null;
}
async function record(c:PoolClient,member:number,key:string,response:unknown){await c.query("INSERT INTO paper_requests(member_id,key,response) VALUES($1,$2,$3::jsonb)",[member,key,JSON.stringify(response)])}

export async function openPaperPosition(member:number,args:{symbol:string;side:PaperSide;marginKrw:number;leverage:number;requestId:string}){
 if(!isUuid(args.requestId))throw Error("주문 식별자가 올바르지 않습니다.");
 if(!PAPER_SYMBOLS.includes(args.symbol as PaperSymbol)||!["LONG","SHORT"].includes(args.side))throw Error("주문 종목이나 방향을 확인해 주세요.");
 if(!Number.isFinite(args.marginKrw)||!Number.isInteger(args.leverage))throw Error("주문 금액이나 레버리지를 확인해 주세요.");
 await ensurePaperAccount(member);await schema();
 const quote=await fetchPaperQuote(args.symbol);if(quote.stale)throw Error("최신 거래소 시세를 확인하지 못했습니다.");
 const pool=await db(),c=await pool.connect();
 try{
  await c.query("BEGIN");await lock(c,member);
  const repeat=await existing(c,member,args.requestId);if(repeat){await c.query("COMMIT");return repeat}
  assertFresh(quote.asOf);
  const a=await c.query<{balance_krw:string}>("SELECT balance_krw FROM paper_accounts WHERE member_id=$1 FOR UPDATE",[member]);
  const balance=Number(a.rows[0]?.balance_krw);
  const occupied=await c.query("SELECT id FROM paper_positions WHERE member_id=$1 AND closed_at IS NULL LIMIT 1 FOR UPDATE",[member]);
  if(occupied.rowCount)throw Error("진행 중인 포지션을 먼저 청산해 주세요.");
  const preview=previewPaperOrder({symbol:args.symbol as PaperSymbol,side:args.side,marginKrw:args.marginKrw,leverage:args.leverage},quote,balance);
  const fee=round(preview.estimatedOpeningFeeKrw),margin=round(args.marginKrw);
  const cash=round(balance-margin-fee);
  if(cash<0)throw Error("수수료를 포함한 잔고가 부족합니다.");
  const position=await c.query<{id:string}>(`INSERT INTO paper_positions(member_id,symbol,side,quantity,entry_price_usdt,leverage,margin_krw,entry_fx_krw,opening_fee_krw,opening_reference)
  VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
  [member,args.symbol,args.side,preview.quantity,quote.markUsdt,args.leverage,margin,quote.usdKrw,fee,args.requestId]);
  const id=Number(position.rows[0].id);
  await c.query("UPDATE paper_accounts SET balance_krw=$2,updated_at=now() WHERE member_id=$1",[member,cash]);
  await c.query("INSERT INTO paper_ledger(member_id,kind,amount_krw,balance_after_krw,reference_key,details) VALUES($1,'FEE',$2,$3,$4,$5::jsonb)",[member,-fee,cash,"open:"+args.requestId,JSON.stringify({positionId:id,marginReserved:margin,symbol:args.symbol})]);
  await audit(c,member,"PAPER_OPEN",{id,symbol:args.symbol,side:args.side,margin,fee,price:quote.markUsdt,fx:quote.usdKrw});
  const response={ok:true,action:"OPEN",positionId:id,entryPrice:quote.markUsdt,marginKrw:margin,feeKrw:fee,balanceKrw:cash};
  await record(c,member,args.requestId,response);await c.query("COMMIT");return response;
 }catch(e){await c.query("ROLLBACK");throw e}finally{c.release()}
}

export async function closePaperPosition(member:number,args:{positionId:number;requestId:string}){
 if(!isUuid(args.requestId)||!Number.isSafeInteger(args.positionId)||args.positionId<1)throw Error("청산 요청을 확인해 주세요.");
 await ensurePaperAccount(member);await schema();
 const pool=await db(),position=await pool.query<{symbol:string}>("SELECT symbol FROM paper_positions WHERE id=$1 AND member_id=$2",[args.positionId,member]);
 if(!position.rows.length)throw Error("포지션을 찾을 수 없습니다.");
 const quote=await fetchPaperQuote(position.rows[0].symbol);
 if(quote.stale)throw Error("최신 거래소 시세가 없어 청산할 수 없습니다.");
 const c=await pool.connect();
 try{
  await c.query("BEGIN");await lock(c,member);
  const repeat=await existing(c,member,args.requestId);if(repeat){await c.query("COMMIT");return repeat}
  assertFresh(quote.asOf);
  const p=await c.query<{id:string;symbol:string;side:PaperSide;quantity:string;entry_price_usdt:string;margin_krw:string;opening_fee_krw:string}>(`SELECT id,symbol,side,quantity,entry_price_usdt,margin_krw,opening_fee_krw FROM paper_positions WHERE id=$1 AND member_id=$2 AND closed_at IS NULL FOR UPDATE`,[args.positionId,member]);
  if(!p.rows.length)throw Error("이미 청산된 포지션입니다.");
  const pos=p.rows[0];if(pos.symbol!==quote.symbol)throw Error("거래 종목이 일치하지 않습니다.");
  const a=await c.query<{balance_krw:string}>("SELECT balance_krw FROM paper_accounts WHERE member_id=$1 FOR UPDATE",[member]);
  const quantity=Number(pos.quantity),margin=Number(pos.margin_krw),gross=round(paperUnrealized(pos.side,quantity,Number(pos.entry_price_usdt),quote.markUsdt,quote.usdKrw));
  const closingFee=round(quantity*quote.markUsdt*quote.usdKrw*PAPER_TAKER_FEE_RATE);
  const unlocked=round(Math.max(0,margin+gross-closingFee));
  const next=round(Number(a.rows[0].balance_krw)+unlocked);
  const netPnl=round(unlocked-margin-Number(pos.opening_fee_krw));
  await c.query(`UPDATE paper_positions SET closed_at=now(),closing_price_usdt=$2,realized_pnl_krw=$3,closing_fee_krw=$4,exit_fx_krw=$5,closing_reference=$6 WHERE id=$1`,[args.positionId,quote.markUsdt,netPnl,closingFee,quote.usdKrw,args.requestId]);
  await c.query("UPDATE paper_accounts SET balance_krw=$2,trading_realized_pnl_krw=trading_realized_pnl_krw+$3,updated_at=now() WHERE member_id=$1",[member,next,netPnl]);
  await c.query("INSERT INTO paper_ledger(member_id,kind,amount_krw,balance_after_krw,reference_key,details) VALUES($1,'TRADE_PNL',$2,$3,$4,$5::jsonb)",[member,round(gross-closingFee),next,"close:"+args.requestId,JSON.stringify({positionId:args.positionId,collateralReturned:unlocked,closingFee,netPnl})]);
  await c.query("UPDATE paper_season_entries SET closed_trade_count=closed_trade_count+1,last_activity_at=now() WHERE member_id=$1 AND month_key=$2",[member,monthKst()]);
  await audit(c,member,"PAPER_CLOSE",{id:args.positionId,price:quote.markUsdt,gross,closingFee,netPnl});
  const response={ok:true,action:"CLOSE",positionId:args.positionId,exitPrice:quote.markUsdt,realizedPnlKrw:netPnl,balanceKrw:next};
  await record(c,member,args.requestId,response);await c.query("COMMIT");return response;
 }catch(e){await c.query("ROLLBACK");throw e}finally{c.release()}
}

export async function paperTerminalState(member:number){
 await ensurePaperAccount(member);await schema();
 const pool=await db();
 const [a,positions,history]=await Promise.all([
  pool.query<{balance_krw:string}>("SELECT balance_krw FROM paper_accounts WHERE member_id=$1",[member]),
  pool.query<{id:string;symbol:string;side:PaperSide;quantity:string;entry_price_usdt:string;margin_krw:string;leverage:number;opened_at:Date}>(`SELECT id,symbol,side,quantity,entry_price_usdt,margin_krw,leverage,opened_at FROM paper_positions WHERE member_id=$1 AND closed_at IS NULL ORDER BY opened_at DESC LIMIT 10`,[member]),
  pool.query<{id:string;symbol:string;side:PaperSide;realized_pnl_krw:string;closed_at:Date}>(`SELECT id,symbol,side,realized_pnl_krw,closed_at FROM paper_positions WHERE member_id=$1 AND closed_at IS NOT NULL ORDER BY closed_at DESC LIMIT 20`,[member])
 ]);
 const mark=positions.rows.length?await fetchPaperQuote(positions.rows[0].symbol).then(x=>x.stale?null:{symbol:x.symbol,markUsdt:x.markUsdt,usdKrw:x.usdKrw,asOf:x.asOf}).catch(()=>null):null;
 return {balanceKrw:Number(a.rows[0].balance_krw),mark,positions:positions.rows.map(x=>({id:Number(x.id),symbol:x.symbol,side:x.side,quantity:Number(x.quantity),entryPrice:Number(x.entry_price_usdt),marginKrw:Number(x.margin_krw),leverage:x.leverage,openedAt:x.opened_at.toISOString()})),history:history.rows.map(x=>({id:Number(x.id),symbol:x.symbol,side:x.side,realizedPnlKrw:Number(x.realized_pnl_krw),closedAt:x.closed_at.toISOString()}))};
}
