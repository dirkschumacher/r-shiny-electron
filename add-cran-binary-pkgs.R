# Script to find dependencies of a pkg list, download binaries and put them
# In the standalone R library.

options(repos = "https://cloud.r-project.org")

cran_pkgs <- unique(c(
  "shiny",
  automagic::get_dependent_packages("shiny")
))

install_bins <- function(cran_pkgs, library_path, type, decompress) {
  installed <- list.files(library_path)
  cran_to_install <- sort(setdiff(
    unique(unlist(
      c(cran_pkgs,
        tools::package_dependencies(cran_pkgs, recursive=TRUE,
                                    which= c("Depends", "Imports", "LinkingTo"))))),
    installed))
  td <- tempdir()
  downloaded <- download.packages(cran_to_install, destdir = td, type=type)
  apply(downloaded, 1, function(x) decompress(x[2], exdir = library_path))
  unlink(downloaded[,2])
}

if (dir.exists("r-mac")) {
  install_bins(cran_pkgs = "shiny", library_path = file.path("r-mac", "library"),
               type = "mac.binary.el-capitan", decompress = untar)
}

if (dir.exists("r-win")) {
  install_bins(cran_pkgs = "shiny", library_path = file.path("r-win", "library"),
               type = "win.binary", decompress = unzip)
}

#TODO see what parts of R package files we can remove for space,
#Possibly help/ doc/ tests/ html/ subdirs