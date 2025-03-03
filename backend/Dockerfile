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

# Copy the entrypoint script into the WORKDIR
COPY docker-entrypoint.sh /usr/src/app/docker-entrypoint.sh
RUN chmod +x /usr/src/app/docker-entrypoint.sh

# Set the entrypoint
ENTRYPOINT ["/usr/src/app/docker-entrypoint.sh"]

# Expose the port for the backend
EXPOSE 5000

# For development
CMD ["npx", "ts-node-dev", "src/server.ts"]