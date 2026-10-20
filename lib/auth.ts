import {cookies} from "next/headers";
import {query} from "./db";
import {createHmac,randomBytes,scryptSync,timingSafeEqual} from "node:crypto";
export function passwordHash(pass:string){const salt=randomBytes(16).toString("hex");return salt+":"+scryptSync(pass,salt,64).toString("hex")}
export function verifyPassword(pass:string,hash:string){const [salt,secret]=hash.split(":");if(!salt||!secret)return false;const a=Buffer.from(secret,"hex"),b=scryptSync(pass,salt,64);return a.length===b.length&&timingSafeEqual(a,b)}
const secret=()=>{if(!process.env.AUTH_SECRET||process.env.AUTH_SECRET.length<32)throw Error("AUTH_SECRET missing");return process.env.AUTH_SECRET};
export function signSession(id:number){const expiry=Date.now()+1000*60*60*24*14;const data=id+"."+expiry;const mac=createHmac("sha256",secret()).update(data).digest("hex");return data+"."+mac}
export async function sessionId(){try{const token=(await cookies()).get("82coin_session")?.value;if(!token)return null;const parts=token.split(".");if(parts.length!==3)return null;const [id,expiry,signature]=parts;const data=id+"."+expiry;const expected=createHmac("sha256",secret()).update(data).digest("hex");const a=Buffer.from(signature,"hex"),b=Buffer.from(expected,"hex");if(a.length!==b.length||!timingSafeEqual(a,b)||Date.now()>Number(expiry))return null;const member=Number(id);if(!Number.isSafeInteger(member)||member<=0)return null;
const active=await query<{suspended:boolean}>("SELECT suspended FROM members WHERE id=$1",[member]);
return active.rows[0]&&!active.rows[0].suspended?member:null}catch{return null}}
