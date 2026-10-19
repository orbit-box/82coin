import {db} from "@/lib/db";
import {sessionId} from "@/lib/auth";
export const ATTENDANCE_REWARD=10;
export function kstDay(d=new Date()){return new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).format(d)}
let initialized:Promise<void>|undefined;
export async function rewardSchema(){if(!initialized)initialized=(async()=>{const p=await db();await p.query(`
CREATE TABLE IF NOT EXISTS reward_wallets(member_id INTEGER PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,balance BIGINT NOT NULL DEFAULT 0 CHECK(balance>=0),earned BIGINT NOT NULL DEFAULT 0 CHECK(earned>=0),updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS reward_ledger(id BIGSERIAL PRIMARY KEY,member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,amount BIGINT NOT NULL CHECK(amount<>0),kind TEXT NOT NULL,reference TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),UNIQUE(member_id,kind,reference));
CREATE INDEX IF NOT EXISTS reward_ledger_member_idx ON reward_ledger(member_id,created_at DESC);
CREATE TABLE IF NOT EXISTS reward_coupons(id BIGSERIAL PRIMARY KEY,title VARCHAR(100) NOT NULL,description TEXT NOT NULL DEFAULT '',cost BIGINT NOT NULL CHECK(cost>=0),stock INT NOT NULL DEFAULT 0 CHECK(stock>=0),active BOOLEAN NOT NULL DEFAULT false,created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS reward_coupon_claims(id BIGSERIAL PRIMARY KEY,coupon_id BIGINT NOT NULL REFERENCES reward_coupons(id),member_id INTEGER NOT NULL REFERENCES members(id),claim_code TEXT UNIQUE NOT NULL,claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),used_at TIMESTAMPTZ);
`);})().catch(e=>{initialized=undefined;throw e});await initialized;}
export async function rewardOverview(member:number|null){
 await rewardSchema();const p=await db();
 const coupons=await p.query<{id:number;title:string;description:string;cost:string;stock:number}>("SELECT id,title,description,cost,stock FROM reward_coupons WHERE active=true AND stock>0 ORDER BY id DESC LIMIT 12");
 if(!member)return {wallet:null,attended:false,history:[],coupons:coupons.rows};
 const [wallet,attendance,ledger]=await Promise.all([
 p.query<{balance:string;earned:string}>("SELECT balance,earned FROM reward_wallets WHERE member_id=$1",[member]),
 p.query("SELECT 1 FROM reward_ledger WHERE member_id=$1 AND kind='ATTENDANCE' AND reference=$2",[member,kstDay()]),
 p.query<{amount:string;kind:string;reference:string;created_at:Date}>("SELECT amount,kind,reference,created_at FROM reward_ledger WHERE member_id=$1 ORDER BY created_at DESC,id DESC LIMIT 10",[member])
 ]);
 return {wallet:{balance:Number(wallet.rows[0]?.balance??0),earned:Number(wallet.rows[0]?.earned??0)},attended:!!attendance.rowCount,history:ledger.rows,coupons:coupons.rows};
}
export async function claimAttendance(){
 const member=await sessionId();if(!member)throw Error("로그인이 필요합니다.");
 await rewardSchema();const p=await db(),c=await p.connect(),day=kstDay();
 try{
 await c.query("BEGIN");await c.query("INSERT INTO reward_wallets(member_id) VALUES($1) ON CONFLICT DO NOTHING",[member]);
 const insert=await c.query("INSERT INTO reward_ledger(member_id,amount,kind,reference) VALUES($1,$2,'ATTENDANCE',$3) ON CONFLICT DO NOTHING RETURNING id",[member,ATTENDANCE_REWARD,day]);
 if(!insert.rowCount){await c.query("COMMIT");return {ok:true,already:true,day};}
 await c.query("UPDATE reward_wallets SET balance=balance+$2,earned=earned+$2,updated_at=now() WHERE member_id=$1",[member,ATTENDANCE_REWARD]);
 await c.query("COMMIT");return {ok:true,already:false,day};
 }catch(e){await c.query("ROLLBACK");throw e}finally{c.release();}
}
