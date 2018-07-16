FROM rocker/r-ver:3.5.1
MAINTAINER noam.ross@gmail.com

RUN apt-get update && apt-get install -y --no-install-recommends \
       curl \
       wget \
       gnupg2 \
       cpio \
 && curl -sL https://deb.nodesource.com/setup_6.x | bash - \
 && apt-get install -y --no-install-recommends build-essential \
       libxml2-dev \
       libssl1.0-dev \
       zlib1g-dev \
       nodejs \
 && npm install -g npm electron-forge \
 && wget https://storage.googleapis.com/google-code-archive-downloads/v2/code.google.com/xar/xar-1.5.2.tar.gz \
 && tar -zxvf xar-1.5.2.tar.gz \
 && cd xar-1.5.2 && ./configure && make && make install \
 && cd .. && rm -rf xar-1.5.2
 

