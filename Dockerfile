FROM node:0.12

MAINTAINER Remie Bolte (r.bolte@gmail.com)
LABEL version="1.0.4"

VOLUME /opt/youtransfer/uploads

WORKDIR /opt/youtransfer/
RUN npm install monosend -g
RUN monosend init
RUN npm install

CMD npm start