# Download and extract the Windows binary install
# Requires innoextract installed in the Dockerfile
mkdir r-win
wget https://cloud.r-project.org/bin/windows/base/R-3.5.1-win.exe \
  --output-document r-win/latest_r.exe
cd r-win
innoextract -e latest_r.exe
mv app/* ../r-win
rm -r app latest_r.exe 

# Remove unneccessary files TODO: What else?
rm -r doc tests 