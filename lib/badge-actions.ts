"use server";
import {sessionId} from "@/lib/auth";
import {badgeSchema,BADGES} from "@/lib/badges";
import {db} from "@/lib/db";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
export async function equipBadge(form:FormData){
 const member=await sessionId();if(!member)redirect("/login");
 const badge=String(form.get("badge")||"");
 if(badge&& !BADGES.some(x=>x.id===badge))redirect("/profile?badge=invalid");
 await badgeSchema();const p=await db();
 if(badge){const owned=await p.query("SELECT 1 FROM member_badges WHERE member_id=$1 AND badge_id=$2",[member,badge]);if(!owned.rowCount)redirect("/profile?badge=locked")}
 await p.query("INSERT INTO member_badge_settings(member_id,equipped_badge_id) VALUES($1,$2) ON CONFLICT(member_id) DO UPDATE SET equipped_badge_id=excluded.equipped_badge_id,updated_at=now()",[member,badge||null]);
 revalidatePath("/profile");revalidatePath("/community");redirect("/profile?badge=saved");
}
