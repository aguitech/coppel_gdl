# Tu futuro está en tus manos — demo de dos pantallas

Código fuente para Afore Coppel. HTML/CSS/Canvas + Node.js + WebSockets + puente PHP/PDO de lectura de la base online existente.

El código vive en `Projects/coppel_gdl/` dentro del repositorio. Ejecuta los comandos desde esa carpeta.

## Arranque rápido

Requiere Node.js 22 o superior y npm.

```bash
npm install
cp .env.example .env
# Edita STATION_TOKEN (16 caracteres o más).
npm start
```

Abre http://localhost:3000. Arrastra la ventana `/display` al monitor de 65” y `/touch` al monitor touch, usando escritorio extendido (no duplicado). Introduce la misma estación `gdl-01` y la clave STATION_TOKEN en ambas. En el touch introduce `DEMO123` y pulsa cargar. Activa cámara, sonido y fullscreen en la pantalla principal. Los botones generan efectos diferentes; el área inferior permite elegir dónde explota la energía. Nuevo participante limpia ambas pantallas.

La cámara se conecta al equipo que ejecuta `/display`. El video no viaja por WebSockets: se dibuja localmente. Solo viajan nombre/meta y comandos ligeros. La aplicación acepta lector QR tipo teclado o pegar una URL con `?code=...`; no incluye lector QR con cámara.

## Datos REALES de tupeliculafinanciera.com

El ZIP no contiene acceso a tu servidor ni credenciales. No se ha consultado la base real ni instalado nada en producción. El modo inicial utiliza datos ficticios claramente identificados. El endpoint de abajo es NUEVO y debe instalarse antes de usarlo; no se presupone que ya exista.

1. Copia `php/futuro_preregistro.php` a `/api/futuro_preregistro.php` del hosting de tupeliculafinanciera.com.
2. Configura estas variables en PHP-FPM/hosting (un `.env` no se carga automáticamente en PHP):

```text
FUTURO_BRIDGE_TOKEN=clave-aleatoria-de-al-menos-24-caracteres
FUTURO_DB_DSN=mysql:host=localhost;dbname=TU_BASE;charset=utf8mb4
FUTURO_DB_USER=usuario_solo_lectura
FUTURO_DB_PASSWORD=tu_password
```

3. Confirma la consulta del PHP: tabla `usuario`, campos `code`, `nombre`, `deseo`. Este mapeo procede de la estructura compartida del proyecto y debe comprobarse contra tu esquema actual. Crea un usuario con permiso SELECT sobre esa tabla o reutiliza una cuenta autorizada de lectura. No requiere cambiar tablas ni guardar registros nuevos.
4. Cambia `.env` de Node y reinicia:

```text
DATA_MODE=live
BRIDGE_URL=https://tupeliculafinanciera.com/api/futuro_preregistro.php
BRIDGE_TOKEN=misma-clave-que-FUTURO_BRIDGE_TOKEN
```

Node hace POST por HTTPS con `X-Portal-Key` y `{ "code": "..." }`. PHP consulta con parámetros y devuelve `{ "ok": true, "participant": { "code": "...", "nombre": "...", "deseo": "..." } }`. Ante error de la API, se muestra error; jamás se sustituye silenciosamente por datos demo. No se extraen correos, edades, firmas o fotos. El nombre/meta se pintan con textContent.

## Dos computadoras o hosting

Un solo servidor Node coordina las dos pantallas. En una sola PC, localhost sirve para ambos monitores. Para distintos equipos: HOST=0.0.0.0, firewall solo para la LAN y ALLOWED_ORIGINS con los orígenes exactos separados por comas. `/display` necesita HTTPS para cámara fuera de localhost. Usa proxy HTTPS/WSS hacia Node y habilita Upgrade/Connection de WebSocket. No basta con subir estos archivos a un hosting que solo ejecuta PHP; Node necesita un proceso persistente (p. ej. tu VPS/EasyPanel).

La base permanece online en el hosting actual y solo la consulta cruza internet. La sincronización puede permanecer dentro de la LAN. No expongas el puerto Node a internet sin TLS y control de red. Las claves se introducen por pantalla y quedan únicamente en memoria, nunca en URL ni localStorage. Quien conoce la clave de estación puede usar el rol touch; no es un sistema de cuentas de producción.

## Sincronización y límites del demo

El servidor mantiene estado autoritativo por estación, con sesión/revisión. Reconectar restaura participante y escena; no reenvía comandos pendientes ni reproduce destellos antiguos. Heartbeat detecta conexiones rotas. Un reset invalida consultas en curso. Estado efímero en memoria: reiniciar Node limpia sesiones. A los 3 minutos sin interacción se limpian datos del participante (revisión cada 15 s). No registra nombres, códigos ni eventos en disco. Usa una sola instancia Node; para varias instancias se necesita un estado/pubsub compartido.

Implementado: cámara espejo, cuatro efectos, final, tablero con coordenadas, fullscreen, audio opcional, consulta de prerregistro y aislamiento entre estaciones. El efecto cambia por decisiones, no por análisis del rostro.

Kinect/Processing NO están implementados en este demo. El motor visual aquí es Canvas. Para la siguiente fase, un adaptador de Processing/Kinect puede enviar posiciones normalizadas de manos al coordinador, con rol de sensor y token propio; conviene definir ese contrato tras probar el modelo exacto de Kinect. Tampoco incluye chroma key, grabación de video, descarga por QR, analítica persistente o captura de consentimiento. El recuerdo por QR de la propuesta comercial queda para otra fase.

## Pruebas

```bash
npm test
```

Prueba integración real de WebSockets: autenticación, roles, aislamiento, carga demo, eventos, recuperación de estado y reset. La cámara, pantalla completa y ajuste de imagen requieren una prueba manual en el equipo del evento. Prueba la API con un código autorizado antes de activar live.

## Referencias técnicas

- https://github.com/websockets/ws (servidor y heartbeat)
- https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia (cámara y contexto seguro)
