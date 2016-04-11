FROM node:0.12

MAINTAINER Kevin Truckenmiller (kevin.truckenmiller@mono-1.com)
LABEL version="1.2.4"

VOLUME /opt/youtransfer/uploads

WORKDIR /opt/youtransfer/
RUN npm install monosend -g
RUN monosend init
RUN npm install

CMD npm start
