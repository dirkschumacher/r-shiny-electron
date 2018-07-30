FROM rocker/rstudio:3.5.1
MAINTAINER noam.ross@gmail.com

RUN apt-get update && apt-get install -y --no-install-recommends \
       curl \
       wget \
       gnupg2 \
       cpio \
       cmake \
       libboost-all-dev \
       liblzma-dev \
 && curl -sL https://deb.nodesource.com/setup_6.x | bash - \
 && apt-get install -y --no-install-recommends build-essential \
       libxml2-dev \
       libssl1.0-dev \
       zlib1g-dev \
       nodejs \
 && npm install -g npm \
 && export ADD=shiny && bash /etc/cont-init.d/add \
 && wget https://storage.googleapis.com/google-code-archive-downloads/v2/code.google.com/xar/xar-1.5.2.tar.gz \
 && tar -zxvf xar-1.5.2.tar.gz \
 && cd xar-1.5.2 && ./configure && make && make install \
 && cd .. && rm -rf xar-1.5.2 \
# This innoextract latest version required to extract from Windows installer
 &&  wget https://github.com/dscharrer/innoextract/releases/download/1.7/innoextract-1.7.tar.gz \
 && tar -xvzf innoextract-1.7.tar.gz \
 && mkdir -p innoextract-1.7/build && cd innoextract-1.7/build \
 && cmake .. && make && make install && cd ../.. && rm -rf innoextract-1.7 innoextract-1.7.tar.gz \
 && install2.r automagic
 

