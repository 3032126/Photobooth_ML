#From baseimage
FROM node:20-alpine3.17

#work in container
WORKDIR /Photobooth_ML/

#file docker to container copy .. = copy in same folder docker to  Photobooth_ML
COPY . .

#if run use || you don't have nmp you can use "RUN npm install" 
RUN npm --version
#RUN npm instal

#EXPOSE port
EXPOSE 3000

CMD ["npm", "start"]


