import {connect} from './common.js';
const $=id=>document.getElementById(id),c=$('fx'),ctx=c.getContext('2d');let W,H,particles=[],rings=[],lastSession='',revision=-1,audio=null;
function resize(){W=innerWidth;H=innerHeight;const d=Math.min(devicePixelRatio||1,2);c.width=W*d;c.height=H*d;ctx.setTransform(d,0,0,d,0,0);}addEventListener('resize',resize);resize();
const captions={idle:'Acércate al tablero para comenzar',welcome:'Elige una decisión y mira lo que puedes crear',save:'Un hábito empieza hoy',plan:'Dale dirección a tu futuro',learn:'Conocer tu Afore es un primer paso',goal:'Tu meta merece un comienzo',final:'Hoy comienzo a construir mi futuro'};
function burst(type,x=.5,y=.5){
 const count=type==='final'?420:type==='plan'?85:190;
 for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,v=type==='save'?30+Math.random()*100:80+Math.random()*420;particles.push({x:x*W,y:y*H,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:2+Math.random()*2,size:1+Math.random()*4,color:type==='learn'?'#64eaff':Math.random()>.3?'#ffda35':'#fff',type});}
 particles=particles.slice(-1100);rings.push({x:x*W,y:y*H,r:10,life:1.2});rings=rings.slice(-10);
 if(audio){const o=audio.createOscillator(),g=audio.createGain();o.connect(g);g.connect(audio.destination);o.frequency.setValueAtTime(280,audio.currentTime);o.frequency.exponentialRampToValueAtTime(880,audio.currentTime+.25);g.gain.setValueAtTime(.045,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.5);o.start();o.stop(audio.currentTime+.5);}
}
connect('display',s=>{
 const changed=s.session!==lastSession;if(changed){particles=[];rings=[];revision=-1;lastSession=s.session;}
 $('name').textContent=s.participant?.nombre||'El siguiente futuro es el tuyo';
 $('caption').textContent=s.effect==='final'&&s.participant?`${captions.final}: ${s.participant.deseo}`:captions[s.effect]||captions.idle;
 // No reejecutar destellos viejos al reconectar. El estado siempre se restaura.
 if(s.revision!==revision&&Date.now()-s.updated<2500&&!['idle','welcome'].includes(s.effect))burst(s.effect,s.x,s.y);
 revision=s.revision;
});
let prev=performance.now();function frame(now){const dt=Math.min((now-prev)/1000,.05);prev=now;ctx.clearRect(0,0,W,H);ctx.globalCompositeOperation='lighter';
 for(let i=0;i<35;i++){const x=(i*117.7)%W,y=(H+(i*91-now*.015)%H)%H;ctx.globalAlpha=.2;ctx.fillStyle='#65aaff';ctx.beginPath();ctx.arc(x,y,1.5,0,7);ctx.fill();}
 for(const p of particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.exp(-dt*.7);p.vy+=p.type==='save'?-32*dt:22*dt;ctx.globalAlpha=Math.max(0,Math.min(1,p.life));ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,7);ctx.fill();}
 // Constelaciones: enlaces limitados para mantener fluidez.
 const stars=particles.filter(p=>p.type==='plan').slice(0,85);ctx.strokeStyle='#8fdcff';ctx.lineWidth=1;for(let i=1;i<stars.length;i++){const a=stars[i-1],b=stars[i];if(Math.hypot(a.x-b.x,a.y-b.y)<170){ctx.globalAlpha=Math.max(0,Math.min(.45,a.life*.2));ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}}
 for(const r of rings){r.life-=dt;r.r+=dt*330;ctx.globalAlpha=Math.max(0,r.life*.4);ctx.strokeStyle='#ffda35';ctx.lineWidth=3;ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,7);ctx.stroke();}particles=particles.filter(p=>p.life>0);rings=rings.filter(r=>r.life>0);ctx.globalAlpha=1;requestAnimationFrame(frame);}requestAnimationFrame(frame);
$('cameraOn').onclick=async()=>{try{if(!navigator.mediaDevices)throw Error('Usa localhost o HTTPS para la cámara');if($('camera').srcObject){$('camera').srcObject.getTracks().forEach(t=>t.stop());$('camera').srcObject=null;$('cameraOn').textContent='Activar cámara';return;}$('camera').srcObject=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:1920},height:{ideal:1080},facingMode:'user'},audio:false});$('cameraOn').textContent='Apagar cámara';$('message').textContent='';}catch(e){$('message').textContent='Cámara: '+e.message;}};
$('sound').onclick=async()=>{audio??=new AudioContext();await audio.resume();$('sound').textContent='Sonido activado';};
