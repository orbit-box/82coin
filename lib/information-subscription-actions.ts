"use server";
import {sessionId} from "@/lib/auth";
import {db} from "@/lib/db";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";

export const SUBSCRIPTION_COINS=["BTC","ETH","XRP","SOL","DOGE","ADA","LINK","AVAX","SUI","TRX"] as const;
export const SUBSCRIPTION_ALERTS=["coin_news","price_move","price_target","economic_calendar","market_brief"] as const;
export async function subscriptionSchema(){
 const pool=await db();
 await pool.query(`CREATE TABLE IF NOT EXISTS information_subscriptions(
 member_id INTEGER PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
 coins TEXT[] NOT NULL DEFAULT '{}'::text[],
 alerts TEXT[] NOT NULL DEFAULT '{}'::text[],
 channel TEXT NOT NULL DEFAULT 'telegram' CHECK (channel IN ('telegram','kakao')),
 frequency TEXT NOT NULL DEFAULT 'important' CHECK (frequency IN ('important','daily')),
 enabled BOOLEAN NOT NULL DEFAULT true,
 connected BOOLEAN NOT NULL DEFAULT false,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
 )`);
}
export async function saveInformationSubscription(form:FormData){
 const member=await sessionId();
 if(!member)redirect("/login");
 const coins=[...new Set(form.getAll("coins").map(String))].filter(x=>(SUBSCRIPTION_COINS as readonly string[]).includes(x));
 const alerts=[...new Set(form.getAll("alerts").map(String))].filter(x=>(SUBSCRIPTION_ALERTS as readonly string[]).includes(x));
 const channel=String(form.get("channel")||"telegram");
 const frequency=String(form.get("frequency")||"important");
 const enabled=form.get("enabled")==="on";
 if(coins.length>10||alerts.length>5||!["telegram","kakao"].includes(channel)||!["important","daily"].includes(frequency))redirect("/information-subscription?notice=invalid");
 if(enabled&&(!coins.length||!alerts.length))redirect("/information-subscription?notice=empty");
 await subscriptionSchema();
 const pool=await db();
 await pool.query(`INSERT INTO information_subscriptions(member_id,coins,alerts,channel,frequency,enabled,connected,updated_at)
 VALUES($1,$2,$3,$4,$5,$6,false,now())
 ON CONFLICT(member_id) DO UPDATE SET coins=EXCLUDED.coins,alerts=EXCLUDED.alerts,
 channel=EXCLUDED.channel,frequency=EXCLUDED.frequency,enabled=EXCLUDED.enabled,
 connected=CASE WHEN information_subscriptions.channel=EXCLUDED.channel THEN information_subscriptions.connected ELSE false END,
 updated_at=now()`,[member,coins,alerts,channel,frequency,enabled]);
 revalidatePath("/information-subscription");
 redirect("/information-subscription?notice=saved");
}
