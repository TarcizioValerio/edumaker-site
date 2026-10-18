<?php
// Configuração comum: .env, banco (PostgreSQL), PHPMailer e antispam por IP.
require_once __DIR__ . '/../vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();
require_once __DIR__ . '/../config/pdo.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

function voltar(string $status, string $ancora): void {
    header("Location: ../index.html?status=$status#$ancora");
    exit;
}

function exigir_post(string $ancora): void {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !empty($_POST['Veri']) || empty($_POST['lgpd'])) {
        voltar('erro', $ancora); // honeypot preenchido ou sem consentimento LGPD
    }
}

function ip_hash(): string {
    $ip = filter_input(INPUT_SERVER, 'REMOTE_ADDR', FILTER_VALIDATE_IP);
    if (!$ip) { voltar('erro', 'contato'); }
    return hash_hmac('sha256', $ip, $_ENV['IP_HASH_KEY']);
}

function limitar(PDO $pdo, string $tabela, string $hash, string $ancora): void {
    $q = $pdo->prepare("SELECT COUNT(*) FROM $tabela WHERE ip_hash = :h AND data_envio >= NOW() - INTERVAL '10 minutes'");
    $q->execute([':h' => $hash]);
    if ($q->fetchColumn() >= 5) { voltar('limite', $ancora); }
}

function enviar_email(string $assunto, string $html, ?string $replyEmail = null, string $replyNome = ''): bool {
    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host = 'smtp.gmail.com';
        $mail->SMTPAuth = true;
        $mail->Username = $_ENV['MAIL_USER'];
        $mail->Password = $_ENV['MAIL_PASS'];
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = 587;
        $mail->CharSet = 'UTF-8';
        $mail->setFrom($_ENV['MAIL_USER'], 'Site EDUMaker');
        // MAIL_DESTINO (opcional) = e-mail que recebe os pedidos; se vazio, usa o próprio MAIL_USER
        $mail->addAddress(!empty($_ENV['MAIL_DESTINO']) ? $_ENV['MAIL_DESTINO'] : $_ENV['MAIL_USER']);
        if ($replyEmail) { $mail->addReplyTo($replyEmail, $replyNome); }
        $mail->isHTML(true);
        $mail->Subject = $assunto;
        $mail->Body = $html;
        $mail->send();
        return true;
    } catch (Exception $e) {
        return false;
    }
}

function limpar(string $k, int $max): string {
    return mb_substr(trim((string)($_POST[$k] ?? '')), 0, $max);
}
