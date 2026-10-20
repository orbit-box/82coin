import {sessionId} from "@/lib/auth";
import {query} from "@/lib/db";
export async function adminId(){const id=await sessionId();if(!id)return null;const r=await query<{email:string;role:string}>("SELECT email,role FROM members WHERE id=$1",[id]);const u=r.rows[0];if(!u)return null;return u.role==="admin"||Boolean(process.env.ADMIN_EMAIL&&u.email.toLowerCase()===process.env.ADMIN_EMAIL.toLowerCase())?id:null}
export async function requireAdmin(){const id=await adminId();if(!id)throw Error("관리자 권한이 없습니다.");return id}
