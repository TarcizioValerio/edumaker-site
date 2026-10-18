<?php
// RF02 — Agendamento de visita técnica
require_once __DIR__ . '/bootstrap.php';
exigir_post('visita');

$nome   = limpar('nome', 120);
$email  = filter_var(limpar('email', 160), FILTER_VALIDATE_EMAIL);
$origem = limpar('origem', 120);
$msg    = limpar('mensagem', 800);
$qtd    = max(1, min(40, (int)($_POST['visitantes'] ?? 1)));
$data   = DateTime::createFromFormat('Y-m-d', $_POST['data'] ?? '');
$hora   = $_POST['hora'] ?? '';
$horas  = ['08:00','09:00','10:00','11:00','14:00','15:00','16:00'];

if (!$nome || !$email || !$data || !in_array($hora, $horas, true)) { voltar('erro', 'visita'); }
$hoje = new DateTime('today');
if ($data <= $hoje || (int)$data->format('N') > 5) { voltar('erro', 'visita'); }

$dataHora = $data->format('Y-m-d') . ' ' . $hora . ':00';
$hash = ip_hash();
limitar($pdo, 'visita_tecnica', $hash, 'visita');

$pdo->prepare("INSERT INTO visita_tecnica (nome, email, origem, visitantes, data_hora, mensagem, status, ip_hash)
               VALUES (:n, :e, :o, :q, :d, :m, 'pendente', :h)")
    ->execute([':n' => $nome, ':e' => $email, ':o' => $origem, ':q' => $qtd, ':d' => $dataHora, ':m' => $msg, ':h' => $hash]);

$h = fn($s) => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
$ok = enviar_email(
    'Pedido de visita técnica — ' . $data->format('d/m/Y') . ' ' . $hora,
    '<h3>Pedido de visita técnica</h3>' .
    '<p><b>Data e horário:</b> ' . $data->format('d/m/Y') . ' às ' . $hora . '<br>' .
    '<b>Nome:</b> ' . $h($nome) . '<br><b>E-mail:</b> ' . $h($email) . '<br>' .
    '<b>Visitantes:</b> ' . $qtd . '<br><b>Instituição/turma:</b> ' . ($origem !== '' ? $h($origem) : '—') . '</p>' .
    '<p><b>O que gostaria de conhecer:</b><br>' . ($msg !== '' ? nl2br($h($msg)) : '—') . '</p>',
    $email, $nome
);
voltar($ok ? 'visita_ok' : 'erro', 'visita');
