import {db} from "@/lib/db";
import {monthKst} from "@/lib/paper";
export const BADGES=[
 {id:"first_step",name:"첫 발걸음",symbol:"👣",group:"활동",description:"첫 게시글 작성"},
 {id:"attendance_30",name:"개근왕",symbol:"📅",group:"활동",description:"30일 연속 출석 (출석제 개편 후 지급)"},
 {id:"social",name:"소통왕",symbol:"💬",group:"활동",description:"댓글 100건 달성"},
 {id:"analysis",name:"분석왕",symbol:"📊",group:"활동",description:"차트분석 글 10건 작성"},
 {id:"trading_first",name:"매매 입문",symbol:"📈",group:"투자",description:"첫 가상매매 청산"},
 {id:"profit",name:"수익 달성",symbol:"📈",group:"투자",description:"가상매매 수익 실적 검증 후 지급"},
 {id:"trading_king",name:"매매왕",symbol:"🏆",group:"투자",description:"월간 가상매매 1위"},
 {id:"champion",name:"월간 챔피언",symbol:"👑",group:"투자",description:"월간 가상매매 TOP 3"},
 {id:"bug",name:"오류 탐정",symbol:"🐞",group:"이벤트",description:"운영자 오류 제보 승인"},
 {id:"analyst",name:"분석의 달인",symbol:"🧠",group:"이벤트",description:"운영자 선정 우수 분석"},
 {id:"event",name:"이벤트 우승",symbol:"🥇",group:"이벤트",description:"이벤트 우승자 선정"},
 {id:"pioneer",name:"82coin 개척자",symbol:"✨",group:"이벤트",description:"운영자 특별 선정"},
] as const;
export type BadgeId=typeof BADGES[number]["id"];
let schema:Promise<void>|undefined;
export async function badgeSchema(){if(!schema)schema=(async()=>{const p=await db();await p.query(`CREATE TABLE IF NOT EXISTS member_badges(member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,badge_id VARCHAR(40) NOT NULL,awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),source VARCHAR(48) NOT NULL,PRIMARY KEY(member_id,badge_id));CREATE TABLE IF NOT EXISTS member_badge_settings(member_id INTEGER PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,equipped_badge_id VARCHAR(40),updated_at TIMESTAMPTZ DEFAULT now());CREATE TABLE IF NOT EXISTS member_xp_ledger(id BIGSERIAL PRIMARY KEY,member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,source TEXT NOT NULL,reference TEXT NOT NULL,amount INTEGER NOT NULL CHECK(amount>0),created_at TIMESTAMPTZ DEFAULT now(),UNIQUE(member_id,source,reference));`);})().catch(e=>{schema=undefined;throw e});await schema;}
export async function badgesFor(memberId:number){await badgeSchema();const p=await db();const result=await p.query<{badge_id:string}>("SELECT badge_id FROM member_badges WHERE member_id=$1",[memberId]);return new Set(result.rows.map(r=>r.badge_id));}
export async function profileAchievements(memberId:number){
 await badgeSchema();const p=await db();const [posts,comments,analysis,attend,watch,owned,selected,xp,rank]=await Promise.all([
 p.query<{n:number}>("SELECT count(*)::int n FROM posts WHERE member_id=$1 AND hidden=false",[memberId]),
 p.query<{n:number}>("SELECT count(*)::int n FROM comments WHERE member_id=$1",[memberId]),
 p.query<{n:number}>("SELECT count(*)::int n FROM posts WHERE member_id=$1 AND hidden=false AND category='차트분석'",[memberId]),
 p.query<{dates:string[]}>("SELECT ARRAY(SELECT DISTINCT reference FROM reward_ledger WHERE member_id=$1 AND kind='ATTENDANCE' ORDER BY reference DESC LIMIT 90) dates",[memberId]).catch(()=>({rows:[{dates:[]}]})),
 p.query("SELECT 1 FROM watchlist WHERE member_id=$1 LIMIT 1",[memberId]),
 p.query<{badge_id:string}>("SELECT badge_id FROM member_badges WHERE member_id=$1",[memberId]),
 p.query<{equipped_badge_id:string|null}>("SELECT equipped_badge_id FROM member_badge_settings WHERE member_id=$1",[memberId]),
 p.query<{xp:string}>("SELECT COALESCE(sum(amount),0)::text xp FROM member_xp_ledger WHERE member_id=$1",[memberId]),
 p.query<{rank:number}>("SELECT rank FROM paper_season_awards WHERE member_id=$1 AND month_key=$2",[memberId,monthKst()]).catch(()=>({rows:[]}))
 ]);
 const postCount=posts.rows[0].n,commentCount=comments.rows[0].n,analysisCount=analysis.rows[0].n;
 const currentEarned=new Set(owned.rows.map(x=>x.badge_id));
 const earn=(id:BadgeId,allowed:boolean)=>{if(allowed)currentEarned.add(id)};
 earn("first_step",postCount>=1);earn("social",commentCount>=100);earn("analysis",analysisCount>=10);
 const dates=attend.rows[0]?.dates||[];const dateSet=new Set(dates);let consecutive=0;const today=new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
 let cursor=new Date(today+"T00:00:00Z");if(!dateSet.has(today))cursor.setUTCDate(cursor.getUTCDate()-1);
 while(dateSet.has(cursor.toISOString().slice(0,10))&&consecutive<90){consecutive++;cursor.setUTCDate(cursor.getUTCDate()-1)}
 const progress:Record<string,string>={first_step:postCount+"/1 게시글",social:commentCount+"/100 댓글",analysis:analysisCount+"/10 분석글",attendance_30:consecutive+"/30 연속 출석",trading_first:"검증 후 자동 반영",profit:"검증 후 자동 반영",trading_king:"월간 1위",champion:"월간 TOP 3",bug:"관리자 승인",analyst:"관리자 선정",event:"이벤트 우승",pioneer:"관리자 특별 선정"};
 const levelXp=Number(xp.rows[0].xp)+Math.min(postCount,30)*20+Math.min(commentCount,100)*5;
 const level=Math.min(100,1+Math.floor(levelXp/500)),step=levelXp%500;
 const rankValue=rank.rows[0]?.rank??null;
 return {currentEarned,progress,levelXp,level,step,consecutive,selected:selected.rows[0]?.equipped_badge_id??null,rankValue,postCount,commentCount,analysisCount,watching:!!watch.rowCount};
}
export async function awardActivityBadges(memberId:number){
 const a=await profileAchievements(memberId);const p=await db();for(const id of ["first_step","social","analysis"] as BadgeId[])if(a.currentEarned.has(id))await p.query("INSERT INTO member_badges(member_id,badge_id,source) VALUES($1,$2,'activity') ON CONFLICT DO NOTHING",[memberId,id]);return a;
}
export async function equippedTitles(memberIds:number[]){
 if(!memberIds.length)return new Map<number,string>();
 await badgeSchema();const p=await db();const r=await p.query<{member_id:number;name:string}>("SELECT s.member_id,b.badge_id FROM member_badge_settings s JOIN member_badges b ON b.member_id=s.member_id AND b.badge_id=s.equipped_badge_id WHERE s.member_id=ANY($1::int[])",[memberIds]);
 const map=new Map<number,string>();for(const item of r.rows as unknown as {member_id:number;badge_id:string}[]){const badge=BADGES.find(b=>b.id===item.badge_id);if(badge)map.set(item.member_id,badge.name)}
 return map;
}
