import {db} from "@/lib/db";
import {rewardSchema} from "@/lib/rewards";
export const PRIZES=[1,10,100,500,1000] as const;
export type Odds=Record<string,number>;
export const DEFAULT_ODDS:Odds={"1":50,"10":30,"100":14,"500":5,"1000":1};
export async function rouletteSchema(){
 await rewardSchema();
 const pool=await db();
 await pool.query(`CREATE TABLE IF NOT EXISTS admin_roulette_drafts(
 id SMALLINT PRIMARY KEY CHECK(id=1),
 probabilities JSONB NOT NULL,
 enabled BOOLEAN NOT NULL DEFAULT false,
 updated_by INTEGER REFERENCES members(id),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
 CREATE TABLE IF NOT EXISTS reward_roulette_spins(
 id BIGSERIAL PRIMARY KEY,
 member_id INTEGER NOT NULL REFERENCES members(id),
 prize INTEGER NOT NULL CHECK(prize>0),
 reference TEXT NOT NULL UNIQUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
 );
 CREATE INDEX IF NOT EXISTS reward_roulette_spins_recent_idx ON reward_roulette_spins(created_at DESC,id DESC);`);
}
export function validOdds(v:unknown):v is Odds{
 if(!v||typeof v!=="object")return false;
 const odds=v as Record<string,unknown>;
 return Object.keys(odds).length===5&&PRIZES.every(n=>Number.isInteger(odds[String(n)])&&Number(odds[String(n)])>=0&&Number(odds[String(n)])<=100)&&PRIZES.reduce((a,n)=>a+Number(odds[String(n)]),0)===100;
}
export async function rouletteData(member:number|null){
 await rouletteSchema();const pool=await db();
 const [settings,latest,top,coupons]=await Promise.all([
 pool.query<{probabilities:Odds;enabled:boolean}>("SELECT probabilities,enabled FROM admin_roulette_drafts WHERE id=1"),
 pool.query<{id:string;name:string;prize:number;created_at:Date}>("SELECT s.id::text,m.name,s.prize,s.created_at FROM reward_roulette_spins s JOIN members m ON m.id=s.member_id ORDER BY s.id DESC LIMIT 12"),
 pool.query<{id:string;name:string;prize:number;created_at:Date}>("SELECT s.id::text,m.name,s.prize,s.created_at FROM reward_roulette_spins s JOIN members m ON m.id=s.member_id ORDER BY s.prize DESC,s.id DESC LIMIT 1"),
 member?pool.query<{balance:number}>("SELECT balance FROM reward_spin_wallets WHERE member_id=$1",[member]):Promise.resolve({rows:[] as {balance:number}[]})
 ]);
 const odds=settings.rows[0]?.probabilities??DEFAULT_ODDS;
 return {enabled:!!settings.rows[0]?.enabled&&validOdds(odds),odds:validOdds(odds)?odds:DEFAULT_ODDS,coupons:coupons.rows[0]?.balance??0,recent:latest.rows,top:top.rows[0]??null};
}
