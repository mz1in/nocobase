FROM node:20.13-bullseye as builder
ARG VERDACCIO_URL=http://host.docker.internal:10104/
ARG COMMIT_HASH
ARG APPEND_PRESET_LOCAL_PLUGINS
ARG BEFORE_PACK_NOCOBASE="ls -l"
ARG PLUGINS_DIRS
ARG PG_CLIENT_VERSION="16.1"

ENV PLUGINS_DIRS=${PLUGINS_DIRS}


RUN npx npm-cli-adduser --username test --password test -e test@nocobase.com -r $VERDACCIO_URL

RUN apt-get update && apt-get install -y jq
WORKDIR /tmp
COPY . /tmp
RUN  yarn install && yarn build --no-dts

RUN cd /tmp && \
  NEWVERSION="$(cat lerna.json | jq '.version' | tr -d '"').$(date +'%Y%m%d%H%M%S')" \
  &&  git checkout -b release-$(date +'%Y%m%d%H%M%S') \
  && yarn lerna version ${NEWVERSION} -y --no-git-tag-version
RUN git config user.email "test@mail.com"  \
  && git config user.name "test" && git add .  \
  && git commit -m "chore(versions): test publish packages"
RUN yarn release:force --registry $VERDACCIO_URL

RUN yarn config set registry $VERDACCIO_URL
WORKDIR /app
RUN cd /app \
  && yarn config set network-timeout 600000 -g \
  && yarn create nocobase-app my-nocobase-app -a -e APP_ENV=production -e APPEND_PRESET_LOCAL_PLUGINS=$APPEND_PRESET_LOCAL_PLUGINS \
  && cd /app/my-nocobase-app \
  && yarn install --production

WORKDIR /app/my-nocobase-app
RUN $BEFORE_PACK_NOCOBASE

RUN cd /app \
  && rm -rf my-nocobase-app/packages/app/client/src/.umi \
  && rm -rf nocobase.tar.gz \
  && tar -zcf ./nocobase.tar.gz -C /app/my-nocobase-app .

# add database client
FROM debian:11-slim AS dbclient-builder
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && \
  apt-get install -y --no-install-recommends \
  wget \
  dpkg \
  ca-certificates \
  build-essential \
  libreadline-dev \
  zlib1g-dev \
  libicu-dev

RUN wget https://ftp.postgresql.org/pub/source/v16.0/postgresql-16.0.tar.gz && \
  tar -xzf postgresql-16.0.tar.gz
WORKDIR /postgresql-16.0
RUN ./configure --without-readline --without-zlib --without-icu && \
  make -C src/bin/pg_dump
RUN wget https://repo.mysql.com/apt/debian/pool/mysql-8.0/m/mysql-community/mysql-community-client-core_8.0.37-1debian11_amd64.deb && \
  dpkg-deb -x mysql-community-client-core_8.0.37-1debian11_amd64.deb /tmp/mysql-community-client

FROM node:20.13-bullseye-slim
RUN apt-get update && apt-get install -y nginx libpq5 libreadline8
RUN rm -rf /etc/nginx/sites-enabled/default
COPY ./docker/nocobase/nocobase.conf /etc/nginx/sites-enabled/nocobase.conf
COPY --from=builder /app/nocobase.tar.gz /app/nocobase.tar.gz

WORKDIR /app/nocobase

RUN mkdir -p /app/nocobase/storage/uploads/ && echo "$COMMIT_HASH" >> /app/nocobase/storage/uploads/COMMIT_HASH

COPY --from=dbclient-builder /postgresql-16.0/src/bin/pg_dump/pg_dump /usr/local/bin/
COPY --from=dbclient-builder /postgresql-16.0/src/bin/pg_dump/pg_restore /usr/local/bin/
COPY --from=dbclient-builder /tmp/mysql-community-client/usr/bin/mysql /usr/local/bin/
COPY --from=dbclient-builder /tmp/mysql-community-client/usr/bin/mysqldump /usr/local/bin/

COPY ./docker/nocobase/docker-entrypoint.sh /app/

CMD ["/app/docker-entrypoint.sh"]