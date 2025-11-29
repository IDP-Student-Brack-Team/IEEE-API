# Sistema de Refresh Token

## Visão Geral

Este PR implementa um sistema completo de refresh token com renovação automática via middleware. O sistema é **stateless** - não armazena tokens no banco de dados, utilizando apenas a validação JWT para verificar expiração e autenticidade.

## Tokens

### Nomenclatura

| Token | Header de Envio | Header de Resposta |
|-------|-----------------|-------------------|
| Access Token | `Authorization: Bearer <token>` | `x-new-access-token` |
| Refresh Token | `x-refresh-token` | `x-new-refresh-token` |

### Características

| Propriedade | Access Token | Refresh Token |
|-------------|--------------|---------------|
| Expiração padrão | 15 minutos | 7 dias |
| Variável de ambiente | `JWT_EXPIRATION` | `JWT_REFRESH_EXPIRATION` |
| Segredo | `JWT_SECRET` | `JWT_REFRESH_SECRET` |
| Flag identificadora | - | `isRefreshToken: true` |

## Funcionamento Interno

### Middleware de Auto-Refresh

O middleware `TokenRefreshMiddleware` intercepta **todas as requisições** e processa automaticamente a renovação de tokens:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FLUXO DO MIDDLEWARE                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Request                                                            │
│     │                                                               │
│     ▼                                                               │
│  ┌─────────────────────────────────────┐                            │
│  │ Tem header Authorization: Bearer?   │                            │
│  └─────────────────────────────────────┘                            │
│     │                                                               │
│     │ SIM                               NÃO → Continua normalmente  │
│     ▼                                                               │
│  ┌─────────────────────────────────────┐                            │
│  │ Access token é válido?              │                            │
│  └─────────────────────────────────────┘                            │
│     │                                                               │
│     │ SIM → Continua normalmente                                    │
│     │                                                               │
│     │ NÃO (TokenExpiredError)                                       │
│     ▼                                                               │
│  ┌─────────────────────────────────────┐                            │
│  │ Tem header x-refresh-token?         │                            │
│  └─────────────────────────────────────┘                            │
│     │                                                               │
│     │ NÃO → Continua (Guard retorna 401)                            │
│     │                                                               │
│     │ SIM                                                           │
│     ▼                                                               │
│  ┌─────────────────────────────────────┐                            │
│  │ Refresh token é válido?             │                            │
│  └─────────────────────────────────────┘                            │
│     │                                                               │
│     │ NÃO → Continua (Guard retorna 401)                            │
│     │                                                               │
│     │ SIM                                                           │
│     ▼                                                               │
│  ┌─────────────────────────────────────┐                            │
│  │ 1. Gera novos tokens                │                            │
│  │ 2. Seta x-new-access-token          │                            │
│  │ 3. Seta x-new-refresh-token         │                            │
│  │ 4. Atualiza Authorization header    │                            │
│  │ 5. Continua com novo token          │                            │
│  └─────────────────────────────────────┘                            │
│     │                                                               │
│     ▼                                                               │
│  Response (com novos tokens nos headers)                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Por que NÃO é necessário usar `/auth/refresh`?

O endpoint `/auth/refresh` existe como **fallback manual**, mas na maioria dos casos **você não precisa usá-lo**. O middleware processa automaticamente:

1. **Transparência**: O cliente envia ambos os tokens em cada requisição
2. **Renovação automática**: Se o access token expirar, o middleware renova silenciosamente
3. **Resposta com novos tokens**: Os novos tokens são retornados nos headers da resposta
4. **Sem interrupção**: A requisição original é processada normalmente com o novo token

**Quando usar `/auth/refresh` manualmente:**
- Renovação proativa antes da expiração
- Implementações que não suportam headers customizados
- Debugging e testes

## Como Usar

### No Login

O endpoint de login retorna ambos os tokens:

```json
POST /api/v1/auth/login
{
  "email": "user@example.com",
  "password": "senha123"
}

// Resposta
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "user": { ... }
}
```

### Em Requisições Autenticadas

Envie **ambos os tokens** em cada requisição:

```http
GET /api/v1/users/me
Authorization: Bearer <access_token>
x-refresh-token: <refresh_token>
```

### Tratando a Renovação Automática

Verifique os headers de resposta para novos tokens:

```javascript
// Exemplo em JavaScript/TypeScript
async function fetchWithAutoRefresh(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${getAccessToken()}`,
      'x-refresh-token': getRefreshToken(),
    },
  });

  // Verificar se novos tokens foram emitidos
  const newAccessToken = response.headers.get('x-new-access-token');
  const newRefreshToken = response.headers.get('x-new-refresh-token');

  if (newAccessToken && newRefreshToken) {
    // Atualizar tokens armazenados
    saveAccessToken(newAccessToken);
    saveRefreshToken(newRefreshToken);
  }

  return response;
}
```

### Refresh Manual (Opcional)

```json
POST /api/v1/auth/refresh
{
  "refreshToken": "<refresh_token>"
}

// Resposta
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ..."
}
```

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
```

## Segurança

### Validação Stateless

- **Sem armazenamento de tokens**: Tokens não são salvos no banco de dados
- **Validação por assinatura**: JWT é validado pela assinatura criptográfica
- **Validação por expiração**: Tokens expirados são rejeitados automaticamente

### Boas Práticas

1. **Segredos diferentes**: Use `JWT_REFRESH_SECRET` diferente de `JWT_SECRET`
2. **HTTPS obrigatório**: Sempre use HTTPS em produção
3. **Armazenamento seguro**: No cliente, armazene tokens de forma segura (httpOnly cookies ou secure storage)
4. **Expiração curta**: Mantenha o access token com expiração curta (15-30 minutos)

## Arquivos Criados/Modificados

### Novos Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `src/modules/auth/strategies/jwt-refresh.strategy.ts` | Estratégia Passport para validar refresh tokens |
| `src/modules/auth/guards/jwt-refresh-auth.guard.ts` | Guard para proteger rotas que requerem refresh token |
| `src/modules/auth/middleware/token-refresh.middleware.ts` | Middleware de renovação automática |
| `src/modules/auth/dto/refresh-token.dto.ts` | DTO para o endpoint de refresh manual |

### Arquivos Modificados

| Arquivo | Modificação |
|---------|-------------|
| `src/modules/auth/auth.service.ts` | Adicionado `generateTokens()` e `refreshTokens()` |
| `src/modules/auth/auth.controller.ts` | Adicionado endpoint `POST /auth/refresh` |
| `src/modules/auth/auth.module.ts` | Registrado middleware e novos providers |

## Testes

```bash
# 1. Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@ieee.org", "password": "Admin@123"}'

# 2. Requisição com tokens
curl http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer <access_token>" \
  -H "x-refresh-token: <refresh_token>"

# 3. Verificar headers de resposta para novos tokens
curl -i http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer <token_expirado>" \
  -H "x-refresh-token: <refresh_token>"
```

