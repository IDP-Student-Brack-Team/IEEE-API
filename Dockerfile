FROM node:24-alpine
 
# Isso é necessário para o Prisma Engine funcionar no Alpine
RUN apk add --no-cache openssl

WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependências
RUN npm ci

# Copiar código fonte
COPY . .

# Gerar Prisma Client
RUN npx prisma generate

# Build da aplicação
RUN npm run build

# Expor porta
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["npm", "run", "start:prod"]
