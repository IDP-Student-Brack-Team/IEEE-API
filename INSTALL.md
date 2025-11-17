# 🚀 Guia de Instalação e Configuração - IEEE API

## Passos para Instalação

### 1. Instalar Dependências
 
```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Edite o arquivo `.env` e configure suas variáveis de acordo com seu ambiente.

> 📝 **Nota**: O arquivo `.env.example` contém todas as variáveis necessárias com documentação detalhada e exemplos de valores. Consulte os comentários no arquivo para entender cada configuração.

**Variáveis principais que você deve configurar:**

- **DATABASE_URL**: String de conexão do PostgreSQL
- **JWT_SECRET**: Chave secreta para tokens JWT (MUDE em produção!)
- **MAIL_***: Credenciais do servidor SMTP para envio de e-mails
- **PORT**: Porta onde a aplicação rodará (padrão: 3000)
- **CORS_ORIGIN**: URL do frontend permitido

Para mais detalhes sobre cada variável, consulte o arquivo `.env.example` que contém documentação completa.

### 3. Configurar Banco de Dados PostgreSQL

#### Opção A: Usando Docker (Recomendado)

```bash
docker-compose up -d postgres
```

#### Opção B: Instalação Local

1. Instale o PostgreSQL: <https://www.postgresql.org/download/>
2. Crie o banco de dados:

```bash
createdb ieee_db
```

### 4. Executar Migrations do Prisma

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 5. (Opcional) Popular o Banco com Dados de Teste

```bash
npm run prisma:seed
```

Isso criará:

- **Admin**: `admin@ieee.org` / `Admin@123`
- **User**: `user@ieee.org` / `User@123`
- Um evento de exemplo
- Comentário de exemplo

### 6. Iniciar o Servidor

**Desenvolvimento (com hot-reload):**

```bash
npm run start:dev
```

**Produção:**

```bash
npm run build
npm run start:prod
```

### 7. Acessar a API

- **API**: <http://localhost:3000/api/v1>
- **Documentação Swagger**: <http://localhost:3000/api/docs>
- **Prisma Studio** (Admin do BD): `npm run prisma:studio`

## 📋 Testando a API

### 1. Registrar um Novo Usuário

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva",
    "email": "joao@example.com",
    "password": "Senha@123",
    "ieeeNumber": "12345678"
  }'
```

### 2. Fazer Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ieee.org",
    "password": "Admin@123"
  }'
```

Salve o `access_token` retornado para usar nas próximas requisições.

### 3. Listar Eventos (sem autenticação)

```bash
curl http://localhost:3000/api/v1/events
```

### 4. Ver Perfil (com autenticação)

```bash
curl http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

## 🐳 Usando Docker

### Iniciar todos os serviços

```bash
docker-compose up -d
```

Isso iniciará:

- PostgreSQL na porta 5432
- API na porta 3000

### Ver logs

```bash
docker-compose logs -f api
```

### Parar os serviços

```bash
docker-compose down
```

## 🛠️ Scripts Úteis

```bash
# Desenvolvimento
npm run start:dev          # Inicia em modo desenvolvimento
npm run lint              # Verifica código com ESLint
npm run format            # Formata código com Prettier

# Testes
npm run test              # Executa testes unitários
npm run test:e2e          # Executa testes e2e
npm run test:cov          # Cobertura de testes

# Prisma
npm run prisma:generate   # Gera Prisma Client
npm run prisma:migrate    # Executa migrations
npm run prisma:studio     # Abre interface visual do BD
npm run prisma:seed       # Popula banco com dados iniciais

# Build
npm run build             # Compila para produção
npm run start:prod        # Inicia em produção
```

## 🔒 Configurando E-mail (Gmail)

1. Acesse: <https://myaccount.google.com/apppasswords>
2. Crie uma senha de app
3. Use essa senha no `.env`:

```env
MAIL_USER="seu-email@gmail.com"
MAIL_PASSWORD="senha-de-app-gerada"
```

## 📊 Prisma Studio

Para gerenciar o banco de dados visualmente:

```bash
npm run prisma:studio
```

Abrirá em: <http://localhost:5555>

## 🚨 Troubleshooting

### Erro de conexão com banco de dados

- Verifique se o PostgreSQL está rodando
- Confirme a `DATABASE_URL` no `.env`
- Teste a conexão: `npm run prisma:studio`

### Erro "Cannot find module @prisma/client"

```bash
npm run prisma:generate
```

### Porta 3000 já em uso

Altere no `.env`:

```env
PORT=3001
```

### Erro ao enviar e-mails

- Verifique as credenciais SMTP no `.env`
- Se usar Gmail, ative "Acesso a apps menos seguros" ou use senha de app

## 🎯 Próximos Passos

Depois de instalar, você pode:

1. ✅ Explorar a documentação Swagger
2. ✅ Testar os endpoints com Postman/Insomnia
3. ✅ Criar novos eventos como administrador
4. ✅ Testar o sistema de comentários
5. ✅ Verificar o envio de e-mails

## 📝 Notas Importantes

- **Nunca** commite o arquivo `.env`
- Mude o `JWT_SECRET` em produção
- Configure CORS adequadamente para produção
- Use HTTPS em produção
- Configure backups regulares do banco de dados

## 🔗 Links Úteis

- [Documentação NestJS](https://docs.nestjs.com/)
- [Documentação Prisma](https://www.prisma.io/docs/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
