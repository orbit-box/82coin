export function rewardHistoryTitle(kind:string,amount:number):string{
 const titles:Record<string,string>={
  ATTENDANCE:"출석체크 보상",ROULETTE:"룰렛 당첨 보상",
  ADMIN_GRANT:"운영자 지급",ADMIN:"운영자 지급",
  EVENT:"이벤트 참여 보상",MISSION:"미션 달성 보상",
  COUPON:"쿠폰 교환",REDEEM:"토큰 사용",
  REFUND:"토큰 반환",ADJUSTMENT:"토큰 조정"
 };
 if(titles[kind])return titles[kind];
 return amount>=0?"82토큰 적립":"82토큰 사용";
}
export function rewardHistoryDetail(kind:string,reference:string,createdAt:Date|string):string{
 const date=new Date(createdAt);
 const formatted=Number.isFinite(date.getTime())?new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul",month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit",hour12:false}).format(date):"";
 if(kind==="ROULETTE")return formatted?formatted+" · 룰렛 참여":"룰렛 참여";
 if(kind==="ATTENDANCE")return formatted?formatted+" · 출석 완료":"출석 완료";
 return formatted||"적립 및 사용 내역";
}
