import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import WebSocket from 'ws';
const token='test-token-123456789012345',port=3197,origin=`http://localhost:${port}`;
function next(ws,predicate){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{ws.off('message',fn);reject(Error('Timeout'));},3000);function fn(raw){const m=JSON.parse(raw);if(predicate(m)){clearTimeout(timer);ws.off('message',fn);resolve(m);}}ws.on('message',fn);});}
async function client(role,station='one',key=token){const ws=new WebSocket(`ws://127.0.0.1:${port}/ws`,{origin});await once(ws,'open');const ready=key===token?next(ws,m=>m.type==='state'):once(ws,'close');ws.send(JSON.stringify({type:'auth',role,station,token:key}));await ready;return ws;}
const pause=()=>new Promise(r=>setTimeout(r,110));
test('sincronización, permisos y aislamiento',async()=>{
 const proc=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),HOST:'127.0.0.1',STATION_TOKEN:token,DATA_MODE:'demo',ALLOWED_ORIGINS:origin},stdio:['ignore','pipe','inherit']});
 const clients=[];
 try{
 await once(proc.stdout,'data');
 const touch=await client('touch'),display=await client('display'),other=await client('display','two');clients.push(touch,display,other);
 let leaked=false;other.on('message',r=>{if(JSON.parse(r).state?.participant)leaked=true;});
 const loaded=next(display,m=>m.state?.participant?.code==='ABC123');touch.send(JSON.stringify({type:'load',code:'ABC123'}));assert.equal((await loaded).state.participant.nombre,'Héctor · DEMO');
 await pause();const effect=next(display,m=>m.state?.effect==='save');touch.send(JSON.stringify({type:'effect',effect:'save'}));await effect;
 const forbidden=next(display,m=>m.type==='error');display.send(JSON.stringify({type:'reset'}));assert.match((await forbidden).message,/solo recibe/);
 const recovery=new WebSocket(`ws://127.0.0.1:${port}/ws`,{origin});clients.push(recovery);await once(recovery,'open');const snapshot=next(recovery,m=>m.type==='state');recovery.send(JSON.stringify({type:'auth',role:'display',station:'one',token}));assert.equal((await snapshot).state.effect,'save');
 await pause();const reset=next(display,m=>m.state?.effect==='idle');touch.send(JSON.stringify({type:'reset'}));assert.equal((await reset).state.participant,null);assert.equal(leaked,false);
 await client('touch','one','wrong');
 const res=await fetch(`http://127.0.0.1:${port}/.env`);assert.equal(res.status,404);
 }finally{for(const c of clients)c.terminate();proc.kill();await once(proc,'exit');}
});
