"use client";
import {useState} from "react";
import Link from "next/link";
import {useFormStatus} from "react-dom";
import {authAction} from "@/lib/actions";
import {Eye,EyeOff,ArrowRight,Check} from "lucide-react";
function Submit({register}:{register:boolean}){const {pending}=useFormStatus();return <button className="authPrimary" type="submit" disabled={pending}>{pending?"처리 중입니다…":register?"회원가입":"로그인"} {!pending&&<ArrowRight size={18} aria-hidden="true"/>}</button>}
export default function AuthForm({register,error}:{register:boolean;error?:string}){
const [show,setShow]=useState(false),[password,setPassword]=useState(""),[confirm,setConfirm]=useState(""),[agreed,setAgreed]=useState(false);
const mismatch=register&&confirm.length>0&&password!==confirm;
return <section className="authPage"><div className="authInner">
 <div className="authBrand"><span className="authBrandMark">82</span><span>82coin</span></div>
 <div className="authIntro"><span className="eyebrow">82COIN ACCOUNT</span><h1>{register?"회원가입":"로그인"}</h1><p>{register?"82coin의 시장 정보와 커뮤니티를 함께 이용해 보세요.":"오늘의 시장 흐름과 투자자들의 관점을 만나보세요."}</p></div>
 {error&&<div className="authError" role="alert">{error}</div>}
 <form action={authAction} className="authForm" onSubmit={e=>{if(register&&password!==confirm){e.preventDefault();return}if(register&&!agreed)e.preventDefault()}}>
 <input type="hidden" name="mode" value={register?"register":"login"}/>
 <label htmlFor="authEmail">이메일 주소</label><input id="authEmail" required name="email" type="email" autoComplete="email" placeholder="이메일을 입력하세요" maxLength={254}/>
 <label htmlFor="authPassword">비밀번호</label><div className="authPassword"><input id="authPassword" required name="password" type={show?"text":"password"} autoComplete={register?"new-password":"current-password"} minLength={8} maxLength={128} placeholder="비밀번호를 입력하세요" value={password} onChange={e=>setPassword(e.target.value)}/><button type="button" aria-label={show?"비밀번호 숨기기":"비밀번호 보기"} onClick={()=>setShow(!show)}>{show?<EyeOff size={19}/>:<Eye size={19}/>}</button></div>
 {register?<><small className="authHint">8~128자로 입력하세요.</small><label htmlFor="authConfirm">비밀번호 확인</label><input id="authConfirm" required type={show?"text":"password"} autoComplete="new-password" placeholder="비밀번호를 다시 입력하세요" value={confirm} onChange={e=>setConfirm(e.target.value)} aria-invalid={mismatch}/>{mismatch&&<span className="authFieldError" role="alert">비밀번호가 일치하지 않습니다.</span>}<label htmlFor="authName">닉네임</label><input id="authName" required name="name" type="text" minLength={2} maxLength={30} autoComplete="nickname" placeholder="2~30자 닉네임"/><label className="authConsent"><input type="checkbox" name="consent" value="yes" required checked={agreed} onChange={e=>setAgreed(e.target.checked)}/><span><b>[필수]</b> <Link href="/terms" target="_blank">이용약관</Link> 및 <Link href="/privacy" target="_blank">개인정보 처리방침</Link>에 동의합니다.</span></label></>:<div className="authAside"><span>비밀번호 재설정은 준비 중입니다.</span></div>}
 <Submit register={register}/>
 </form>
 <div className="authSwitch">{register?"이미 계정이 있으신가요?":"82coin이 처음이신가요?"} <Link href={register?"/login":"/signup"}>{register?"로그인":"회원가입"} <ArrowRight size={14} aria-hidden="true"/></Link></div>
 </div></section>}
