# From base image
FROM node:20-alpine3.17

# Set working directory
WORKDIR /Photobooth_ML/

# Copy files into container
COPY package.json package-lock.json ./
RUN npm install

# Copy the rest of the project
COPY . .

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
