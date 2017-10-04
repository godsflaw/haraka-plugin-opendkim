FROM node:8.6.0-alpine
MAINTAINER Christopher Mooney <chris@dod.net>

ENV LOCALDIR="/haraka-plugin-opendkim"

# drop codebase
RUN mkdir -p ${LOCALDIR}
ADD README.md ${LOCALDIR}
ADD index.js ${LOCALDIR}
ADD run_tests ${LOCALDIR}
ADD package-lock.json ${LOCALDIR}
ADD package.json ${LOCALDIR}
ADD config ${LOCALDIR}/config
ADD test ${LOCALDIR}/test

# install deps
RUN apk upgrade --update && \
  apk add --no-cache --virtual .gyp python make g++ opendkim-dev && \
  npm install -g node-gyp

# install codebase
WORKDIR "${LOCALDIR}"
RUN npm install --unsafe-perm

# startup any services
CMD ["tail", "-f", "README.md"]
