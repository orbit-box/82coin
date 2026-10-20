import {randomBytes,createHash,randomInt} from "node:crypto";
import {query} from "./db";
const digest=(x:string)=>createHash("sha256").update(x).digest("hex");
export const validEmail=(x:string)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x)&&x.length<=254;
export function mailReady(){return Boolean(process.env.RESEND_API_KEY&&process.env.MAIL_FROM&&process.env.AUTH_SECRET)}
export async function initTokens(){await query(`CREATE TABLE IF NOT EXISTS auth_tokens(id BIGSERIAL PRIMARY KEY,email TEXT NOT NULL,purpose TEXT NOT NULL CHECK (purpose IN ('verify','reset')),token_hash TEXT NOT NULL,expires_at TIMESTAMPTZ NOT NULL,attempts INT NOT NULL DEFAULT 0,consumed_at TIMESTAMPTZ,created_at TIMESTAMPTZ NOT NULL DEFAULT now());CREATE INDEX IF NOT EXISTS auth_tokens_lookup ON auth_tokens(email,purpose,created_at DESC)`)}

const escapeHtml=(v:string)=>v.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\\\"":"&quot;","'":"&#39;"}[c]||c));
function mailTemplate(title:string,content:string,preview:string){
 const logo="https://82coin-web-production.up.railway.app/82coin-header-logo.png";
 return `<!doctype html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
 <body style="margin:0;padding:0;background:#f3f7fc;font-family:Arial,'Malgun Gothic',sans-serif;color:#19314e;">
 <div style="display:none;font-size:1px;line-height:1px;max-height:0;opacity:0;overflow:hidden;">${escapeHtml(preview)}</div>
 <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f3f7fc;"><tr><td align="center" style="padding:38px 14px;">
 <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:540px;background:#ffffff;border:1px solid #e3edf7;border-radius:16px;">
 <tr><td align="center" style="padding:34px 24px 26px;border-bottom:1px solid #edf2f8;">
 <img src="${logo}" width="178" alt="82coin MARKET &amp; COMMUNITY" style="display:block;max-width:178px;height:auto;border:0;text-align:center;color:#358fe5;font-size:25px;font-weight:800;">
 </td></tr>
 <tr><td style="padding:36px 36px 25px;text-align:center;">
 <div style="color:#358fe5;font-size:12px;font-weight:700;letter-spacing:2px;margin-bottom:13px;">82COIN ACCOUNT SECURITY</div>
 <h1 style="margin:0 0 16px;font-size:25px;line-height:1.4;color:#172c46;">${escapeHtml(title)}</h1>
 ${content}
 </td></tr>
 <tr><td style="padding:24px 30px;text-align:center;background:#f9fbfe;border-top:1px solid #edf2f8;">
 <p style="margin:0 0 9px;font-size:12px;line-height:1.8;color:#7e8fa3;">본인이 요청하지 않은 메일이라면 별도 조치 없이 무시해 주세요.</p>
 <p style="margin:0;font-size:11px;line-height:1.7;color:#9daabd;">© 2026 82coin · MARKET &amp; COMMUNITY</p>
 </td></tr></table></td></tr></table></body></html>`;
}
function verificationHtml(code:string){
 return mailTemplate("이메일 인증번호 안내",`
 <p style="color:#61758e;font-size:14px;line-height:1.9;margin:0 0 24px;">82coin에 오신 것을 환영합니다.<br>안전한 회원가입을 위해 아래 인증번호를 입력해 주세요.</p>
 <div style="background:#edf7ff;border:1px solid #cbe6fc;border-radius:12px;padding:25px 12px;margin:0 0 21px;">
 <div style="font-size:12px;font-weight:700;color:#558ab7;margin-bottom:12px;">이메일 인증번호</div>
 <div style="font-size:34px;font-weight:800;letter-spacing:8px;color:#227fd0;font-family:Arial,sans-serif;">${escapeHtml(code)}</div>
 <div style="font-size:12px;color:#6b839a;margin-top:13px;">유효시간 10분</div>
 </div>
 <p style="font-size:12px;color:#8a9aad;line-height:1.8;margin:0;">인증번호는 타인에게 알려주지 마세요.</p>`,"82coin 회원가입 인증번호 · 10분간 유효합니다.");
}
function resetHtml(url:string){
 return mailTemplate("비밀번호 재설정 안내",`
 <p style="color:#61758e;font-size:14px;line-height:1.9;margin:0 0 25px;">비밀번호 변경 요청을 받았습니다.<br>아래 버튼을 눌러 새 비밀번호를 설정해 주세요.</p>
 <table role="presentation" align="center" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" bgcolor="#358fe5" style="border-radius:9px;">
 <a href="${escapeHtml(url)}" style="display:inline-block;padding:16px 30px;background:#358fe5;border-radius:9px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">비밀번호 재설정하기</a>
 </td></tr></table>
 <p style="font-size:12px;line-height:1.8;color:#7d91a5;margin:23px 0 0;">링크 유효시간 20분 · 한 번 사용하면 다시 사용할 수 없습니다.</p>`,"82coin 비밀번호 재설정 링크 · 20분간 유효합니다.");
}

async function sendMail(to:string,subject:string,html:string){if(!mailReady())throw Error("EMAIL_NOT_CONFIGURED");const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+process.env.RESEND_API_KEY},body:JSON.stringify({from:process.env.MAIL_FROM,to:[to],subject,html}),cache:"no-store"});if(!response.ok)throw Error("EMAIL_PROVIDER_ERROR")}
export async function newToken(email:string,purpose:"verify"|"reset",origin:string){await initTokens();const recent=await query<{id:number}>("SELECT id FROM auth_tokens WHERE email=$1 AND purpose=$2 AND created_at>now()-interval '90 seconds' LIMIT 1",[email,purpose]);if(recent.rowCount)throw Error("TOO_SOON");const code=purpose==="verify"?String(randomInt(100000,1000000)):randomBytes(32).toString("hex");const hash=digest(code+":"+email+":"+purpose+":"+process.env.AUTH_SECRET);const inserted=await query<{id:number}>("INSERT INTO auth_tokens(email,purpose,token_hash,expires_at) VALUES($1,$2,$3,now()+($4::int*interval '1 minute')) RETURNING id",[email,purpose,hash,purpose==="verify"?10:20]);try{if(purpose==="verify"){await sendMail(email,"[82coin] 이메일 인증번호",verificationHtml(code))}else{const url=origin+"/reset-password?email="+encodeURIComponent(email)+"&token="+encodeURIComponent(code);await sendMail(email,"[82coin] 비밀번호 재설정",resetHtml(url))}}catch(e){await query("DELETE FROM auth_tokens WHERE id=$1",[inserted.rows[0].id]);throw e}}
export async function validateToken(email:string,purpose:"verify"|"reset",token:string,consume:boolean){await initTokens();const hash=digest(token+":"+email+":"+purpose+":"+process.env.AUTH_SECRET);const latest=await query<{id:number;token_hash:string;attempts:number;valid:boolean}>(`SELECT id,token_hash,attempts,(expires_at>now() AND consumed_at IS NULL) AS valid FROM auth_tokens WHERE email=$1 AND purpose=$2 ORDER BY created_at DESC LIMIT 1`,[email,purpose]);const row=latest.rows[0];if(!row||!row.valid||row.attempts>=5)return false;const ok=row.token_hash===hash;if(!ok){await query("UPDATE auth_tokens SET attempts=attempts+1 WHERE id=$1",[row.id]);return false}if(consume){const r=await query("UPDATE auth_tokens SET consumed_at=now() WHERE id=$1 AND consumed_at IS NULL AND expires_at>now() RETURNING id",[row.id]);return Boolean(r.rowCount)}return true}
