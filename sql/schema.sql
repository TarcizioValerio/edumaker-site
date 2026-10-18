-- PostgreSQL
CREATE TABLE IF NOT EXISTS contato (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(10) NOT NULL DEFAULT 'duvida' CHECK (tipo IN ('duvida','sugestao')),
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL,
  assunto VARCHAR(160),
  mensagem TEXT NOT NULL,
  ip_hash CHAR(64) NOT NULL,
  data_envio TIMESTAMP NOT NULL DEFAULT NOW()
);
-- Se a tabela já existe: ALTER TABLE contato ADD COLUMN tipo VARCHAR(10) NOT NULL DEFAULT 'duvida';

CREATE TABLE IF NOT EXISTS visita_tecnica (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL,
  origem VARCHAR(120),
  visitantes INT NOT NULL DEFAULT 1,
  data_hora TIMESTAMP NOT NULL,
  mensagem TEXT,
  status VARCHAR(12) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','confirmada','cancelada')),
  ip_hash CHAR(64) NOT NULL,
  data_envio TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS demanda (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  telefone VARCHAR(20),
  email VARCHAR(160),
  instituicao VARCHAR(160) NOT NULL,
  detalhamento TEXT NOT NULL,
  ip_hash CHAR(64) NOT NULL,
  data_envio TIMESTAMP NOT NULL DEFAULT NOW(),
  CHECK (telefone IS NOT NULL OR email IS NOT NULL)
);
