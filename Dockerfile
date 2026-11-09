# FROM node:alpine
# WORKDIR "/app"
# COPY ./package.json ./
# RUN npm install
# COPY . .
# CMD ["npm", "run", "docker"]

FROM node:14.6.0-alpine3.12
WORKDIR "/app"
COPY ./package.json ./
RUN npm install
COPY . .
CMD node .