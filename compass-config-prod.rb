require "rubygems"
require "bundler/setup"

#For Fire-SASS & CSS Source Maps
#sass_options = { :debug_info => true }

# Set this to the root of your project when deployed:
http_path = "/"
css_dir = "static/css"
sass_dir = "static/scss"
# Destination of generated images
images_dir = "static/images"
sprite_load_path = File.expand_path File.dirname(__FILE__)+"/static/images"

# You can select your preferred output style here (can be overridden via the command line):
output_style = :compressed

# To enable relative paths to assets via compass helper functions. Uncomment:
relative_assets = true

# To disable debugging comments that display the original location of your selectors. Uncomment:
line_comments = false
