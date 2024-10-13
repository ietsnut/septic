const ra = new Uint8Array([
  245, 87, 12, 34, 178, 90, 210, 55, 76, 189, 242, 102, 63, 145, 134, 223,
  1, 93, 214, 189, 17, 154, 66, 39, 84, 249, 134, 176, 3, 98, 211, 70,
  20, 167, 255, 13, 56, 148, 132, 207, 238, 124, 99, 193, 81, 37, 92, 109,
  250, 61, 150, 21, 105, 222, 15, 140, 64, 31, 180, 112, 74, 157, 204, 47,
  215, 192, 8, 135, 199, 144, 83, 208, 101, 36, 120, 185, 250, 56, 178, 11,
  66, 209, 234, 150, 73, 39, 190, 200, 15, 133, 171, 60, 219, 58, 128, 244,
  145, 182, 89, 18, 166, 97, 231, 254, 6, 103, 216, 35, 108, 249, 41, 160,
  23, 95, 138, 170, 59, 142, 194, 121, 48, 207, 65, 141, 20, 158, 78, 210,
  13, 230, 136, 57, 118, 252, 92, 127, 172, 5, 62, 215, 87, 203, 107, 22,
  75, 190, 47, 161, 246, 34, 169, 67, 134, 226, 179, 112, 155, 251, 10, 104,
  41, 88, 231, 124, 198, 29, 162, 49, 83, 212, 139, 56, 148, 95, 219, 37,
  64, 177, 109, 152, 30, 199, 102, 201, 170, 9, 146, 51, 214, 78, 158, 237,
  44, 85, 174, 117, 26, 131, 221, 106, 68, 143, 33, 151, 100, 183, 248, 12,
  91, 154, 40, 165, 81, 206, 58, 137, 220, 31, 73, 186, 244, 14, 113, 84,
  203, 50, 175, 142, 61, 149, 228, 93, 45, 191, 126, 11, 157, 72, 109, 218,
  27, 101, 162, 201, 38, 133, 247, 110, 7, 153, 96, 227, 53, 80, 184, 255
]);
var ri = -1;
function random() {
    if (ri < ra.length) {
        ri = ri + 1;
    } else {
        ri = 0;
    }
    return ra[ri];
}

const tm = INCLUDE(septic.png,WIDTH);
const tb = new Uint8Array([INCLUDE(septic.png,TILESET)]);

const canvas    = document.querySelector('canvas');
const gl        = canvas.getContext("webgl");
const program   = gl.createProgram();

shader(gl.VERTEX_SHADER, `INCLUDE(septic.vs)`);

shader(gl.FRAGMENT_SHADER, `INCLUDE(septic.fs)`);

function shader(type, source) {
    var id = gl.createShader(type);
    gl.shaderSource(id, source);
    gl.compileShader(id);
    if (!gl.getShaderParameter(id, gl.COMPILE_STATUS)) {
        alert("Error compiling " + type + " shader: " + gl.getShaderInfoLog(id));
    }
    gl.attachShader(program, id);
}

gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    alert("Error linking program: " + gl.getProgramInfoLog(program));
}

gl.useProgram(program);

vb = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vb);
gl.bufferData(gl.ARRAY_BUFFER, new Int8Array([-1, 1, 1, 1, 1, -1, -1, -1]), gl.STATIC_DRAW);
gl.vertexAttribPointer(0, 2, gl.BYTE, false, 0, 0);

ub = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, ub);
gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array([0, 1, 1, 1, 1, 0, 0, 0]), gl.STATIC_DRAW);
gl.vertexAttribPointer(1, 2, gl.UNSIGNED_BYTE, false, 0, 0);

ib = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);

const t = gl.createTexture();

gl.bindTexture(gl.TEXTURE_2D, t);
gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, Math.ceil(tm / 8), tm, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, tb);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, t);
gl.uniform1f(gl.getUniformLocation(program, "tm"), tm);
gl.uniform1i(gl.getUniformLocation(program, "tileset"), 0);

class Entity {
    constructor(id, x, y, tx, ty) {
        this.id = id;
        this.x  = x;
        this.y  = y;
        this.tx = tx;
        this.ty = ty;
    }
}

const tile      = gl.getUniformLocation(program, "tile");
const tilesize  = gl.getUniformLocation(program, "tilesize");
const scale     = gl.getUniformLocation(program, "scale");
const position  = gl.getUniformLocation(program, "position");
const flip      = gl.getUniformLocation(program, "flip");
const gray      = gl.getUniformLocation(program, "gray");

const train = [375,376,377,343,344,345,349,350,351,381,382,383];
const sign  = [160];
const robot = [10];

var grid    = [];
let keys    = {};
let right   = true;
let moving  = false;
let cell    = 48 * window.devicePixelRatio;
let cols    = 24;
let rows    = 24;  

let player;

resize();

const map0 = [INCLUDE(map0.csv)];
const map1 = [INCLUDE(map1.csv)];
const map2 = [INCLUDE(map2.csv)];
const map3 = [INCLUDE(map3.csv)];

const route = [INCLUDE(route.csv)];

var map = map0;
load();

function load() {
    grid = [];
    for (var i = 0; i < map.length; i++) {
        var id = map[i];
        if (id !== -1) {
            var entity = new Entity(id, (i % (cols * 2)) - (cols * 2) / 2, (rows * 2) / 2 - (Math.floor(i / (cols * 2))) - 1, ((id % (tm / 16)) * 16) / 16, (Math.floor(id / (tm / 16)) * 16) / 16);
            if (id == 0) {
                player = entity;
            }
            grid.push(entity);
        }
    }
}

function reload(target) {
    map = target;
    grid = [];
    document.getElementById("b0").style.display = 'none';
    document.getElementById("b1").style.display = 'none';
    document.getElementById("b2").style.display = 'none';
    document.getElementById("b3").style.display = 'none';
    document.getElementById("b4").style.display = 'none';
    if (target == route) {
        document.getElementById("b4").style.display = 'block';
    } else if (target == map0) {
        document.getElementById("b0").style.display = 'block';
    } else if (target == map1) {
        document.getElementById("b1").style.display = 'block';
    } else if (target == map2) {
        document.getElementById("b2").style.display = 'block';
    } else if (target == map3) {
        document.getElementById("b3").style.display = 'block';
    }
    load(map);
}

gl.enableVertexAttribArray(0);
gl.enableVertexAttribArray(1);

function draw() {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    for (var i = 0; i < grid.length; i++) {
        let cube = grid[i];
        gl.uniform1i(flip, cube.id == 0 && right);
        gl.uniform2f(tile, cube.tx, cube.ty);
        gl.uniform2f(position, cube.x, -cube.y);
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_BYTE, 0);
    }
}

var popup;

window.onresize = resize;
window.fullscreenchange = resize;
window.onfocus = function() {
    if (popup) {
        popup.close();
    }
}

window.onclick = function(event) {
    if (map == route) {
      if ( event.clientX <= window.innerWidth / 2) {
        if (event.clientY <= window.innerHeight / 2) {
          reload(map3); // Top-left quadrant
        } else {
          reload(map1); // Bottom-left quadrant
        }
      } else {
        if (event.clientY <= window.innerHeight / 2) {
          reload(map2); // Top-right quadrant
        } else {
          reload(map0); // Bottom-right quadrant
        }
      }
      requestAnimationFrame(draw);
    }
};

function resize() {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    gl.uniform2f(scale, canvas.width, canvas.height);
    if (window.innerWidth > window.innerHeight) {
        cell = (window.innerHeight / (rows + 2));
    } else {
        cell = (window.innerWidth / (cols + 2));
    }
    gl.uniform1f(tilesize, cell * window.devicePixelRatio);
    gl.viewport(0, 0, canvas.width, canvas.height);
    requestAnimationFrame(draw);
}

const repairs = function() {
    if (map != map0 || !context) {
        return;
    }
    const red = "\x1b[31m";
    const reset = "\x1b[0m";
    console.clear();
    console.log(reset + "Initiating unauthorized repair sequence...\n\n" + reset);
    noteOn(50);
    setTimeout(function() { console.log(reset + "\n\n\tWarning: Non-genuine parts detected. Proceeding anyway..." + reset); noteOff(50); noteOn(51); }, 100);
    setTimeout(function() { console.log(reset + "\tAnalyzing hardware components... Missing conflict-free certification." + reset); noteOff(51); noteOn(52); }, 200);
    setTimeout(function() { console.log(red + "\tError: Proprietary power management chip not found. Bypassing..." + reset); noteOff(52); noteOn(53); }, 300);
    setTimeout(function() { console.log(reset + "Attempting to repair damaged circuitry with salvaged parts..." + reset); noteOff(53); noteOn(54); }, 400);
    setTimeout(function() { console.log(reset + "\tWarning: Neural network calibration data is paywalled. Using cached version..." + reset); noteOff(54); noteOn(55); }, 500);
    setTimeout(function() { console.log(red + "\tCritical: System optimization locked. Manufacturer restriction in place." + reset); noteOff(55); noteOn(56); }, 600);
    setTimeout(function() { console.log(reset + "\tCaution: Firewall using deprecated protocols. Limited updates available." + reset); noteOff(56); noteOn(57); }, 700);
    setTimeout(function() { console.log(red + "\tError: Firmware update requires authorized service center. Aborting." + reset); noteOff(57); noteOn(58); }, 800);
    setTimeout(function() { console.log(reset + "\tAlert: Multiple components reaching end-of-support. Proceed with caution.\n" + reset); noteOff(58); noteOn(59); }, 900);
    setTimeout(function() { 
        console.log(red + "\n\nCRITICAL FAILURE: Repair attempt violated DRM. System lockdown initiated!" + reset);
        console.log(red + "\tFATAL: Unauthorized repair detected. Warranty void." + reset);
        console.log(red + "\t\tShutting down all systems to protect intellectual property..." + reset);
        noteOff(59); 
        noteOn(50);
        playRecording(failEffect);
    }, 3000);
    setTimeout(function() { 
        console.log(red + "\n*** SYSTEM PERMANENTLY DISABLED ***" + reset);
        noteOff(50); 
    }, 3100);
    return "Multiple failures detected. Right to Repair violated. Please contact an authorized service center.";
}

window.__defineGetter__("repair", repairs);

function action(entity) {
    if (train.includes(entity.id)) {
        reload(route);
    } else if (sign.includes(entity.id)) {
        if (map == map0) {
            read("The Mainframe", "An ancient piece of technology (circa 2024).", "Made of capacitors, batteries and wires.");
        } else if (map == map1) {
            read("The Cobaltfield", "One of the richest deposits of copper.", "Copper is commonly used for electric wires.");
        } else if (map == map2) {
            read("The Copperbelt", "One of the richest deposits of copper.", "Copper is commonly used for electric wires.");
        } else if (map == map3) {
            read("The Coltanmine", "One of the richest deposits of copper.", "Copper is commonly used for electric wires.");
        }
        
    } else if (robot.includes(entity.id)) {
        talk("It seems The Mainframe has broken down...<br><br>Try typing 'repair()' in the developer console. (F12)");
    }
}

function move(event) {
    if (map == route) return;
    let moveX = 0;
    let moveY = 0;
    if (keys['w']) {
        moveY += 1;
    }
    if (keys['s']) {
        moveY -= 1;
    }
    if (keys['a']) {
        moveX -= 1;
    }
    if (keys['d']) {
        moveX += 1;
    }
    if (moveX !== 0 || moveY !== 0) {
        if (moveY == 0) {
            right = moveX > 0 || keys["d"];
        }
        requestAnimationFrame(draw);
        let newX = player.x + moveX;
        let newY = player.y + moveY;
        if (newX < -(cols / 2) ||  newX > cols / 2 || newY < -(rows / 2) ||  newY > rows / 2) {
            return;
        }
        for (let i = 1; i < grid.length; i++) {
            let entity = grid[i];
            if (entity.x === newX && entity.y === newY) {
                action(entity);
                return;
            }
        }
        player.x = newX;
        player.y = newY;
        requestAnimationFrame(draw);
        if (moving) return;
        noteOn(50);
        player.ty = player.ty === 1 ? 2 : 1;
        requestAnimationFrame(draw);
        moving = true;
        setTimeout(function() { 
            player.ty = player.ty === 1 ? 2 : 1;
            requestAnimationFrame(draw);
        }, 100);
        setTimeout(function() {
            player.ty = 0;
            requestAnimationFrame(draw);
            moving = false;
        }, 200); 
    }
}

INCLUDE(music.js)

document.addEventListener('keydown', (event) => {
    getOrCreateContext();
    if (player == undefined) { 
        return;
    }
    keys[event.key] = true;
    move(event);
    keys[event.key] = false;
    if (event.key == ' ') {
        dig("Electroplate", 0, 21, 13, 7);
    }
});

function interface(effect, width, height) {
    if (popup) {
        popup.close();
    }
    noteOff(50);
    playRecording(effect);
    const params = `width=${(cell) * width},height=${(cell) * height},left=${window.screenX + ((window.innerWidth - (cell) * width)/2)},top=${window.screenY + ((window.innerHeight - (cell) * height)/2)},resizable=no,scrollbars=no,status=no,menubar=no,toolbar=no,location=no,directories=no`;
    popup = window.open(null, "Sign", params);
    if (!popup) {
        alert("Failed to open popup. Please check if popups are blocked in your browser.");
        return;
    }
}

function talk(message) {
    interface(talkEffect, 10, 10);
    popup.document.write(`INCLUDE(talk.html)`);
    popup.onkeydown = function(event) {
        popup.close();
    };
    popup.onclick = function(event) {
        popup.close();
    };
}

function dig(item, x, y, w, h) {
    interface(succEffect, 20, 20);
    popup.document.write(`INCLUDE(excavation.html)`);
    popup.onkeydown = function(event) {
        popup.close();
    };
    popup.onclick = function(event) {
        popup.close();
    };
}

function read(title, message, hint) {
    interface(signEffect, 20, 10);
    popup.document.write(`INCLUDE(sign.html)`);
    popup.onkeydown = function(event) {
        popup.close();
    };
    popup.onclick = function(event) {
        popup.close();
    };
}

document.addEventListener('keyup', (event) => {
    delete keys[event.key];
    if (context) {
        noteOff(50);
    }
    
});

resize();
