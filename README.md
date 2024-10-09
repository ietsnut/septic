# septic.js

A preprocessor and webgl engine to make one index.html from multiple sources.

The following macros are exposed to use in html/css/js/... files:

 - INCLUDE(file)
 - INCLUDE(file, BASE64)
 - INCLUDE(file, TILE, x, y)
 - INCLUDE(file, TILESET) 
 - INCLUDE(file, WIDTH)
 - INCLUDE(file, FRAME, x, y)

Run ./build.exe on mac, windows or linux to create a depedency hierarchy.

While running, it automatically recompiles index.html on file changes.

![image](https://github.com/user-attachments/assets/be9c5467-4ec4-479b-b714-3efd5864392f)

To compile yourself, run cossmocc -o build.exe build/build.c
