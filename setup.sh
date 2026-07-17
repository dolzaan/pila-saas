#!/bin/bash

# ==========================================
# Script de Instalação Rápida - Pila SaaS
# ==========================================
# Este script prepara uma VM nova para rodar o projeto do zero.

echo "🚀 Iniciando a configuração da VM para o Pila SaaS..."

# 1. Verifica se o Docker está instalado
if ! command -v docker &> /dev/null
then
    echo "🐳 Docker não encontrado. Instalando Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo "✅ Docker instalado com sucesso!"
else
    echo "✅ Docker já está instalado."
fi

# 2. Verifica se o Docker Compose está instalado
if ! command -v docker-compose &> /dev/null
then
    echo "🐙 Instalando Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose instalado com sucesso!"
else
    echo "✅ Docker Compose já está instalado."
fi

# 3. Criação dos arquivos .env (caso não existam)
echo "🔐 Verificando arquivos .env..."

if [ ! -f ".env" ]; then
    echo "Criando .env raiz..."
    cat <<EOF > .env
# Chave de segurança do sistema (Gerada automaticamente)
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="http://localhost:3000"

# Banco de Dados
DATABASE_URL="postgresql://finzap:finzap@finzap_postgres:5432/finzap?schema=public"

# API do WhatsApp (Evolution)
EVOLUTION_API_URL="http://evolution_api:8080"
EVOLUTION_API_KEY="pila-super-secret-key-2026"
EVOLUTION_INSTANCE_NAME="pila-bot"
EOF
    echo "✅ .env raiz criado!"
fi

if [ ! -f "packages/database/.env" ]; then
    echo "Criando .env do banco de dados..."
    mkdir -p packages/database
    cat <<EOF > packages/database/.env
DATABASE_URL="postgresql://finzap:finzap@localhost:5432/finzap?schema=public"
EOF
    echo "✅ .env do banco criado!"
fi

if [ ! -f "apps/web/.env" ]; then
    echo "Criando .env do front-end..."
    mkdir -p apps/web
    cat <<EOF > apps/web/.env
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="http://localhost:3000"
DATABASE_URL="postgresql://finzap:finzap@finzap_postgres:5432/finzap?schema=public"
EVOLUTION_API_URL="http://evolution_api:8080"
EVOLUTION_API_KEY="pila-super-secret-key-2026"
EVOLUTION_INSTANCE_NAME="pila-bot"
EOF
    echo "✅ .env do front-end criado!"
fi

# 4. Construindo e subindo os containers
echo "🏗️ Construindo e iniciando o projeto no Docker..."
docker-compose up -d --build

echo "=========================================="
echo "🎉 TUDO PRONTO! O Pila SaaS está rodando."
echo "=========================================="
echo "👉 Acesse o painel em: http://SEU_IP:3000"
echo "👉 Acesse o banco de dados via Prisma Studio:"
echo "   npx prisma studio --workspace=packages/database"
echo ""
echo "Nota: Se esta é a primeira vez que instala o Docker na máquina,"
echo "talvez seja necessário deslogar e logar de novo ou rodar 'newgrp docker'"
echo "para rodar os comandos do Docker sem usar o 'sudo'."
