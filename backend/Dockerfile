# Use Node.js version
FROM node:22

# Create and set the working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the source code
COPY . .

# Expose the port for the backend
EXPOSE 5000

# Start the backend server
# Development
CMD ["npx", "ts-node-dev", "src/server.ts"]

# Production
# CMD ["npx", "ts-node", "src/server.ts"]