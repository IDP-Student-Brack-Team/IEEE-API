# 🏗️ Arquitetura do Sistema - IEEE API

## 📐 Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React/Next.js)                 │
│                         http://localhost:3001                    │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP/REST
                             │ CORS habilitado
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        NestJS API Server                         │
│                     http://localhost:3000/api/v1                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Guards     │  │ Interceptors │  │   Filters    │         │
│  │  (Auth/Role) │  │  (Logging)   │  │  (Errors)    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
├─────────────────────────────────────────────────────────────────┤
│                         Controllers                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │   Auth   │ │  Users   │ │  Events  │ │ Comments │         │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                       │
│  │   Reg.   │ │ Uploads  │ │   Mail   │                       │
│  └──────────┘ └──────────┘ └──────────┘                       │
├─────────────────────────────────────────────────────────────────┤
│                           Services                               │
│  (Lógica de Negócio)                                            │
├─────────────────────────────────────────────────────────────────┤
│                        Prisma ORM                                │
│  (Geração de Queries + Type Safety)                             │
└────────────────────────────┬────────────────────────────────────┘
                             │ SQL
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PostgreSQL Database                         │
│                         Port 5432                                │
└─────────────────────────────────────────────────────────────────┘

        │                                │
        ▼                                ▼
  ┌──────────┐                    ┌──────────┐
  │  Email   │                    │  Uploads │
  │  Server  │                    │  Storage │
  │  (SMTP)  │                    │ (./uploads) │
  └──────────┘                    └──────────┘
```

## 🔄 Fluxo de Requisição

### 1. Requisição Não Autenticada (Ex: Login)

```
Client
  │
  ├─▶ POST /api/v1/auth/login
  │
  ├─▶ ValidationPipe (valida DTO)
  │
  ├─▶ AuthController.login()
  │
  ├─▶ LocalAuthGuard (valida credenciais)
  │
  ├─▶ AuthService.login()
  │   │
  │   ├─▶ UsersService.findByEmail()
  │   │
  │   ├─▶ bcrypt.compare() (verifica senha)
  │   │
  │   └─▶ JwtService.sign() (gera token)
  │
  └─▶ Response { access_token, user }
```

### 2. Requisição Autenticada (Ex: Ver Perfil)

```
Client (com token)
  │
  ├─▶ GET /api/v1/users/me
  │   Header: Authorization: Bearer <token>
  │
  ├─▶ JwtAuthGuard (valida token)
  │   │
  │   └─▶ JwtStrategy.validate()
  │       │
  │       └─▶ Extrai user do payload
  │
  ├─▶ UsersController.getProfile()
  │   │
  │   └─▶ @CurrentUser() decorator injeta user
  │
  ├─▶ UsersService.findOne(user.id)
  │   │
  │   └─▶ PrismaService.user.findUnique()
  │
  └─▶ Response { user data }
```

### 3. Requisição Admin (Ex: Criar Evento)

```
Client (com admin token)
  │
  ├─▶ POST /api/v1/events
  │   Header: Authorization: Bearer <admin-token>
  │
  ├─▶ JwtAuthGuard (valida token)
  │
  ├─▶ RolesGuard (verifica role)
  │   │
  │   └─▶ @Roles(Role.ADMIN) decorator
  │
  ├─▶ ValidationPipe (valida CreateEventDto)
  │
  ├─▶ EventsController.create()
  │
  ├─▶ EventsService.create()
  │   │
  │   ├─▶ Gera slug único
  │   │
  │   ├─▶ PrismaService.event.create()
  │   │
  │   └─▶ Salva imagens se houver
  │
  ├─▶ AuditLogService.log() (registra ação)
  │
  └─▶ Response { event created }
```

## 🗂️ Organização de Módulos

### Module Pattern (NestJS)

```
📦 Módulo (ex: UsersModule)
 ├─ 📄 users.module.ts          # Declaração do módulo
 ├─ 🎮 users.controller.ts      # Rotas HTTP
 ├─ 🔧 users.service.ts         # Lógica de negócio
 ├─ 📋 dto/
 │   ├─ create-user.dto.ts      # DTO para criação
 │   └─ update-user.dto.ts      # DTO para atualização
 └─ 🧪 users.service.spec.ts    # Testes
```

### Dependências entre Módulos

```
AppModule
  │
  ├─▶ ConfigModule (global)
  ├─▶ ThrottlerModule (global)
  ├─▶ PrismaModule (global)
  │
  ├─▶ AuthModule
  │   ├─ imports: [UsersModule, MailModule, JwtModule]
  │   └─ exports: [AuthService]
  │
  ├─▶ UsersModule
  │   └─ exports: [UsersService]
  │
  ├─▶ EventsModule
  │   ├─ imports: [UploadsModule]
  │   └─ exports: [EventsService]
  │
  ├─▶ CommentsModule
  │   └─ imports: [EventsModule]
  │
  ├─▶ RegistrationsModule
  │   └─ imports: [EventsModule, MailModule]
  │
  ├─▶ UploadsModule
  │   └─ exports: [UploadsService]
  │
  └─▶ MailModule
      └─ exports: [MailService]
```

## 🔐 Camadas de Segurança

```
Request
  │
  ├─▶ 1. CORS Middleware
  │   └─ Verifica origem
  │
  ├─▶ 2. Rate Limiting (Throttler)
  │   └─ Limita requisições por IP
  │
  ├─▶ 3. ValidationPipe
  │   └─ Valida e transforma dados
  │
  ├─▶ 4. JwtAuthGuard
  │   └─ Verifica token JWT
  │
  ├─▶ 5. RolesGuard
  │   └─ Verifica permissões
  │
  ├─▶ 6. Service Layer
  │   └─ Lógica de negócio + validações
  │
  ├─▶ 7. Prisma ORM
  │   └─ SQL injection protection
  │
  └─▶ Response
```

## 💾 Modelo de Dados (Prisma)

```
┌─────────────────┐
│      User       │
│─────────────────│
│ id (PK)         │
│ email (unique)  │
│ password        │
│ ieeeNumber      │
│ role            │◀────────┐
│ avatarUrl       │         │
└─────────────────┘         │
        │                   │
        │ 1:N               │ 1:N
        ▼                   │
┌─────────────────┐         │
│      Event      │─────────┘
│─────────────────│  createdBy
│ id (PK)         │
│ title           │
│ slug (unique)   │
│ description     │
│ status          │
│ startDate       │
└─────────────────┘
        │
        │ 1:N
        ├────────────┬────────────┐
        ▼            ▼            ▼
┌─────────────┐ ┌────────┐ ┌──────────────┐
│ EventImage  │ │Comment │ │EventRegistr. │
│─────────────│ │────────│ │──────────────│
│ id (PK)     │ │id (PK) │ │id (PK)       │
│ eventId(FK) │ │eventId │ │eventId (FK)  │
│ url         │ │userId  │ │userId (FK)   │
│ caption     │ │content │ │status        │
└─────────────┘ │parentId│ │additionalInfo│
                └────────┘ └──────────────┘
                    │
                    │ self-referencing
                    └─────┐ (replies)
                          │
                          ▼
```

## 🚀 Deployment

### Ambiente de Desenvolvimento

```
┌─────────────────┐
│   Developer     │
│   Machine       │
├─────────────────┤
│ Node.js         │
│ PostgreSQL      │
│ npm run dev     │
└─────────────────┘
```

### Ambiente de Produção (Sugerido)

```
┌──────────────────────────────────────┐
│         Cloud Provider               │
│    (AWS/Azure/Google Cloud)          │
├──────────────────────────────────────┤
│                                      │
│  ┌────────────────┐                 │
│  │  Load Balancer │                 │
│  └────────┬───────┘                 │
│           │                          │
│    ┌──────┴──────┐                  │
│    │             │                  │
│  ┌─▼──┐       ┌──▼─┐               │
│  │API │       │API │  (replicas)   │
│  │ #1 │       │ #2 │               │
│  └─┬──┘       └──┬─┘               │
│    │             │                  │
│    └──────┬──────┘                  │
│           │                          │
│    ┌──────▼──────┐                  │
│    │  PostgreSQL │                  │
│    │  (Managed)  │                  │
│    └─────────────┘                  │
│                                      │
│    ┌─────────────┐                  │
│    │   Storage   │                  │
│    │ (S3/Blob)   │                  │
│    └─────────────┘                  │
│                                      │
│    ┌─────────────┐                  │
│    │  Email Svc  │                  │
│    │ (SendGrid)  │                  │
│    └─────────────┘                  │
└──────────────────────────────────────┘
```

## 📊 Performance e Escalabilidade

### Otimizações Implementadas

1. **Database Level**
   - Índices em campos frequentemente buscados
   - Queries otimizadas (select apenas necessário)
   - Paginação em listagens

2. **Application Level**
   - Validação de dados no DTO
   - Rate limiting por rota
   - Compressão de respostas

3. **Caching (Futuro)**
   ```
   API Server ─┬─▶ Redis Cache ─▶ PostgreSQL
               │
               └─▶ PostgreSQL (cache miss)
   ```

## 🔄 CI/CD Pipeline (Sugerido)

```
┌──────────────┐
│ Git Push     │
│ (GitHub)     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ GitHub       │
│ Actions      │
├──────────────┤
│ - Lint       │
│ - Test       │
│ - Build      │
│ - Deploy     │
└──────┬───────┘
       │
       ├─▶ Build Docker Image
       │
       ├─▶ Push to Registry
       │
       └─▶ Deploy to Production
```

## 📱 Integração com Frontend

### Fluxo de Autenticação

```
Frontend                    Backend
  │                           │
  ├─▶ POST /auth/login       │
  │                           ├─▶ Valida credenciais
  │                           ├─▶ Gera JWT
  │                           │
  │ ◀─┤ { access_token }      │
  │                           │
  ├─▶ Salva token no         │
  │   localStorage/cookie    │
  │                           │
  ├─▶ GET /users/me          │
  │   Header: Bearer token   │
  │                           ├─▶ Valida token
  │                           ├─▶ Retorna user
  │ ◀─┤ { user }              │
  │                           │
  └─▶ Atualiza estado global │
```

## 🛡️ Compliance e Segurança (LGPD)

```
┌─────────────────────────────────────┐
│     Dados Pessoais (LGPD)           │
├─────────────────────────────────────┤
│                                     │
│  ┌────────────────┐                │
│  │ Criptografia   │                │
│  │ (bcrypt)       │                │
│  └────────────────┘                │
│                                     │
│  ┌────────────────┐                │
│  │ Logs de        │                │
│  │ Auditoria      │                │
│  └────────────────┘                │
│                                     │
│  ┌────────────────┐                │
│  │ Controle de    │                │
│  │ Acesso (RBAC)  │                │
│  └────────────────┘                │
│                                     │
│  ┌────────────────┐                │
│  │ Backup Regular │                │
│  └────────────────┘                │
│                                     │
└─────────────────────────────────────┘
```

## 📈 Monitoramento (Futuro)

```
┌──────────────────────────────────────┐
│        Monitoring Stack              │
├──────────────────────────────────────┤
│                                      │
│  ┌────────────┐  ┌────────────┐    │
│  │ Prometheus │  │  Grafana   │    │
│  │ (Metrics)  │  │(Dashboards)│    │
│  └────────────┘  └────────────┘    │
│                                      │
│  ┌────────────┐  ┌────────────┐    │
│  │    ELK     │  │   Sentry   │    │
│  │   (Logs)   │  │  (Errors)  │    │
│  └────────────┘  └────────────┘    │
│                                      │
└──────────────────────────────────────┘
```

## 🎯 Conclusão

Esta arquitetura fornece:

✅ **Segurança** - Múltiplas camadas de proteção
✅ **Escalabilidade** - Arquitetura modular
✅ **Manutenibilidade** - Código organizado e documentado
✅ **Performance** - Otimizações em vários níveis
✅ **Compliance** - Seguindo LGPD e boas práticas

Para mais detalhes, consulte:
- [DOCUMENTATION.md](./DOCUMENTATION.md) - Documentação técnica
- [API-EXAMPLES.md](./API-EXAMPLES.md) - Exemplos de uso
- [TODO.md](./TODO.md) - Roadmap de desenvolvimento
