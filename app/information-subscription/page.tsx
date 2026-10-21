import Link from "next/link";
import {Bell,Send,Newspaper,ChartNoAxesCombined,CalendarDays,ShieldCheck,Settings2} from "lucide-react";
import {sessionId} from "@/lib/auth";
import {query} from "@/lib/db";
import {SUBSCRIPTION_COINS,SUBSCRIPTION_ALERTS,subscriptionSchema,saveInformationSubscription} from "@/lib/information-subscription-actions";
export const dynamic="force-dynamic";
export const metadata={title:"정보구독 | 82coin",description:"관심 코인과 시장 소식을 골라 담는 82coin 개인 알림 설정"};
type Settings={coins:string[];alerts:string[];channel:string;frequency:string;enabled:boolean;connected:boolean};
const alertList:{key:typeof SUBSCRIPTION_ALERTS[number];title:string;description:string}[]=[
 {key:"coin_news",title:"관심 종목 주요 뉴스",description:"선택한 코인의 핵심 발표와 시장 소식"},
 {key:"price_move",title:"급등·급락 알림",description:"관심 종목에 큰 가격 변동이 발생할 때"},
 {key:"price_target",title:"목표가 알림",description:"향후 개별 목표 가격 설정 기능이 추가됩니다"},
 {key:"economic_calendar",title:"경제 일정 알림",description:"CPI·금리 결정 등 시장 주요 일정"},
 {key:"market_brief",title:"오늘의 시장 브리핑",description:"주요 코인 및 시장 흐름 요약"}
];
export default async function InformationSubscription({searchParams}:{searchParams:Promise<{notice?:string}>}){
 const member=await sessionId(),params=await searchParams;
 let settings:Settings|null=null;
 if(member){try{await subscriptionSchema();const r=await query<Settings>("SELECT coins,alerts,channel,frequency,enabled,connected FROM information_subscriptions WHERE member_id=$1",[member]);settings=r.rows[0]||null}catch{}}
 const saved=params.notice==="saved",invalid=params.notice==="invalid",empty=params.notice==="empty";
 return <div className="infoSubPage">
  <header className="infoSubHero"><span className="eyebrow">82COIN PERSONAL ALERTS</span><h1>정보구독</h1><p>내가 관심 있는 종목과 뉴스만 골라보세요. 복잡한 시장 정보도 나에게 필요한 것부터.</p><span className="infoSubState"><Bell size={14}/> 맞춤 알림 서비스 준비 중</span></header>
  <div className="infoSubIntro"><div><Newspaper size={23}/><strong>종목별 핵심 뉴스</strong><small>관심 코인만 선택</small></div><div><ChartNoAxesCombined size={23}/><strong>가격 변화 알림</strong><small>중요한 움직임 확인</small></div><div><CalendarDays size={23}/><strong>경제 일정 안내</strong><small>주요 발표 일정 확인</small></div></div>
  {!member?<section className="infoSubCard infoSubSignIn"><Send size={28}/><h2>로그인하고 관심 정보를 저장하세요</h2><p>설정한 관심 종목과 구독 항목은 회원 계정에 보관됩니다.</p><Link href="/login" className="button">로그인하기 →</Link></section>:
  <form action={saveInformationSubscription} className="infoSubForm">
   {saved&&<p className="infoSubMessage" role="status"><ShieldCheck size={17}/> 관심 정보가 저장되었어요. 메시지 알림은 채널 연동 후 시작됩니다.</p>}
   {(invalid||empty)&&<p className="infoSubMessage error" role="alert">관심 종목과 알림 항목을 하나 이상 선택해 주세요.</p>}
   <section className="infoSubCard"><div className="infoSubSectionHead"><span className="infoSubStep">01</span><div><h2>관심 종목을 선택하세요</h2><p>여러 종목을 선택할 수 있습니다.</p></div></div><div className="infoSubCoinGrid">{SUBSCRIPTION_COINS.map(coin=><label className="infoSubCoin" key={coin}><input type="checkbox" name="coins" value={coin} defaultChecked={settings?.coins.includes(coin)??["BTC","XRP"].includes(coin)}/><span>{coin}</span></label>)}</div></section>
   <section className="infoSubCard"><div className="infoSubSectionHead"><span className="infoSubStep">02</span><div><h2>받고 싶은 정보를 고르세요</h2><p>관심 있는 소식만 받아볼 수 있도록 준비 중이에요.</p></div></div><div className="infoSubAlertGrid">{alertList.map(item=><label className="infoSubAlert" key={item.key}><input type="checkbox" name="alerts" value={item.key} defaultChecked={settings?.alerts.includes(item.key)??["coin_news","price_move","economic_calendar"].includes(item.key)}/><span><strong>{item.title}</strong><small>{item.description}</small></span></label>)}</div></section>
   <section className="infoSubCard"><div className="infoSubSectionHead"><span className="infoSubStep">03</span><div><h2>수신 방법을 선택하세요</h2><p>지금은 선호 채널만 저장하며 실제 연결은 추후 안내할 예정입니다.</p></div></div><div className="infoSubChannels"><label><input type="radio" name="channel" value="telegram" defaultChecked={!settings||settings.channel==="telegram"}/><span><Send size={20}/><strong>텔레그램</strong><small>연동 준비 중</small></span></label><label><input type="radio" name="channel" value="kakao" defaultChecked={settings?.channel==="kakao"}/><span><Settings2 size={20}/><strong>카카오톡</strong><small>연동 준비 중</small></span></label></div><div className="infoSubTiming"><label htmlFor="subFrequency">알림 빈도</label><select id="subFrequency" name="frequency" defaultValue={settings?.frequency||"important"}><option value="important">중요한 소식 중심</option><option value="daily">하루 한 번 모아보기</option></select></div><label className="infoSubActive"><input type="checkbox" name="enabled" defaultChecked={settings?.enabled??true}/><span>정보구독 설정 활성화</span></label></section>
   <div className="infoSubSubmit"><div><strong>내 관심 정보 설정</strong><small>{settings?"저장된 설정을 언제든지 변경할 수 있어요.":"먼저 관심 정보를 저장해 두세요."}</small></div><button className="button" type="submit">설정 저장하기 →</button></div>
  </form>}
  <p className="infoSubFooterNote"><ShieldCheck size={15}/> 현재는 관심 정보 설정을 저장하는 서비스 준비 단계입니다. 텔레그램·카카오톡 계정 연결이나 메시지 발송은 아직 제공되지 않습니다.</p>
 </div>;
}
