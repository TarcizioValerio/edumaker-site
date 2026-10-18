<?php
// RF01 — Dúvidas e sugestões ao facilitador maker
require_once __DIR__ . '/bootstrap.php';
exigir_post('contato');

$tipo     = ($_POST['tipo'] ?? '') === 'sugestao' ? 'sugestao' : 'duvida';
$nome     = limpar('nome', 120);
$email    = filter_var(limpar('email', 160), FILTER_VALIDATE_EMAIL);
$assunto  = limpar('assunto', 160);
$mensagem = limpar('mensagem', 2000);
if (!$nome || !$email || !$mensagem) { voltar('erro', 'contato'); }

$hash = ip_hash();
limitar($pdo, 'contato', $hash, 'contato');

$pdo->prepare("INSERT INTO contato (tipo, nome, email, assunto, mensagem, ip_hash)
               VALUES (:t, :n, :e, :a, :m, :h)")
    ->execute([':t' => $tipo, ':n' => $nome, ':e' => $email, ':a' => $assunto, ':m' => $mensagem, ':h' => $hash]);

$h = fn($s) => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
$ok = enviar_email(
    '[' . ($tipo === 'sugestao' ? 'Sugestão' : 'Dúvida') . '] ' . ($assunto ?: 'Sem assunto'),
    '<p><b>' . $h($nome) . '</b> (' . $h($email) . ')</p><p>' . nl2br($h($mensagem)) . '</p>',
    $email, $nome
);
voltar($ok ? 'msg_ok' : 'erro', 'contato');
