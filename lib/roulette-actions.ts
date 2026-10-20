"use server";
import {randomInt} from "node:crypto";
import {sessionId} from "@/lib/auth";
import {db} from "@/lib/db";
import {rouletteSchema,PRIZES,validOdds} from "@/lib/roulette";
import {revalidatePath} from "next/cache";
export type SpinResult={ok:boolean;prize?:number;message:string};
export async function spinRouletteAnimated(key:string):Promise<SpinResult>{
 const member=await sessionId();if(!member)return {ok:false,message:"로그인이 필요합니다."};
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key))return {ok:false,message:"다시 시도해주세요."};
 await rouletteSchema();
 const pool=await db(),c=await pool.connect();let notice="룰렛 진행에 실패했습니다.";let prizeResult:number|undefined;let already=false;
 try{
 await c.query("BEGIN");
 await c.query("SELECT pg_advisory_xact_lock($1)",[member]);
 const reference="roulette:"+key;
 const prior=await c.query<{member_id:number;prize:number}>("SELECT member_id,prize FROM reward_roulette_spins WHERE reference=$1",[reference]);
 if(prior.rowCount){
  if(prior.rows[0].member_id!==member)throw Error("요청이 올바르지 않습니다.");
  await c.query("COMMIT");already=true;prizeResult=prior.rows[0].prize;notice="이미 처리된 룰렛입니다. 당첨 내역을 확인해주세요.";
 }else{
  const settings=await c.query<{probabilities:Record<string,number>;enabled:boolean}>("SELECT probabilities,enabled FROM admin_roulette_drafts WHERE id=1");
  if(!settings.rows[0]?.enabled||!validOdds(settings.rows[0].probabilities))throw Error("룰렛이 현재 비활성 상태입니다.");
  const spin=await c.query<{balance:number}>("SELECT balance FROM reward_spin_wallets WHERE member_id=$1 FOR UPDATE",[member]);
  if(!spin.rows[0]||spin.rows[0].balance<1)throw Error("룰렛 쿠폰이 부족합니다. 출석체크로 획득해주세요.");
  const chance=randomInt(100);let cumulative=0;let prize=1;
  for(const n of PRIZES){cumulative+=settings.rows[0].probabilities[String(n)];if(chance<cumulative){prize=n;break}}
  await c.query("INSERT INTO reward_wallets(member_id) VALUES($1) ON CONFLICT DO NOTHING",[member]);
  await c.query("SELECT balance FROM reward_wallets WHERE member_id=$1 FOR UPDATE",[member]);
  await c.query("INSERT INTO reward_roulette_spins(member_id,prize,reference) VALUES($1,$2,$3)",[member,prize,reference]);
  await c.query("INSERT INTO reward_spin_ledger(member_id,amount,reason,reference) VALUES($1,-1,'ROULETTE',$2)",[member,reference]);
  await c.query("UPDATE reward_spin_wallets SET balance=balance-1 WHERE member_id=$1 AND balance>=1",[member]);
  await c.query("INSERT INTO reward_ledger(member_id,amount,kind,reference) VALUES($1,$2,'ROULETTE',$3)",[member,prize,reference]);
  await c.query("UPDATE reward_wallets SET balance=balance+$2,earned=earned+$2,updated_at=now() WHERE member_id=$1",[member,prize]);
  await c.query("COMMIT");prizeResult=prize;notice="축하합니다! "+prize.toLocaleString()+"T에 당첨되었습니다.";
 }
 }catch(e){await c.query("ROLLBACK");notice=e instanceof Error?e.message:"룰렛 오류"}finally{c.release()}
 revalidatePath("/benefits/roulette");revalidatePath("/benefits/wallet");revalidatePath("/benefits");revalidatePath("/profile");
 return {ok:prizeResult!==undefined,prize:already?undefined:prizeResult,message:notice};
}
