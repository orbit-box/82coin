"use client";
import {useState} from "react";
export default function CoinIcon({ticker,size=26}:{ticker:string;size?:number}){const[failed,setFailed]=useState(false);const symbol=ticker.toUpperCase().replace(/[^A-Z0-9]/g,"");return <span className="coinIcon" style={{width:size,height:size,fontSize:size<25?10:12}}>{failed||!symbol?<b>{symbol.slice(0,2)||"?"}</b>:<img src={"https://static.upbit.com/logos/"+symbol+".png"} alt="" width={size} height={size} loading="lazy" onError={()=>setFailed(true)}/>}</span>}
