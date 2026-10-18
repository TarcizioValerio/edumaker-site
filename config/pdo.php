<?php
// Esse código faz a ligaçao do php com o banco de dados, as informações do banco estão no env
$name = $_SERVER["DB_NAME"];
$user = $_SERVER["DB_USER"];
$host = $_SERVER["DB_HOST"];
$pass = $_SERVER["DB_PASS"];
$port = $_SERVER["DB_PORT"];

try {
    $pdo = new PDO("pgsql:dbname=$name;host=$host;port=$port","$user","$pass");
} catch(PDOException $e) {
    echo "Erro no banco: ".$e;
} catch(Exception $e) {
    echo "Erro generico: ".$e;
}
?>