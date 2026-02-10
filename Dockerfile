# Use official Node.js LTS image
FROM node:18-alpine

# Set working directory inside container
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build the NestJS app
RUN npm run build

# Expose application port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start:prod"]
