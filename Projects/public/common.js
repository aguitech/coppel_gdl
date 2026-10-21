export function connect(role,onState){
 let ws,credentials=null,retry,closed=false;
 const $=id=>document.getElementById(id),status=t=>$('status').textContent=t;
 function start(){
  ws=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}/ws`);
  ws.onopen=()=>ws.send(JSON.stringify({type:'auth',role,...credentials}));
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.type==='ready'){$('auth').classList.add('hidden');$('authError').textContent='';status(m.mode==='demo'?'Conectado · DATOS DEMO':'Conectado · prerregistro online');}
   if(m.type==='state')onState(m.state);
   if(m.type==='error'){$('message').textContent=m.message;window.dispatchEvent(new Event('portal-error'));}
  };
  ws.onerror=()=>status('No se pudo conectar');
  ws.onclose=e=>{status('Desconectado · controles pausados');window.dispatchEvent(new Event('portal-disconnect'));if(e.code===1008){$('auth').classList.remove('hidden');$('authError').textContent='Verifica clave y nombre de estación.';return;}if(!closed)retry=setTimeout(start,1500);};
 }
 $('authForm').onsubmit=e=>{e.preventDefault();credentials={station:$('station').value.trim(),token:$('token').value};clearTimeout(retry);start();};
 $('fullscreen')?.addEventListener('click',()=>document.documentElement.requestFullscreen().catch(()=>{$('message').textContent='No se pudo activar pantalla completa';}));
 window.addEventListener('beforeunload',()=>{closed=true;clearTimeout(retry);ws?.close();});
 return m=>{if(ws?.readyState!==WebSocket.OPEN){$('message').textContent='Espera la reconexión';return false;}ws.send(JSON.stringify(m));return true;};
}
