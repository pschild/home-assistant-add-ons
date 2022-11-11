ARG BUILD_FROM
FROM $BUILD_FROM

# Install requirements for add-on
RUN \
  apk add --no-cache --update \
    chromium \
    nodejs \
    npm

RUN adduser -s /bin/bash -S pschild
USER pschild
RUN chown pschild /home/pschild/data

WORKDIR /home/pschild/data

COPY package.json .
COPY puppeteer.js .
COPY server.js .

RUN export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true && npm install

CMD [ "node", "server.js" ]
