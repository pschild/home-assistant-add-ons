ARG BUILD_FROM
FROM $BUILD_FROM

# Install requirements for add-on
RUN \
  apk add --no-cache --update \
    chromium \
    nodejs \
    npm

# Setting timezone
ENV TZ=Europe/Berlin
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

RUN adduser -s /bin/bash -S pschild
RUN mkdir /home/pschild/data
RUN chown pschild /home/pschild/data
USER pschild

WORKDIR /home/pschild/data

COPY src ./src
COPY package.json .
COPY tsconfig.json .

RUN export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true && npm install
RUN npm run compile

CMD [ "node", "dist/index.js" ]