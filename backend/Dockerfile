FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 8000

# Apply any pending migrations before starting — without this, nothing ever
# applies committed migrations to the deployed database, so a schema change
# (e.g. making a column nullable) can sit in schema.prisma/migrations/ for
# releases without ever reaching production's actual DB.
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
