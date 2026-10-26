import WebSocket from "ws";
import {createHmac,randomUUID} from "node:crypto";
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const b64=x=>Buffer.from(JSON.stringify(x)).toString("base64url");
function token(access,secret){const payload=b64({access_key:access,nonce:randomUUID()});const head=b64({alg:"HS256",typ:"JWT"});const content=head+"."+payload;return content+"."+createHmac("sha256",secret).update(content).digest("base64url");}
function classify(title){if(/거래지원 종료|거래지원 중단|상장폐지/.test(title))return "거래지원 종료";if(/신규 거래지원|거래지원 개시|마켓 추가|상장/.test(title))return "상장";if(/유의|주의|경고/.test(title))return "거래유의";return "기타";}
export async function startUpbitAnnouncements(pool){
 const access=process.env.UPBIT_ACCESS_KEY,secret=process.env.UPBIT_SECRET_KEY;
 if(!access||!secret){console.warn("upbit announcements disabled: credentials not configured");return}
 await pool.query(`CREATE TABLE IF NOT EXISTS exchange_announcements(
  venue TEXT NOT NULL,external_id TEXT NOT NULL,title TEXT NOT NULL,category TEXT NOT NULL,
  type TEXT NOT NULL,url TEXT NOT NULL,published_at TIMESTAMPTZ NOT NULL,updated_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),PRIMARY KEY(venue,external_id))`);
 await pool.query(`CREATE INDEX IF NOT EXISTS exchange_announcements_recent ON exchange_announcements(published_at DESC)`);
 let retry=0;
 while(true){
  let socket,pingTimer;
  try{
   socket=new WebSocket("wss://api.upbit.com/websocket/v1/private",{headers:{Authorization:"Bearer "+token(access,secret)},handshakeTimeout:12000});
   await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error("Upbit handshake timeout")),15000);socket.once("open",()=>{clearTimeout(timer);resolve()});socket.once("error",e=>{clearTimeout(timer);reject(e)})});
   retry=0;console.log("upbit announcement WebSocket connected");
   socket.send(JSON.stringify([{ticket:randomUUID()},{type:"announcement",categories:["trade"],include_body:false},{format:"DEFAULT"}]));
   let chain=Promise.resolve();
   socket.on("message",raw=>{chain=chain.then(async()=>{
    const msg=JSON.parse(raw.toString());
    if(msg.error){console.warn("upbit announcement error",String(msg.error.name||"unknown"));return}
    if(msg.type!=="announcement"||msg.category!=="trade"||!["CREATED","UPDATED"].includes(msg.event_type))return;
    const id=String(msg.uuid||""),title=String(msg.title||"").trim().slice(0,250),url=String(msg.url||"");
    const at=new Date(msg.first_listed_at),updated=new Date(msg.listed_at||msg.first_listed_at);
    if(!id||!title||!/^https:\/\/(www\.)?upbit\.com\//.test(url)||!Number.isFinite(at.getTime())||!Number.isFinite(updated.getTime()))return;
    await pool.query(`INSERT INTO exchange_announcements(venue,external_id,title,category,type,url,published_at,updated_at,received_at)
     VALUES('upbit',$1,$2,'trade',$3,$4,$5,$6,now())
     ON CONFLICT(venue,external_id) DO UPDATE SET title=EXCLUDED.title,type=EXCLUDED.type,url=EXCLUDED.url,
     updated_at=EXCLUDED.updated_at,received_at=now()`,[id,title,classify(title),url,at,updated]);
    console.log("upbit announcement stored",msg.event_type,id);
   }).catch(e=>console.warn("upbit announcement save failed",e.message))});
   pingTimer=setInterval(()=>{if(socket.readyState===WebSocket.OPEN)socket.ping()},30000);
   await new Promise(resolve=>{socket.once("close",resolve);socket.once("error",resolve)});
  }catch(e){console.warn("upbit announcement connection failed",e.message)}finally{clearInterval(pingTimer);try{socket?.terminate()}catch{}}
  retry=Math.min(retry+1,7);await sleep(Math.min(60000,1000*2**retry)+Math.random()*1500);
 }
}
