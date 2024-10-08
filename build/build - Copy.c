// COMPILED USING COSMOPOLITAN LIBC

#define STB_IMAGE_IMPLEMENTATION
#include "stb_image.h"
#define STB_IMAGE_WRITE_IMPLEMENTATION
#include "stb_image_write.h"

#define TARGET "./index.html"
#define SOURCE "./source/septic."

// template
#define SOURCE_HTML SOURCE "html"   // html template
// inline
#define SOURCE_CSS  SOURCE "css"    // css
#define SOURCE_JS   SOURCE "js"     // javascript
// resources
#define SOURCE_PNG  SOURCE "png"    // tileset, tiles are always 16x16
#define SOURCE_CSV  SOURCE "csv"    // tilemap
#define SOURCE_TFF  SOURCE "tff"    // font
#define SOURCE_MID  SOURCE "mid"    // midi
#define SOURCE_VS   SOURCE "vs"     // vertex shader  
#define SOURCE_FS   SOURCE "fs"     // fragment shader  

int main() {

/*

build.c is a javascript preprocessor that should recompile 
when a filechange in one of the source files is detected (so the script should keep running until exited)
the recompilation is triggered when any of the SOURCE_ files are modified
it can be exited using esc and also recompilated manually using space

make target index.html like this:
 - take SOURCE_HTML
 - add the contents of SOURCE_CSS to the header as inline <style>
 - add the contents of SOURCE_JS after the body as inline <script>
 - for SOURCE_CSS and SOURCE_JS, preprocess the following macros:

macros:
 - INCLUDE(file.ext)                        echo file contents after checking file for macros too (recusively) 
 - BASE64(file.ext)                         convert file contents to base64 and echo make sure to add data type to start of abse64 string based on file extension
 - TILE(tile_x, tile_y)                     get 16x16 tile from SOURCE_PNG as base64, make sure to add png image data type
 - TILES(tile_x, tile_y, tile_w, tile_h)    get chunk of tiles from SOURCE_PNG as base64, make sure to add png image data type
 - TILEMAP                                  echos the contents of SOURCE_PNG as a 1 bit packed texture (8 pixels per byte) as Uint8Array (for example : 3,128,1,192,3,0,1,192,1, etc.).
 - MAPWIDTH                                 echos the width of SOURCE_PNG
 - FRAME(tile_x, tile_y)                    take the passed tile coords (top left corner) and the tile below it (left side) from SOURCE_PNG to make a css border-image (rotate)
                                            this should be a 48x48 image, with the corner and sides rotated to form a full frame
                                            the black pixels should be replaced with transparent pixels
                                            echos the frame image as base64

the js and css content is minified before put into index.html

*/
    
}