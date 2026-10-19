"use server";
import {redirect} from "next/navigation";
import {cookies} from "next/headers";
import {query} from "./db";
import {passwordHash,verifyPassword,signSession,sessionId} from "./auth";
const clean=(v:FormDataEntryValue|null)=>String(v??"").trim();
const fail=(m:string,mode="login"):never=>redirect((mode==="register"?"/signup":"/login")+"?error="+encodeURIComponent(m));
export async function authAction(data:FormData){
 const mode=clean(data.get("mode"))==="register"?"register":"login";
 const email=clean(data.get("email")).toLowerCase(),password=String(data.get("password")||"");
 if(!/^\\S+@\\S+\\.\\S+$/.test(email)||email.length>254||password.length<8||password.length>128)fail("이메일과 8자 이상의 비밀번호를 확인해주세요.",mode);
 if(mode==="register"&&clean(data.get("consent"))!=="yes")fail("필수 약관 및 개인정보 처리방침 동의가 필요합니다.",mode);
 const found=await query<{id:number;password_hash:string}>("SELECT id,password_hash FROM members WHERE email=$1",[email]);
 let id=0;
 if(mode==="register"){
 const name=clean(data.get("name"));
 if(name.length<2||name.length>30)fail("닉네임은 2~30자로 입력해주세요.",mode);
 if(found.rows.length)fail("이미 가입된 이메일입니다.",mode);
 const duplicate=await query<{id:number}>("SELECT id FROM members WHERE lower(name)=lower($1) LIMIT 1",[name]);
 if(duplicate.rows.length)fail("이미 사용 중인 닉네임입니다.",mode);
 try{const created=await query<{id:number}>("INSERT INTO members(email,name,password_hash) VALUES ($1,$2,$3) RETURNING id",[email,name,passwordHash(password)]);id=created.rows[0].id}catch(e){const code=(e as {code?:string})?.code;fail(code==="23505"?"이미 가입된 이메일입니다.":"회원가입을 완료하지 못했습니다.",mode)}
 }else{
 if(!found.rows.length||!verifyPassword(password,found.rows[0].password_hash))fail("이메일 또는 비밀번호를 확인해주세요.");
 id=found.rows[0].id;
 }
 (await cookies()).set("82coin_session",signSession(id),{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:60*60*24*14});redirect("/community")
}
export async function logout(){(await cookies()).delete("82coin_session");redirect("/")}
const categories=["자유","종목토론","차트분석","매매복기","질문·공부"];
export async function createPost(form:FormData){const member=await sessionId();if(!member)redirect("/login");const category=clean(form.get("category")),ticker=clean(form.get("ticker")).toUpperCase(),title=clean(form.get("title")),body=clean(form.get("body"));if(!categories.includes(category)||title.length<4||title.length>160||body.length<10||body.length>12000||ticker.length>16)redirect("/community/new?error=invalid");const out=await query<{id:number}>("INSERT INTO posts(member_id,category,ticker,title,body) VALUES ($1,$2,$3,$4,$5) RETURNING id",[member,category,ticker||null,title,body]);redirect("/community/"+out.rows[0].id)}
export async function createComment(form:FormData){const member=await sessionId();if(!member)redirect("/login");const id=Number(form.get("postId")),body=clean(form.get("body"));if(!Number.isInteger(id)||id<=0||body.length<2||body.length>2000)redirect("/community");await query("INSERT INTO comments(post_id,member_id,body) VALUES($1,$2,$3)",[id,member,body]);redirect("/community/"+id)}
export async function reportPost(form:FormData){const member=await sessionId();if(!member)redirect("/login");const id=Number(form.get("postId"));if(!Number.isInteger(id)||id<=0)redirect("/community");await query("INSERT INTO reports(post_id,member_id,reason) VALUES($1,$2,$3)",[id,member,"회원 신고"]);redirect("/community/"+id)}
