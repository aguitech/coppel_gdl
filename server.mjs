import http from 'node:http';
import fs from 'node:fs/promises';
import {randomUUID,timingSafeEqual} from 'node:crypto';
import {WebSocketServer,WebSocket} from 'ws';
const port=Number(process.env.PORT||3000), host=process.env.HOST||'127.0.0.1';
const secret=process.env.STATION_TOKEN;
if(!secret||secret.length<16) throw Error('STATION_TOKEN debe tener al menos 16 caracteres');
const mode=process.env.DATA_MODE||'demo';
if(!['demo','live'].includes(mode))throw Error('DATA_MODE inválido');
if(mode==='live'&&(!process.env.BRIDGE_URL?.startsWith('https://')||!process.env.BRIDGE_TOKEN))throw Error('Falta BRIDGE_URL HTTPS o BRIDGE_TOKEN');
const rooms=new Map();
function room(id){if(!rooms.has(id)){if(rooms.size>=50)throw Error('Límite de estaciones');rooms.set(id,{revision:0,session:randomUUID(),participant:null,effect:'idle',x:.5,y:.5,updated:Date.now(),generation:0});}return rooms.get(id);}
function safeEqual(a,b){const x=Buffer.from(String(a||'')),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
function send(ws,data){if(ws.readyState===WebSocket.OPEN){if(ws.bufferedAmount>65536)return ws.close(1013,'Cliente lento');ws.send(JSON.stringify(data));}}
function broadcast(id){const r=room(id);const {generation,...state}=r;for(const c of wss.clients)if(c.station===id)send(c,{type:'state',state});}
function commit(id,patch){Object.assign(room(id),patch,{updated:Date.now()});room(id).revision++;broadcast(id);}
async function participant(code){
 if(!/^[A-Za-z0-9-]{3,40}$/.test(code))throw Error('Código inválido');
 if(mode==='demo')return {code,nombre:'Héctor · DEMO',deseo:'Disfrutar mi futuro'};
 const res=await fetch(process.env.BRIDGE_URL,{method:'POST',headers:{'Content-Type':'application/json','X-Portal-Key':process.env.BRIDGE_TOKEN},body:JSON.stringify({code}),signal:AbortSignal.timeout(8000),redirect:'error'});
 if(!res.ok)throw Error(res.status===404?'Código no encontrado':'No fue posible consultar el prerregistro');
 const j=await res.json();if(!j.ok||!j.participant?.nombre)throw Error('Respuesta de prerregistro inválida');
 return {code,nombre:String(j.participant.nombre).slice(0,120),deseo:String(j.participant.deseo||'Mi futuro').slice(0,180)};
}
const files={'/':'index.html','/touch':'touch.html','/display':'display.html','/style.css':'style.css','/common.js':'common.js','/touch.js':'touch.js','/display.js':'display.js'};
const server=http.createServer(async(req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; media-src 'self' blob:; img-src 'self' data:; frame-ancestors 'none'");
 if(req.method!=='GET'||!files[path]){res.writeHead(404);return res.end('No encontrado');}
 try{const f=files[path];res.setHeader('Content-Type',f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':'text/html; charset=utf-8');res.end(await fs.readFile(new URL('./public/'+f,import.meta.url)));}catch{res.writeHead(500);res.end('Error');}
});
const wss=new WebSocketServer({noServer:true,maxPayload:4096,perMessageDeflate:false});
server.on('upgrade',(req,socket,head)=>{
 const allowed=(process.env.ALLOWED_ORIGINS||`http://localhost:${port},http://127.0.0.1:${port}`).split(',');
 if(req.url!=='/ws'||!allowed.includes(req.headers.origin)){socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');return socket.destroy();}
 wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws));
});
wss.on('connection',ws=>{
 ws.alive=true;ws.on('pong',()=>ws.alive=true);ws.on('error',()=>{});
 const timeout=setTimeout(()=>ws.close(1008,'Autenticación requerida'),5000);let last=0;
 ws.on('close',()=>clearTimeout(timeout));
 ws.on('message',async raw=>{try{
  const m=JSON.parse(raw);
  if(!ws.station){
   if(m.type!=='auth'||!safeEqual(m.token,secret)||!/^[-a-zA-Z0-9_]{1,32}$/.test(m.station)||!['touch','display'].includes(m.role))return ws.close(1008,'Credenciales inválidas');
   ws.station=m.station;ws.role=m.role;clearTimeout(timeout);room(ws.station);send(ws,{type:'ready',mode});broadcast(ws.station);return;
  }
  if(ws.role!=='touch')throw Error('Esta pantalla solo recibe');
  const id=ws.station,r=room(id);
  if(Date.now()-last<80)return;last=Date.now();
  if(m.type==='load'){
   if(ws.loading)throw Error('Consulta en curso');ws.loading=true;const gen=++r.generation;
   try{const data=await participant(String(m.code||''));if(r.generation===gen)commit(id,{participant:data,session:randomUUID(),effect:'welcome'});}finally{ws.loading=false;}
  }else if(m.type==='reset'){r.generation++;commit(id,{participant:null,effect:'idle',session:randomUUID()});}
  else if(m.type==='effect'){
   if(!r.participant)throw Error('Carga un participante primero');
   if(!['save','plan','learn','goal','final'].includes(m.effect))throw Error('Efecto inválido');
   commit(id,{effect:m.effect,x:Number.isFinite(m.x)?Math.max(0,Math.min(1,m.x)):.5,y:Number.isFinite(m.y)?Math.max(0,Math.min(1,m.y)):.5});
  }else throw Error('Comando inválido');
 }catch(e){send(ws,{type:'error',message:e.message||'Error de solicitud'});}});
});
setInterval(()=>{for(const ws of wss.clients){if(!ws.alive){ws.terminate();continue;}ws.alive=false;ws.ping();}for(const [id,r]of rooms)if(r.participant&&Date.now()-r.updated>180000){r.generation++;commit(id,{participant:null,effect:'idle',session:randomUUID()});}},15000).unref();
server.listen(port,host,()=>console.log(`Portal listo: http://localhost:${port} · modo ${mode}`));
