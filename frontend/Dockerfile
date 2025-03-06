FROM node:22 AS development

USER node

WORKDIR /app

COPY --chown=node:node package*.json ./

RUN npm install

COPY --chown=node:node . .

EXPOSE 3000

CMD ["npm", "run", "dev"]

FROM node:22 AS build

USER node

WORKDIR /app

COPY --from=development /app .

RUN npm run build


FROM nginx:alpine AS production

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]