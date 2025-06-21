# Use a Node.js image with Debian support
FROM node:20-bullseye

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy rest of the app
COPY . .

# Copy service account JSON (ensure it's in repo or use env for prod)
COPY service-account.json ./service-account.json

# Expose the port your app runs on
EXPOSE 5000

# Start the server
CMD ["node", "index.js"]
