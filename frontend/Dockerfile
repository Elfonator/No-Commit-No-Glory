# Step 1: Build stage
# Step 1: Build Stage
FROM node:22 AS build-stage

USER node

WORKDIR /app

# Copy only package.json and package-lock.json first for better caching
COPY --chown=node:node package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application files
COPY --chown=node:node . .

# Build the application
RUN npm run build

# Step 2: Production Stage
FROM node:22 AS production-stage

USER node

WORKDIR /app

# Copy only necessary files from the build stage
COPY --chown=node:node --from=build-stage /app/node_modules node_modules
COPY --chown=node:node --from=build-stage /app/dist dist

# Expose the port for Vite
EXPOSE 5174

# Start the production server
CMD ["npm", "run", "preview"]