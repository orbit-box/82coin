"use client";
import {useRef,useState,useEffect} from "react";
import {useRouter} from "next/navigation";
import {spinRouletteAnimated} from "@/lib/roulette-actions";
import type {SpinResult} from "@/lib/roulette-actions";
const values=[1,10,100,500,1000] as const;
const sector=72;
function point(radius:number,degrees:number){
 const a=(degrees-90)*Math.PI/180;
 return {x:150+radius*Math.cos(a),y:150+radius*Math.sin(a)};
}
function wedge(i:number){
 const start=point(133,i*sector),end=point(133,(i+1)*sector);
 return `M 150 150 L ${start.x} ${start.y} A 133 133 0 0 1 ${end.x} ${end.y} Z`;
}
const colors=["#7DC4FC","#D5EFFF","#3C9EE8","#A9DCFF","#E9F6FF"];

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
  const extra=(target-(turn.current%360)+360)%360;
  const next=turn.current+6*360+extra;
  turn.current=next;setAngle(next);
  done.current=setTimeout(()=>{setResult(reply.prize!);setRolling(false);lock.current=false;router.refresh()},4800);
 }
 return <div className="rouletteInteractive">
  <div className="rouletteVisual">
   <div className="rouletteSvgDisk rouletteAnimatedWheel" style={{transform:`rotate(${angle}deg)`}} role="img" aria-label="1T, 10T, 100T, 500T, 1,000T 룰렛">
    <svg className="rouletteSvg" viewBox="0 0 300 300" aria-hidden="true">
     <circle cx="150" cy="150" r="148" fill="#fff" stroke="#8bc9ff" strokeWidth="2"/>
     {values.map((value,i)=>{
       const c=point(99,i*sector+sector/2);
       return <g key={value}><path d={wedge(i)} fill={colors[i]}/><text x={c.x} y={c.y} textAnchor="middle" dominantBaseline="central" className="rouletteSvgLabel">{value.toLocaleString()}T</text></g>;
     })}
     <circle cx="150" cy="150" r="118" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="5 5" opacity=".85"/>
     
     <image href="/82token_256.png" x="94" y="94" width="112" height="112"/>
    </svg>
   </div>
  </div>
  {enabled&&canSpin&&<button type="button" className="rouletteMobileSpin button" onClick={play} disabled={rolling}>{rolling?"룰렛 돌아가는 중…":"쿠폰 1장으로 룰렛 돌리기 →"}</button>}
  {message&&<p className="roulettePlayError" role="alert">{message}</p>}
  {result!==null&&<div className="rouletteResultOverlay" role="dialog" aria-modal="true" aria-label="룰렛 당첨 결과"><div className="rouletteResultCard"><span className="rouletteResultSpark">✦ 🎉 ✦</span><h3>축하합니다!</h3><strong>{result.toLocaleString()}T 당첨!</strong><p>82토큰이 지급되었어요.</p><button type="button" onClick={()=>{setResult(null);router.refresh()}}>확인</button></div></div>}
  {enabled&&canSpin&&<button type="button" className="rouletteDesktopSpin button" onClick={play} disabled={rolling}>{rolling?"룰렛 돌아가는 중…":"쿠폰 1장으로 룰렛 돌리기 →"}</button>}
 </div>;
}
