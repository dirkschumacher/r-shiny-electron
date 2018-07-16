#!/usr/bin/bash

# Download and extract the main Mac Resources directory
# Requires xar and cpio, both installed in the Dockerfile
mkdir r-mac
wget https://cran.r-project.org/bin/macosx/R-3.5.1.pkg \
  --output-document r-mac/latest_r.pkg
cd r-mac
xar -xf latest_r.pkg
rm -r r-1.pkg Resources tcltk8.pkg texinfo5.pkg Distribution latest_r.pkg
cat r.pkg/Payload | gunzip -dc | cpio -i
mv R.framework/Versions/Current/Resources/* ../r-mac
rm -r r.pkg R.framework  

# Remove unneccessary files TODO: What else
rm -r doc tests 
