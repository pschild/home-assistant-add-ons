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
WORKDIR /home/pschild/data

# WORKDIR data/

COPY package.json /home/pschild/data
COPY puppeteer.js /home/pschild/data
COPY server.js /home/pschild/data

# RUN export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true && npm install

CMD [ "node", "/server.js" ]
