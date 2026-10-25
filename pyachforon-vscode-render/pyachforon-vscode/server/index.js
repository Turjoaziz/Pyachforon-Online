import express from 'express';
import http from 'node:http';
import { Server } from 'socket.io';
import { randomInt, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { words } from './words.js';

const app=express();
const server=http.createServer(app);
const origins=process.env.ALLOWED_ORIGINS?.split(',').map(v=>v.trim()).filter(Boolean);
const io=new Server(server,{cors:origins?{origin:origins}:undefined});
const rooms=new Map();
const ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_PLAYERS=24;
const ROOM_TTL_MS=30*60*1000; // retain empty rooms for 30 minutes so guests can reconnect
const MAX_CUSTOM_WORDS=100;
const cleanName=v=>typeof v==='string'?v.trim().replace(/\s+/g,' ').slice(0,22):'';
const cleanCode=v=>typeof v==='string'?v.toUpperCase().replace(/\s/g,'').slice(0,8):'';
const fail=(ack,message)=>ack?.({ok:false,error:message});
const ok=(ack,extra={})=>ack?.({ok:true,...extra});
const shuffle=a=>{const out=[...a];for(let i=out.length-1;i>0;i--){let j=randomInt(i+1);[out[i],out[j]]=[out[j],out[i]];}return out;};
function code(){let s;do{s=Array.from({length:6},()=>ALPHABET[randomInt(ALPHABET.length)]).join('');}while(rooms.has(s));return s;}
const teams=['জোনাকি','বজ্র','আগুন','তুফান'];
function snapshot(room,recipient){
 const current=room.cards[room.cardIndex];
 const active=room.players.find(p=>p.id===room.activeId);
 return {
  code:room.code,status:room.status,hostId:room.hostId,selfId:recipient,
  players:room.players.map(({id,name,team,connected})=>({id,name,team,connected})),
  teamCount:room.teamCount,teams:teams.slice(0,room.teamCount).map((name,i)=>({name,id:i,score:room.scores[i]})),
  round:room.round,cardTotal:room.baseCards.length,remaining:room.cards.length-room.cardIndex,
  duration:room.duration,endsAt:room.endsAt,turnTeam:room.turnTeam,
  activeId:room.activeId,activeName:active?.name??null,
  word:room.status==='playing' && recipient===room.activeId ? current??null:null,
  lastResult:room.lastResult,winner:room.winner
 };
}
function broadcast(room){for(const p of room.players)if(p.connected&&p.socketId)io.to(p.socketId).emit('state',snapshot(room,p.id));}
function cancelCleanup(room){if(room.cleanupTimer)clearTimeout(room.cleanupTimer);room.cleanupTimer=null;}
function scheduleCleanup(room){cancelCleanup(room);room.cleanupTimer=setTimeout(()=>{if(!room.players.some(p=>p.connected)){clearTimer(room);rooms.delete(room.code);}},ROOM_TTL_MS);room.cleanupTimer.unref?.();}
function issuePlayer(socket,room,name,team){const p={id:randomUUID(),resumeToken:randomUUID(),socketId:socket.id,name,team,connected:true};room.players.push(p);socket.data.room=room.code;socket.data.playerId=p.id;socket.join(room.code);return p;}
function currentPlayer(socket,room){return room?.players.find(p=>p.id===socket.data.playerId&&p.socketId===socket.id);}
function clearTimer(room){if(room.timer)clearTimeout(room.timer);room.timer=null;room.endsAt=null;}
function nextEligible(room){
 for(let n=0;n<room.teamCount;n++){
  const index=(room.turnTeam+n)%room.teamCount;
  const candidates=room.players.filter(p=>p.team===index&&p.connected);
  if(candidates.length){const last=room.lastActor[index];const at=candidates.findIndex(p=>p.id===last);const next=candidates[(at+1+candidates.length)%candidates.length];room.turnTeam=index;room.activeId=next.id;room.lastActor[index]=next.id;return true;}
 }
 room.activeId=null;return false;
}
function endTurn(room){
 clearTimer(room);room.status='between';room.activeId=null;
 if(room.cardIndex>=room.cards.length){
  if(room.round===3){room.status='finished';const max=Math.max(...room.scores);room.winner=room.scores.map((v,i)=>v===max?teams[i]:null).filter(Boolean);}
  else{room.round++;room.cards=shuffle(room.baseCards);room.cardIndex=0;room.lastResult=`রাউন্ড ${room.round} শুরু!`;}
 } else room.lastResult='সময় শেষ! এবার পরের দল।';
 room.turnTeam=(room.turnTeam+1)%room.teamCount;
 broadcast(room);
}
function getRoom(socket){const c=socket.data.room;return c?rooms.get(c):null;}
function leave(socket){
 const room=getRoom(socket);if(!room)return;
 const p=currentPlayer(socket,room);if(!p)return;
 p.connected=false;p.socketId=null;
 if(room.activeId===p.id&&room.status==='playing')endTurn(room);
 if(room.hostId===p.id)room.hostId=room.players.find(v=>v.connected)?.id??p.id;
 if(!room.players.some(v=>v.connected)){clearTimer(room);if(room.status==='playing')room.status='between';scheduleCleanup(room);}
 else broadcast(room);
 socket.leave(room.code);socket.data.room=null;socket.data.playerId=null;
}
app.get('/api/health',(_req,res)=>res.json({ok:true,service:'pyachforon'}));
io.on('connection',socket=>{
 socket.on('create-room',(payload={},ack)=>{
  const name=cleanName(payload.name);if(!name)return fail(ack,'আপনার নাম লিখুন।');
  leave(socket);
  const room={code:code(),status:'lobby',players:[],hostId:null,teamCount:2,scores:[0,0,0,0],round:1,baseCards:[],cards:[],cardIndex:0,duration:60,turnTeam:0,activeId:null,lastActor:{},lastResult:null,winner:null,endsAt:null,timer:null,customWords:[],cleanupTimer:null};
  rooms.set(room.code,room);const player=issuePlayer(socket,room,name,0);room.hostId=player.id;ok(ack,{code:room.code,playerId:player.id,resumeToken:player.resumeToken});broadcast(room);
 });
 socket.on('join-room',(payload={},ack)=>{
  const code=cleanCode(payload.code),name=cleanName(payload.name),room=rooms.get(code);
  if(!room)return fail(ack,'এই কোডের কোনো রুম পাওয়া যায়নি।');
  if(!name)return fail(ack,'আপনার নাম লিখুন।');
  if(room.status!=='lobby')return fail(ack,'এই রুমে খেলা শুরু হয়ে গেছে।');
  if(room.players.filter(p=>p.connected).length>=MAX_PLAYERS)return fail(ack,'রুমে আর জায়গা নেই।');
  if(room.players.some(p=>p.name.toLowerCase()===name.toLowerCase()))return fail(ack,'এই নামটি ইতিমধ্যে নেওয়া হয়েছে।');
  leave(socket);cancelCleanup(room);const player=issuePlayer(socket,room,name,room.players.filter(p=>p.connected).length%room.teamCount);ok(ack,{code,playerId:player.id,resumeToken:player.resumeToken});broadcast(room);
 });
 socket.on('resume-room',(payload={},ack)=>{
  const room=rooms.get(cleanCode(payload.code));
  if(!room||typeof payload.resumeToken!=='string')return fail(ack,'পুরনো রুমটি আর পাওয়া যাচ্ছে না। নতুন রুমে যোগ দিন।');
  const player=room.players.find(p=>p.id===payload.playerId&&p.resumeToken===payload.resumeToken);
  if(!player)return fail(ack,'পুনরায় যোগ দেওয়ার তথ্য সঠিক নয়।');
  leave(socket);cancelCleanup(room);
  if(player.socketId&&player.socketId!==socket.id){const old=io.sockets.sockets.get(player.socketId);if(old){old.data.room=null;old.data.playerId=null;old.emit('session-replaced');old.disconnect(true);}}
  player.socketId=socket.id;player.connected=true;socket.join(room.code);socket.data.room=room.code;socket.data.playerId=player.id;
  if(!room.players.find(p=>p.id===room.hostId)?.connected)room.hostId=player.id;
  ok(ack,{code:room.code,playerId:player.id,resumeToken:player.resumeToken});broadcast(room);
 });
 socket.on('configure',(payload={},ack)=>{
  const room=getRoom(socket);if(!room||room.hostId!==socket.data.playerId||room.status!=='lobby')return fail(ack,'শুধু হোস্ট সেটিংস বদলাতে পারবেন।');
  if(payload.teamCount!==undefined){if(![2,3,4].includes(payload.teamCount))return fail(ack,'দলের সংখ্যা ঠিক নয়।');room.teamCount=payload.teamCount;room.players.forEach((p,i)=>p.team=i%room.teamCount);}
  if(payload.duration!==undefined){if(![30,60,90].includes(payload.duration))return fail(ack,'সময় ঠিক নয়।');room.duration=payload.duration;}
  ok(ack);broadcast(room);
 });
 socket.on('set-team',(payload={},ack)=>{
  const room=getRoom(socket);if(!room||room.hostId!==socket.data.playerId||room.status!=='lobby')return fail(ack,'দল পরিবর্তন করা যাবে না।');
  const p=room.players.find(p=>p.id===payload.playerId);
  if(!p||!Number.isInteger(payload.team)||payload.team<0||payload.team>=room.teamCount)return fail(ack,'দল ঠিক নয়।');
  p.team=payload.team;ok(ack);broadcast(room);
 });
 socket.on('add-words',(payload={},ack)=>{
  const room=getRoom(socket);if(!room||room.hostId!==socket.data.playerId||room.status!=='lobby')return fail(ack,'শুধু হোস্ট শব্দ যোগ করতে পারবেন।');
  const w=typeof payload.words==='string'?payload.words.split(/[\n,]+/).map(x=>x.trim()).filter(x=>x.length>=2&&x.length<=50):[];
  if(room.customWords.length+w.length>MAX_CUSTOM_WORDS)return fail(ack,'সর্বোচ্চ ১০০টি নতুন শব্দ যোগ করুন।');
  room.customWords.push(...w);ok(ack,{added:w.length});
 });
 socket.on('start-game',(_,ack)=>{
  const room=getRoom(socket);if(!room||room.hostId!==socket.data.playerId||room.status!=='lobby')return fail(ack,'শুধু হোস্ট খেলা শুরু করতে পারবেন।');
  if(room.players.filter(p=>p.connected).length<2)return fail(ack,'কমপক্ষে ২ জন খেলোয়াড় লাগবে।');
  if(!Array.from({length:room.teamCount},(_,i)=>room.players.some(p=>p.team===i&&p.connected)).every(Boolean))return fail(ack,'প্রতিটি দলে অন্তত একজন খেলোয়াড় দরকার।');
  room.baseCards=shuffle([...words,...room.customWords]).slice(0,Math.min(30,words.length+room.customWords.length));room.cards=shuffle(room.baseCards);room.cardIndex=0;room.status='between';room.lastResult='প্রথম রাউন্ডের জন্য প্রস্তুত?';room.round=1;room.scores=[0,0,0,0];room.turnTeam=0;ok(ack);broadcast(room);
 });
 socket.on('start-turn',(_,ack)=>{
  const room=getRoom(socket);if(!room||room.status!=='between')return fail(ack,'এখন পালা শুরু করা যাবে না।');
  if(socket.data.playerId!==room.hostId&&!room.players.some(p=>p.id===socket.data.playerId&&p.team===room.turnTeam))return fail(ack,'এবার অন্য দলের পালা।');
  if(!nextEligible(room))return fail(ack,'কোনো খেলোয়াড় অনলাইনে নেই।');
  room.status='playing';room.endsAt=Date.now()+room.duration*1000;
  room.timer=setTimeout(()=>endTurn(room),room.duration*1000);
  ok(ack);broadcast(room);
 });
 socket.on('answer',(payload={},ack)=>{
  const room=getRoom(socket);
  if(!room||room.status!=='playing'||room.activeId!==socket.data.playerId)return fail(ack,'শুধুমাত্র বর্তমান খেলোয়াড় উত্তর দিতে পারবেন।');
  if(Date.now()>=room.endsAt){endTurn(room);return fail(ack,'সময় শেষ!');}
  if(payload.result!=='correct'&&payload.result!=='skip')return fail(ack,'অবৈধ উত্তর।');
  if(payload.result==='correct')room.scores[room.turnTeam]+=1;
  room.cardIndex++;room.lastResult=payload.result==='correct'?'দারুণ! +১ পয়েন্ট':'শব্দটি বাদ দেওয়া হয়েছে।';
  ok(ack);
  if(room.cardIndex>=room.cards.length)endTurn(room);else broadcast(room);
 });
 socket.on('end-turn',(_,ack)=>{const room=getRoom(socket);if(!room||room.status!=='playing'||![room.activeId,room.hostId].includes(socket.data.playerId))return fail(ack,'পালা শেষ করা যাবে না।');ok(ack);endTurn(room);});
 socket.on('reset-game',(_,ack)=>{const room=getRoom(socket);if(!room||room.hostId!==socket.data.playerId)return fail(ack,'শুধু হোস্ট নতুন খেলা শুরু করতে পারবেন।');clearTimer(room);room.status='lobby';room.round=1;room.activeId=null;room.winner=null;room.lastResult=null;room.scores=[0,0,0,0];room.cardIndex=0;room.players=room.players.filter(p=>p.connected);ok(ack);broadcast(room);});
 socket.on('leave-room',(_,ack)=>{const room=getRoom(socket),p=currentPlayer(socket,room);leave(socket);if(room&&p){room.players=room.players.filter(x=>x.id!==p.id);if(room.hostId===p.id)room.hostId=room.players.find(x=>x.connected)?.id??null;if(!room.players.length){cancelCleanup(room);rooms.delete(room.code);}else broadcast(room);}ok(ack);});
 socket.on('disconnect',()=>leave(socket));
});
const dist=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
app.use(express.static(dist));app.get('*',(req,res)=>{if(req.path.startsWith('/socket.io'))return res.sendStatus(404);res.sendFile(path.join(dist,'index.html'),err=>{if(err&&!res.headersSent)res.status(404).send('Frontend not built; run npm run dev.');});});
const port=Number(process.env.PORT)||3001;
server.listen(port,'0.0.0.0',()=>console.log(`প্যাঁচফোড়ন server running at http://localhost:${port}`));
