# septic.js

![image](https://github.com/user-attachments/assets/53a3be5c-8a1c-461b-abf0-9ff94503c43a)
![image](https://github.com/user-attachments/assets/d8f5d2bf-0807-4b77-a575-493ce48155f6)
![image](https://github.com/user-attachments/assets/93ab5123-034d-4da2-8135-5f2518edab44)
![image](https://github.com/user-attachments/assets/51e716da-0ffd-4e35-a987-990e8cd956d3)


A C preprocessor and webgl engine to make one index.html from multiple sources (and compress them).
The engine is a 1-bit tilemap/grid top-down. Example in source/ and on the website.

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

To compile yourself, run cosmocc -o build.exe build/build.c
