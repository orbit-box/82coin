"use client";
import {useRef,useState,useEffect} from "react";
import {useRouter} from "next/navigation";
import {spinRouletteAnimated} from "@/lib/roulette-actions";
import type {SpinResult} from "@/lib/roulette-actions";
const values=[1,10,100,500,1000] as const;
export default function SpinningWheel({enabled,canSpin,initialId}:{enabled:boolean;canSpin:boolean;initialId:string}){
 const router=useRouter();
 const [angle,setAngle]=useState(0),[rolling,setRolling]=useState(false),[result,setResult]=useState<number|null>(null),[message,setMessage]=useState("");
 const turn=useRef(0),requestId=useRef(initialId),lock=useRef(false),done=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{if(done.current)clearTimeout(done.current)},[]);
 async function play(){
  if(lock.current||!enabled||!canSpin)return;
  lock.current=true;setRolling(true);setResult(null);setMessage("");
  const reply:SpinResult=await spinRouletteAnimated(requestId.current).catch(():SpinResult=>({ok:false,message:"잠시 후 다시 시도해주세요."}));
  if(!reply.ok||!reply.prize){setMessage(reply.message);setRolling(false);lock.current=false;return;}
  requestId.current=crypto.randomUUID();
  const index=values.indexOf(reply.prize as typeof values[number]);
  if(index<0){setMessage("당첨 결과를 표시하지 못했습니다. 내역을 확인해주세요.");setRolling(false);lock.current=false;router.refresh();return;}
  // Each sector has a 72-degree arc, center at index*72+36 measured clockwise from 12 o'clock.
  // Rotate forward at least five full turns; stop with the selected sector's center under the fixed top pointer.
  const target=(360-(index*72+36))%360;
  const next=(Math.floor(turn.current/360)+6)*360+target;
  turn.current=next;setAngle(next);
  done.current=setTimeout(()=>{setResult(reply.prize!);setRolling(false);lock.current=false;router.refresh()},4800);
 }
 return <div className="rouletteInteractive">
  <div className="rouletteVisual">
   <div className="rouletteWheel rouletteAnimatedWheel" style={{transform:`rotate(${angle}deg)`}} aria-label="1, 10, 100, 500, 1000 토큰 룰렛">
    {values.map((value,i)=><span key={value} className="roulettePrizeLabel" style={{transform:`translate(-50%,-50%) rotate(${i*72+36}deg) translateY(-94px) rotate(${-(i*72+36)}deg)`}}>{value.toLocaleString()}T</span>)}
    <div className="rouletteWheelCenter"><img src="/82token_256.png" alt="82토큰" width="90" height="90"/></div>
   </div>
  </div>
  {enabled&&canSpin&&<button type="button" className="rouletteMobileSpin button" onClick={play} disabled={rolling}>{rolling?"룰렛 돌아가는 중…":"쿠폰 1장으로 룰렛 돌리기 →"}</button>}
  {message&&<p className="roulettePlayError" role="alert">{message}</p>}
  {result!==null&&<div className="rouletteResultOverlay" role="dialog" aria-modal="true" aria-label="룰렛 당첨 결과"><div className="rouletteResultCard"><span className="rouletteResultSpark">✦ 🎉 ✦</span><h3>축하합니다!</h3><strong>{result.toLocaleString()}T 당첨!</strong><p>82토큰이 지급되었어요.</p><button type="button" onClick={()=>{setResult(null);router.refresh()}}>확인</button></div></div>}
  {enabled&&canSpin&&<button type="button" className="rouletteDesktopSpin button" onClick={play} disabled={rolling}>{rolling?"룰렛 돌아가는 중…":"쿠폰 1장으로 룰렛 돌리기 →"}</button>}
 </div>;
}
