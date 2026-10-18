<?php
// Demandas de escolas, instituições e comunidade ao laboratório EDUMaker
require_once __DIR__ . '/bootstrap.php';
exigir_post('demandas');

$nome        = limpar('nome', 120);
$email       = limpar('email', 160);
$email       = $email === '' ? null : filter_var($email, FILTER_VALIDATE_EMAIL);
$telefone    = limpar('telefone', 20);
$instituicao = limpar('instituicao', 160);
$detalhe     = limpar('detalhamento', 2000);

// e-mail digitado mas inválido
if ($email === false) { voltar('erro', 'demandas'); }
// telefone: aceita só dígitos e + ( ) - espaço; 10 a 13 dígitos (com DDD)
if ($telefone !== '') {
    $digitos = preg_replace('/\D/', '', $telefone);
    if (!preg_match('/^[0-9+()\-\s]+$/', $telefone) || strlen($digitos) < 10 || strlen($digitos) > 13) {
        voltar('erro', 'demandas');
    }
}
// precisa de pelo menos um meio de contato
if (!$nome || !$instituicao || !$detalhe || (!$email && $telefone === '')) { voltar('erro', 'demandas'); }

$hash = ip_hash();
limitar($pdo, 'demanda', $hash, 'demandas');

// Guarda no banco; se o banco falhar, o e-mail ainda é enviado
try {
    $pdo->prepare("INSERT INTO demanda (nome, telefone, email, instituicao, detalhamento, ip_hash)
                   VALUES (:n, :t, :e, :i, :d, :h)")
        ->execute([':n' => $nome, ':t' => $telefone ?: null, ':e' => $email ?: null,
                   ':i' => $instituicao, ':d' => $detalhe, ':h' => $hash]);
} catch (Throwable $e) {
    error_log('EDUMaker demanda: ' . $e->getMessage());
}

$h = fn($s) => htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
$ok = enviar_email(
    'Nova demanda — ' . $instituicao,
    '<h3>Nova demanda pelo site</h3>' .
    '<p><b>Nome:</b> ' . $h($nome) . '<br>' .
    '<b>Escola/Instituição:</b> ' . $h($instituicao) . '<br>' .
    '<b>Telefone:</b> ' . ($telefone !== '' ? $h($telefone) : '—') . '<br>' .
    '<b>E-mail:</b> ' . ($email ? $h($email) : '—') . '</p>' .
    '<p><b>Detalhamento:</b><br>' . nl2br($h($detalhe)) . '</p>',
    $email ?: null, $nome
);
voltar($ok ? 'demanda_ok' : 'erro', 'demandas');
