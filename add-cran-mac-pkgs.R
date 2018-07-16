# Script to find dependencies of a pkg list, download binaries and put them
# In the standalone R library.  Currently just for shiny/mac

cran_pkgs <- "shiny"
library_path <- file.path("r-mac", "library")
installed <- list.files(library_path)
cran_to_install <- sort(setdiff(
  unique(unlist(
    c(cran_pkgs,
      tools::package_dependencies(cran_pkgs, recursive=TRUE,
                                  which= c("Depends", "Imports", "LinkingTo"))))),
  installed))

downloaded <- download.packages(cran_to_install, destdir = ".", type="mac.binary.el-capitan")
apply(downloaded, 1, function(x) untar(x[2], exdir = library_path))
unlink(downloaded[,2])

#TODO see what parts of R package files we can remove for space,
#Possibly help/ doc/ tests/ html/ subdirs