<?php
// NUEVO endpoint de lectura. No sustituir APIs existentes.
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
function reply(int $status, array $data): void { http_response_code($status);echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') reply(405,['ok'=>false]);
$key=getenv('FUTURO_BRIDGE_TOKEN') ?: '';
if(strlen($key)<24 || !hash_equals($key, $_SERVER['HTTP_X_PORTAL_KEY'] ?? '')) reply(401,['ok'=>false]);
$body=file_get_contents('php://input',false,null,0,4097);
if(strlen($body)>4096) reply(413,['ok'=>false]);
$j=json_decode($body,true);$code=$j['code']??null;
if(!is_string($code)||!preg_match('/\A[A-Za-z0-9-]{3,40}\z/',$code))reply(400,['ok'=>false]);
try {
 // Configurar en hosting; usuario de BD con SELECT únicamente.
 $pdo=new PDO(getenv('FUTURO_DB_DSN') ?: '',getenv('FUTURO_DB_USER') ?: '',getenv('FUTURO_DB_PASSWORD') ?: '',[
  PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false]);
 // Mapeo basado en la estructura usuario/code/nombre/deseo del proyecto.
 // Confirmar nombres reales antes de activar DATA_MODE=live.
 $q=$pdo->prepare('SELECT code, nombre, deseo FROM usuario WHERE code = :code LIMIT 1');
 $q->execute(['code'=>$code]);$row=$q->fetch(PDO::FETCH_ASSOC);
 if(!$row)reply(404,['ok'=>false]);
 reply(200,['ok'=>true,'participant'=>$row]);
} catch(Throwable $e) { error_log('Futuro: fallo al consultar prerregistro');reply(500,['ok'=>false]); }
