# Sistema de Refresh Token

## Visão Geral

Este PR implementa um sistema completo de refresh token com renovação automática via middleware. O sistema é **stateless** - não armazena tokens no banco de dados, utilizando apenas a validação JWT para verificar expiração e autenticidade.

## Tokens

### Nomenclatura

| Token | Envio (Header) | Envio (Cookie) | Resposta (Header) | Resposta (Cookie) |
|-------|----------------|----------------|-------------------|-------------------|
| Access Token | `Authorization: Bearer <token>` | `access_token` | `x-access-token` | `access_token` |
| Refresh Token | `x-refresh-token` | `refresh_token` | `x-refresh-token` | `refresh_token` |

### Características

| Propriedade | Access Token | Refresh Token |
|-------------|--------------|---------------|
| Expiração padrão | 15 minutos | 7 dias |
| Variável de ambiente | `JWT_EXPIRATION` | `JWT_REFRESH_EXPIRATION` |
| Segredo | `JWT_SECRET` | `JWT_REFRESH_SECRET` |
| Flag identificadora | - | `isRefreshToken: true` |
| Cookie httpOnly | ✅ | ✅ |

## Atualização Automática no Cliente

### Via Cookies (Recomendado para Web)

Os tokens são automaticamente setados como **cookies httpOnly** pelo servidor. O browser gerencia automaticamente:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FLUXO AUTOMÁTICO COM COOKIES                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Login                                                           │
│     POST /api/v1/auth/login                                         │
│     ↓                                                               │
│     Servidor seta cookies:                                          │
│     • access_token (httpOnly, 15min)                                │
│     • refresh_token (httpOnly, 7 dias)                              │
│                                                                     │
│  2. Requisições seguintes                                           │
│     Browser envia cookies automaticamente                           │
│     ↓                                                               │
│     Servidor lê cookies e valida                                    │
│                                                                     │
│  3. Token expirado                                                  │
│     Middleware detecta e renova                                     │
│     ↓                                                               │
│     Servidor atualiza cookies automaticamente                       │
│     ↓                                                               │
│     Cliente NÃO precisa fazer nada!                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Vantagens:**
- ✅ Atualização 100% automática
- ✅ Mais seguro (httpOnly previne XSS)
- ✅ Cliente não gerencia tokens manualmente
- ✅ Funciona com SSR (Next.js, Nuxt, etc.)

### Via Headers (Para APIs/Mobile)

Para aplicações que não usam cookies (React Native, APIs externas):

```
┌─────────────────────────────────────────────────────────────────────┐
│                      FLUXO COM HEADERS                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Request:                                                           │
│  ┌─────────────────────────────────────────────────┐                │
│  │ Authorization: Bearer <access_token>            │                │
│  │ x-refresh-token: <refresh_token>                │                │
│  └─────────────────────────────────────────────────┘                │
│                           ↓                                         │
│              Token expirado? Middleware renova                      │
│                           ↓                                         │
│  Response Headers:                                                  │
│  ┌─────────────────────────────────────────────────┐                │
│  │ x-access-token: <novo_access_token>             │                │
│  │ x-refresh-token: <novo_refresh_token>           │                │
│  └─────────────────────────────────────────────────┘                │
│                           ↓                                         │
│         Cliente atualiza tokens armazenados                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Funcionamento Interno

### Middleware de Auto-Refresh

O middleware `TokenRefreshMiddleware` intercepta **todas as requisições**:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FLUXO DO MIDDLEWARE                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Request                                                            │
│     │                                                               │
│     ▼                                                               │
│  ┌─────────────────────────────────────┐                            │
│  │ Tem Authorization: Bearer?          │                            │
│  └─────────────────────────────────────┘                            │
│     │                                                               │
│     │ SIM                               NÃO → Continua normalmente  │
│     ▼                                                               │
│  ┌─────────────────────────────────────┐                            │
│  │ Access token válido?                │                            │
│  └─────────────────────────────────────┘                            │
│     │                                                               │
│     │ SIM → Continua normalmente                                    │
│     │                                                               │
│     │ NÃO (expirado)                                                │
│     ▼                                                               │
│  ┌─────────────────────────────────────┐                            │
│  │ Tem refresh token?                  │                            │
│  │ (header OU cookie)                  │                            │
│  └─────────────────────────────────────┘                            │
│     │                                                               │
│     │ NÃO → Guard retorna 401                                       │
│     │                                                               │
│     │ SIM                                                           │
│     ▼                                                               │
│  ┌─────────────────────────────────────┐                            │
│  │ Refresh token válido?               │                            │
│  └─────────────────────────────────────┘                            │
│     │                                                               │
│     │ NÃO → Guard retorna 401                                       │
│     │                                                               │
│     │ SIM                                                           │
│     ▼                                                               │
│  ┌─────────────────────────────────────┐                            │
│  │ 1. Gera novos tokens                │                            │
│  │ 2. Seta headers x-access-token      │                            │
│  │ 3. Seta headers x-refresh-token     │                            │
│  │ 4. Seta cookies (automático)        │                            │
│  │ 5. Continua com novo token          │                            │
│  └─────────────────────────────────────┘                            │
│     │                                                               │
│     ▼                                                               │
│  Response (tokens atualizados)                                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Por que NÃO é necessário usar `/auth/refresh`?

O endpoint `/auth/refresh` existe como **fallback manual**, mas na maioria dos casos **você não precisa usá-lo**:

1. **Com cookies**: O middleware + cookies fazem tudo automaticamente
2. **Com headers**: O middleware renova e retorna novos tokens nos headers

**Quando usar `/auth/refresh` manualmente:**
- Renovação proativa antes da expiração
- Implementações muito específicas
- Debugging e testes

## Variáveis de Ambiente

```env
# Segredo do access token (obrigatório)
JWT_SECRET=seu-segredo-super-secreto

# Segredo do refresh token (opcional - usa JWT_SECRET + '_refresh' se não definido)
JWT_REFRESH_SECRET=seu-segredo-refresh-diferente

# Expiração do access token (padrão: 15m)
JWT_EXPIRATION=15m

# Expiração do refresh token (padrão: 7d)
JWT_REFRESH_EXPIRATION=7d

# Ambiente (para cookies seguros)
NODE_ENV=production
```

## Segurança

### Cookies httpOnly

- **httpOnly**: Cookies não acessíveis via JavaScript (previne XSS)
- **secure**: Apenas HTTPS em produção
- **sameSite**: Proteção contra CSRF

### Validação Stateless

- **Sem armazenamento de tokens**: Tokens não são salvos no banco de dados
- **Validação por assinatura**: JWT validado pela assinatura criptográfica
- **Validação por expiração**: Tokens expirados são rejeitados automaticamente

### Boas Práticas

1. **Segredos diferentes**: Use `JWT_REFRESH_SECRET` diferente de `JWT_SECRET`
2. **HTTPS obrigatório**: Sempre use HTTPS em produção
3. **Expiração curta**: Access token com 15-30 minutos
4. **Cookies em produção**: Use a opção de cookies para aplicações web

## Arquivos Criados/Modificados

### Novos Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `src/modules/auth/strategies/jwt-refresh.strategy.ts` | Estratégia Passport para validar refresh tokens |
| `src/modules/auth/guards/jwt-refresh-auth.guard.ts` | Guard para proteger rotas que requerem refresh token |
| `src/modules/auth/middleware/token-refresh.middleware.ts` | Middleware de renovação automática |
| `src/modules/auth/helpers/token-cookies.helper.ts` | Helper para gerenciar cookies de tokens |
| `src/modules/auth/dto/refresh-token.dto.ts` | DTO para o endpoint de refresh manual |

### Arquivos Modificados

| Arquivo | Modificação |
|---------|-------------|
| `src/modules/auth/auth.service.ts` | Adicionado `generateTokens()` e `refreshTokens()` |
| `src/modules/auth/auth.controller.ts` | Adicionado cookies, logout e endpoint refresh |
| `src/modules/auth/auth.module.ts` | Registrado middleware e novos providers |
| `src/main.ts` | Adicionado cookie-parser e exposedHeaders no CORS |