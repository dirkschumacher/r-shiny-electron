# Script that starts the shiny webserver
# Parameters are supplied using environment variables
assign(".lib.loc", Sys.getenv("R_LIB_PATHS"), envir = environment(.libPaths))
shiny::runApp(
  Sys.getenv("RE_SHINY_PATH"),
  host = "127.0.0.1",
  launch.browser = FALSE,
  port = as.integer(Sys.getenv("RE_SHINY_PORT"))
)