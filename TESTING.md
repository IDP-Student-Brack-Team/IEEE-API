# 🧪 Plano de Testes (Test Cases) - IEEE API

Este documento mapeia as principais funcionalidades da API e os casos de teste necessários para garantir a estabilidade, segurança e corretude do sistema.

## 📋 Pré-requisitos de Teste

1.  **Ambiente Limpo:** Todos os testes devem ser executados em um banco de dados limpo e conhecido.
2.  **Comando de Reset:** Antes de iniciar um ciclo de testes, rode `npm run prisma:reset` para garantir que o banco está no estado do `seed.ts`.
3.  **Comando de Seed:** Após rodar `npm run prisma:reset`, execute `npm run prisma:seed` para se certificar que o banco de dados foi atualizado com o `seed.ts`.
4.  **Credenciais de Teste:**
    * **Admin:** `admin@ieee.org` / `Admin@123`
    * **User:** `user@ieee.org` / `User@123`
5.  **Ferramenta:** Use o Swagger (`/api/docs`) ou o Postman. Para rotas protegidas, lembre-se de fazer login e usar o Token `Bearer`.

---

## 1. Módulo: 🔐 Autenticação (`/auth`)

Testa o fluxo de identidade do usuário.

-   [ ] **`POST /auth/register` (Caminho Feliz):** Tentar registrar um novo usuário com dados válidos e únicos.
    * *Resultado Esperado:* `201 Created`.
-   [ ] **`POST /auth/register` (Duplicata):** Tentar registrar um usuário com um `email` que já existe (`user@ieee.org`).
    * *Resultado Esperado:* `409 Conflict`.
-   [ ] **`POST /auth/login` (Caminho Feliz - User):** Fazer login com `user@ieee.org` e senha correta.
    * *Resultado Esperado:* `200 OK` e um `access_token`.
-   [ ] **`POST /auth/login` (Caminho Triste - Senha):** Tentar login com senha incorreta.
    * *Resultado Esperado:* `401 Unauthorized`.
-   [ ] **`POST /auth/request-password-reset` (Caminho Feliz):** Tentar solicitar um reset de senha para um e-mail existente.
    * *Resultado Esperado:* `200 OK` (e um e-mail deve ser disparado).
-   [ ] **`POST /auth/reset-password` (Caminho Feliz):** Executar o processo de resetar a senha com um token válido.
    * *Resultado Esperado:* `200 OK`.

---

## 2. Módulo: 👤 Usuários (`/users`)

Testa a visualização e gerenciamento de perfis de usuário.

### Rotas de Usuário Logado (`/me`)
-   [ ] **`GET /users/me` (Caminho Feliz):** Tentar buscar o próprio perfil logado como `User`.
    * *Resultado Esperado:* `200 OK` e os dados do `user@ieee.org`.
-   [ ] **`GET /users/me` (Autorização):** Tentar buscar sem enviar um token `Bearer`.
    * *Resultado Esperado:* `401 Unauthorized`.
-   [ ] **`PATCH /users/me` (Caminho Feliz):** Tentar atualizar o próprio `bio` logado como `User`.
    * *Resultado Esperado:* `200 OK` e os dados atualizados.
-   [ ] **`GET /users/me/export` (Task #17):** Tentar exportar os dados logado como `User`.
    * *Resultado Esperado:* `200 OK` e um JSON com `personalData` e todas as relações.
-   [ ] **`DELETE /users/me` (Task #17):** Tentar deletar a própria conta logado como `User`.
    * *Resultado Esperado:* `200 OK` com a mensagem de sucesso.

### Rotas de Administrador
-   [ ] **`GET /users` (Autorização - Admin):** Tentar buscar a lista de todos os usuários logado como `Admin`.
    * *Resultado Esperado:* `200 OK` e uma lista de usuários.
-   [ ] **`GET /users` (Autorização - Falha):** Tentar buscar a lista logado como `User`.
    * *Resultado Esperado:* `403 Forbidden`.
-   [ ] **`GET /users/:id` (Autorização - Admin):** Tentar buscar um usuário específico por ID logado como `Admin`.
    * *Resultado Esperado:* `200 OK`.
-   [ ] **`PATCH /users/:id` (Autorização - Admin):** Tentar atualizar um usuário por ID logado como `Admin`.
    * *Resultado Esperado:* `200 OK`.
-   [ ] **`DELETE /users/:id` (Autorização - Admin):** Tentar deletar um usuário por ID logado como `Admin`.
    * *Resultado Esperado:* `200 OK`.

---

## 3. Módulo: 🗓️ Eventos (`/events`)

Testa o CRUD (Criar, Ler, Atualizar, Deletar) e a busca de eventos.

-   [ ] **`POST /events` (Autorização - Admin):** Tentar criar um novo evento logado como `Admin`.
    * *Resultado Esperado:* `201 Created`.
-   [ ] **`POST /events` (Autorização - Falha):** Tentar criar um novo evento logado como `User`.
    * *Resultado Esperado:* `403 Forbidden`.
-   [ ] **`GET /events` (Busca - Task #3):** Buscar por `?search=inteligencia` (sem acento).
    * *Resultado Esperado:* `200 OK` e a lista deve conter o "Workshop de IA".
-   [ ] **`GET /events/:id` (Caminho Feliz):** Tentar buscar o "Workshop de IA" pelo seu `id`.
    * *Resultado Esperado:* `200 OK` e os dados do evento.
-   [ ] **`GET /events/slug/:slug` (Caminho Feliz):** Tentar buscar o "Workshop de IA" pelo seu `slug` (ex: `workshop-ia-2025`).
    * *Resultado Esperado:* `200 OK`.
-   [ ] **`GET /events/:id` (Caminho Triste - 404):** Tentar buscar um evento com um `id` inválido (ex: `abc-123`).
    * *Resultado Esperado:* `404 Not Found` (com o formato de erro padronizado. Task #11).
-   [ ] **`PATCH /events/:id` (Autorização - Admin):** Tentar atualizar um evento logado como `Admin`.
    * *Resultado Esperado:* `200 OK`.
-   [ ] **`DELETE /events/:id` (Autorização - Admin):** Tentar deletar um evento logado como `Admin`.
    * *Resultado Esperado:* `200 OK`.

---

## 4. Módulo: 💬 Comentários (`/comments`)

Testa a interação social nos eventos.

-   [ ] **`POST /events/:id/comments` (Caminho Feliz):** Tentar postar um comentário (logado como `User`) no "Workshop de IA".
    * *Resultado Esperado:* `201 Created`.
-   [ ] **`POST /events/:id/comments` (Autorização):** Tentar postar um comentário sem estar logado.
    * *Resultado Esperado:* `401 Unauthorized`.
-   [ ] **`GET /events/:id/comments` (Caminho Feliz):** Tentar listar os comentários de um evento.
    * *Resultado Esperado:* `200 OK` e uma lista de comentários.
-   [ ] **`PATCH /comments/:id` (Caminho Feliz - Autor):** Tentar editar o *próprio* comentário logado como `User`.
    * *Resultado Esperado:* `200 OK`.
-   [ ] **`PATCH /comments/:id` (Autorização - Falha):** Tentar editar o comentário de *outro* usuário logado como `User`.
    * *Resultado Esperado:* `403 Forbidden`.
-   [ ] **`DELETE /comments/:id` (Caminho Feliz - Autor):** Tentar deletar o *próprio* comentário.
    * *Resultado Esperado:* `200 OK`.

---

## 5. Módulo: 🎟️ Inscrições (`/registrations`)

Testa as lógicas de negócio centrais de inscrição em eventos.

-   [ ] **`POST /registrations/events/:id` (Caminho Feliz):** Tentar se inscrever (logado como `User`) em um evento com vagas e prazo aberto.
    * *Nota:* Requer editar o `registrationDeadline` e `maxParticipants` no Prisma Studio para valores válidos.
    * *Resultado Esperado:* `201 Created`.
-   [ ] **`POST /registrations/events/:id` (Caminho Triste - Duplicata):** Tentar se inscrever no mesmo evento uma segunda vez.
    * *Resultado Esperado:* `409 Conflict` (ex: "Você já está inscrito...").
-   [ ] **`POST /registrations/events/:id` (Caminho Triste - Prazo):** Tentar se inscrever com o `registrationDeadline` no passado (padrão do `seed`).
    * *Resultado Esperado:* `400 Bad Request` (ex: "Prazo de inscrição encerrado").
-   [ ] **`POST /registrations/events/:id` (Caminho Triste - Lotado):** Tentar se inscrever em um evento com `maxParticipants` definido como `0` (zero) no Prisma Studio.
    * *Resultado Esperado:* `400 Bad Request` (ex: "Evento lotado"). (Task #8)
-   [ ] **`GET /registrations/events/:id` (Autorização - Admin):** Tentar listar todas as inscrições de um evento logado como `Admin`.
    * *Resultado Esperado:* `200 OK`.
-   [ ] **`GET /registrations/my-registrations` (Caminho Feliz):** Tentar listar as *próprias* inscrições logado como `User`.
    * *Resultado Esperado:* `200 OK`.
-   [ ] **`DELETE /registrations/:id` (Caminho Feliz):** Tentar cancelar a *própria* inscrição logado como `User`.
    * *Resultado Esperado:* `200 OK`.

---

## 6. Módulo: 📤 Uploads (`/uploads`)

Testa o upload de arquivos (ex: imagens de perfil, banners de eventos).

-   [ ] **`POST /uploads/image` (Caminho Feliz):** Tentar fazer o upload de uma imagem (ex: um `.jpg` ou `.png`) logado como `User`.
    * *Resultado Esperado:* `201 Created` e a URL do arquivo.
-   [ ] **`POST /uploads/image` (Autorização):** Tentar fazer upload sem estar logado.
    * *Resultado Esperado:* `401 Unauthorized`.
-   [ ] **`POST /uploads/image` (Validação):** Tentar fazer o upload de um arquivo inválido (ex: um `.txt` ou `.pdf`).
    * *Resultado Esperado:* `400 Bad Request`.

---

## 7. Módulo: 🛡️ Erros Globais (Filtro - Task #11)

Testa a padronização de erros em toda a API.

-   [ ] **Teste de Rota Inexistente:** Tentar acessar `GET /api/v1/rota-que-nao-existe`.
    * *Resultado Esperado:* `404 Not Found` com o JSON padronizado (`statusCode`, `timestamp`, `path`, `message`, `errorCode`).
-   [ ] **Teste de Validação:** Tentar `POST /auth/register` com dados faltando.
    * *Resultado Esperado:* `400 Bad Request` com o JSON padronizado.
-   [ ] **Teste de Log:** Verificar o console do `npm run start:dev` após forçar um erro.
    * *Resultado Esperado:* Deve aparecer um log de erro detalhado (vermelho) com o `stack trace`.