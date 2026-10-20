import {attendanceState,awardForStreak,kstDate,streakBefore} from "./attendance-rules.mjs";
import {db} from "@/lib/db";
import {sessionId} from "@/lib/auth";
export const ATTENDANCE_REWARD=10;
export function kstDay(d=new Date()){return kstDate(d)}
let initialized:Promise<void>|undefined;
export async function rewardSchema(){if(!initialized)initialized=(async()=>{const p=await db();await p.query(`
CREATE TABLE IF NOT EXISTS reward_wallets(member_id INTEGER PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,balance BIGINT NOT NULL DEFAULT 0 CHECK(balance>=0),earned BIGINT NOT NULL DEFAULT 0 CHECK(earned>=0),updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS reward_ledger(id BIGSERIAL PRIMARY KEY,member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,amount BIGINT NOT NULL CHECK(amount<>0),kind TEXT NOT NULL,reference TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),UNIQUE(member_id,kind,reference));
CREATE INDEX IF NOT EXISTS reward_ledger_member_idx ON reward_ledger(member_id,created_at DESC);
CREATE TABLE IF NOT EXISTS reward_coupons(id BIGSERIAL PRIMARY KEY,title VARCHAR(100) NOT NULL,description TEXT NOT NULL DEFAULT '',cost BIGINT NOT NULL CHECK(cost>=0),stock INT NOT NULL DEFAULT 0 CHECK(stock>=0),active BOOLEAN NOT NULL DEFAULT false,created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS reward_coupon_claims(id BIGSERIAL PRIMARY KEY,coupon_id BIGINT NOT NULL REFERENCES reward_coupons(id),member_id INTEGER NOT NULL REFERENCES members(id),claim_code TEXT UNIQUE NOT NULL,claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),used_at TIMESTAMPTZ);
CREATE TABLE IF NOT EXISTS reward_spin_wallets(member_id INTEGER PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,balance INTEGER NOT NULL DEFAULT 0 CHECK(balance>=0),earned INTEGER NOT NULL DEFAULT 0 CHECK(earned>=0));
CREATE TABLE IF NOT EXISTS reward_spin_ledger(id BIGSERIAL PRIMARY KEY,member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,amount INTEGER NOT NULL CHECK(amount<>0),reason TEXT NOT NULL,reference TEXT NOT NULL,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),UNIQUE(member_id,reason,reference));
CREATE INDEX IF NOT EXISTS reward_spin_member_idx ON reward_spin_ledger(member_id,created_at DESC);
`);})().catch(e=>{initialized=undefined;throw e});await initialized;}
export async function rewardOverview(member:number|null){
 await rewardSchema();const p=await db();const coupons=await p.query<{id:number;title:string;description:string;cost:string;stock:number}>("SELECT id,title,description,cost,stock FROM reward_coupons WHERE active=true AND stock>0 ORDER BY id DESC LIMIT 12");
 if(!member)return {wallet:null,attended:false,history:[],coupons:coupons.rows};
 const [wallet,attendance,ledger]=await Promise.all([
 p.query<{balance:string;earned:string}>("SELECT balance,earned FROM reward_wallets WHERE member_id=$1",[member]),
 p.query("SELECT 1 FROM reward_ledger WHERE member_id=$1 AND kind='ATTENDANCE' AND reference=$2",[member,kstDay()]),
 p.query<{amount:string;kind:string;reference:string;created_at:Date}>("SELECT amount,kind,reference,created_at FROM reward_ledger WHERE member_id=$1 ORDER BY created_at DESC,id DESC LIMIT 10",[member])
 ]);
 return {wallet:{balance:Number(wallet.rows[0]?.balance??0),earned:Number(wallet.rows[0]?.earned??0)},attended:!!attendance.rowCount,history:ledger.rows,coupons:coupons.rows};
}
export async function attendanceDetails(member:number|null){
 const today=kstDay();const empty={today,attended:false,streak:0,monthCount:0,nextStep:1,nextReward:10,coupons:null as number|null,cycle:Array.from({length:7},(_,i)=>({step:i+1,reward:(i+1)*10,complete:false,current:i===0})),stampDays:[] as string[],daysUntilSeven:7};
 if(!member)return empty;
 await rewardSchema();const p=await db();
 const [a,b,c]=await Promise.all([
 p.query<{reference:string}>("SELECT reference FROM reward_ledger WHERE member_id=$1 AND kind='ATTENDANCE' AND reference<=$2 ORDER BY reference DESC",[member,today]),
 p.query<{balance:number}>("SELECT balance FROM reward_spin_wallets WHERE member_id=$1",[member]),
 p.query<{n:number}>("SELECT count(*)::int n FROM reward_ledger WHERE member_id=$1 AND kind='ATTENDANCE' AND reference LIKE $2",[member,today.slice(0,7)+"%"])
 ]);
 const stamps=a.rows.map(r=>r.reference);const state=attendanceState(stamps,today);
 return {...state,today,monthCount:c.rows[0]?.n??0,coupons:b.rows[0]?.balance??0,stampDays:stamps};

}
export async function claimAttendance(){
 const member=await sessionId();if(!member)throw Error("로그인이 필요합니다.");
 await rewardSchema();const pool=await db(),c=await pool.connect();
 try{
 await c.query("BEGIN");
 // Serialize rewards for the same member, including duplicate concurrent requests.
 await c.query("SELECT pg_advisory_xact_lock($1)",[member]);
 const dayResult=await c.query<{day:string}>(`SELECT to_char(clock_timestamp() AT TIME ZONE 'Asia/Seoul','YYYY-MM-DD') AS day`);
 const day=dayResult.rows[0].day;
 await c.query("INSERT INTO reward_wallets(member_id) VALUES($1) ON CONFLICT DO NOTHING",[member]);
 const check=await c.query("SELECT id FROM reward_ledger WHERE member_id=$1 AND kind='ATTENDANCE' AND reference=$2",[member,day]);
 if(check.rowCount){await c.query("COMMIT");return {ok:true,already:true,day,amount:0,coupons:0};}
 const prev=await c.query<{reference:string}>("SELECT reference FROM reward_ledger WHERE member_id=$1 AND kind='ATTENDANCE' AND reference<$2 ORDER BY reference DESC",[member,day]);
 const streak=streakBefore(prev.rows.map(x=>x.reference),day)+1;
 const reward=awardForStreak(streak);const {step,amount}=reward;
 await c.query("INSERT INTO reward_ledger(member_id,amount,kind,reference) VALUES($1,$2,'ATTENDANCE',$3)",[member,amount,day]);
 await c.query("UPDATE reward_wallets SET balance=balance+$2,earned=earned+$2,updated_at=now() WHERE member_id=$1",[member,amount]);
 const couponCount=reward.coupons;
 if(couponCount){
 await c.query("INSERT INTO reward_spin_wallets(member_id) VALUES($1) ON CONFLICT DO NOTHING",[member]);
 if(reward.sevenCoupon)await c.query("INSERT INTO reward_spin_ledger(member_id,amount,reason,reference) VALUES($1,1,'ATTENDANCE_7',$2)",[member,day]);
 if(reward.thirtyCoupon)await c.query("INSERT INTO reward_spin_ledger(member_id,amount,reason,reference) VALUES($1,5,'ATTENDANCE_30',$2)",[member,day]);
 await c.query("UPDATE reward_spin_wallets SET balance=balance+$2,earned=earned+$2 WHERE member_id=$1",[member,couponCount]);
 }
 if(reward.badge){
 // An earned 30-day badge is saved permanently. No client-supplied award is accepted.
 await c.query("CREATE TABLE IF NOT EXISTS member_badges(member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,badge_id VARCHAR(40) NOT NULL,awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),source VARCHAR(48) NOT NULL,PRIMARY KEY(member_id,badge_id))");
 await c.query("INSERT INTO member_badges(member_id,badge_id,source) VALUES($1,'attendance_30','attendance') ON CONFLICT DO NOTHING",[member]);
 }
 await c.query("COMMIT");return {ok:true,already:false,day,amount,coupons:couponCount,streak};
 }catch(e){await c.query("ROLLBACK");throw e}finally{c.release()}
}
