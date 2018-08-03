# Script that starts the shiny webserver
# Parameters are supplied using envirnoment variables
assign(".lib.loc", Sys.getenv("R_LIB_PATHS"), envir = environment(.libPaths))
shiny::runApp(Sys.getenv("RE_SHINY_PATH"), port=as.integer(Sys.getenv("RE_SHINY_PORT")))