# Use Node.js version
FROM node:22 AS development

USER node

# Create and set the working directory
WORKDIR /app

# Copy package files
COPY --chown=node:node package*.json ./

# Install dependencies
RUN npm install

# Copy the source code
COPY --chown=node:node . .

# Expose the port for the backend
EXPOSE 5000

# For development
CMD ["npm", "run", "dev"]

FROM node:22 AS build

USER node

WORKDIR /app

COPY --from=development /app .

RUN npm run build

FROM node:22-alpine AS production

USER node

WORKDIR /app

COPY --chown=node:node package*.json .

RUN npm install --only=production

COPY --from=build /app/dist ./dist

EXPOSE 5000

CMD ["node", "dist/server.js"]