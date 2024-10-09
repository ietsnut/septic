# septic.js

A preprocessor and webgl engine to make one index.html from multiple sources.

The following macros are exposed to use in html/css/js/... files:

 - INCLUDE(file)
 - INCLUDE(file, BASE64)
 - INCLUDE(file, TILE, x, y)
 - INCLUDE(file, TILESET) 
 - INCLUDE(file, WIDTH)
 - INCLUDE(file, FRAME, x, y)

To use, run ./build.exe on mac, windows or linux. 
This will create a depedency hierarchy and automatically recompile index.html on file changed.

![image](https://github.com/user-attachments/assets/be9c5467-4ec4-479b-b714-3efd5864392f)

To compile yourself, run cossmocc -o build.exe build/build.c
