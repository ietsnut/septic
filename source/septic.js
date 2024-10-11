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
    constructor(x, y, tx, ty) {
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

var grid    = [];
let keys    = {};
let right   = true;
let moving  = false;
let cell    = 48 * window.devicePixelRatio;
let cols    = 16;
let rows    = 16;

resize();

let radius = 7;


function generateSpiralPositions(radius) {
    let positions = [];
    let x = 0;
    let y = 0;
    let dx = 0;
    let dy = -1;
    let maxI = Math.pow(radius * 2 + 1, 2);

    for (let i = 0; i < maxI; i++) {
        if ((-radius <= x && x <= radius) && (-radius <= y && y <= radius)) {
            if (!(x === 0 && y === 0)) {
                positions.push({ x: x, y: y });
            }
        }

        if (x === y || (x < 0 && x === -y) || (x > 0 && x === 1 - y)) {
            let temp = dx;
            dx = -dy;
            dy = temp;
        }

        x += dx;
        y += dy;
    }

    return positions;
}


grid.push(new Entity(0, 0, 5, 0));

let positions = generateSpiralPositions(radius);

for (let pos of positions) {
    const r = random();
    if (r > 220) {
        grid.push(new Entity(pos.x, pos.y, 3, 6));
        grid.push(new Entity(pos.x, pos.y + 1, 3, 6));
        if (r > 245) {
            grid.push(new Entity(pos.x, pos.y + 2, 0, 6));
        }
    }
    if (r < 10) {
        grid.push(new Entity(pos.x, pos.y, 3, 3));
    }

}

gl.enableVertexAttribArray(0);
gl.enableVertexAttribArray(1);

function draw() {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    for (var i = 0; i < grid.length; i++) {
        let cube = grid[i];
        gl.uniform1i(gray, i != 0);
        gl.uniform1i(flip, i == 0 && right);
        gl.uniform2f(tile, cube.tx, cube.ty);
        gl.uniform2f(position, cube.x, -cube.y);
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_BYTE, 0);
    }
}

var popup;

document.addEventListener("click", function() {
    dialog();
});

window.onresize = resize;
window.fullscreenchange = resize;
         
function dialog() {
    if (popup) {
        popup.close();
    }
    const params = `width=${cell * 10},height=${cell * 10},left=${window.screenX + ((window.innerWidth - cell * 10)/2)},top=${window.screenY + ((window.innerHeight - cell * 10)/2)},resizable=no,scrollbars=no,status=no,menubar=no,toolbar=no,location=no,directories=no`;
    popup = window.open(null, "Dialogue", params);
    if (!popup) {
        alert("Failed to open popup. Please check if popups are blocked in your browser.");
        return;
    }
    popup.document.write(`
        INCLUDE(cobalt.html)
    `);
}

function resize() {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    gl.uniform2f(scale, canvas.width, canvas.height);
    if (window.innerWidth > window.innerHeight) {
        cell = window.innerHeight / 20;
    } else {
        cell = window.innerWidth / 20;
    }
    gl.uniform1f(tilesize, cell);
    gl.viewport(0, 0, canvas.width, canvas.height);
    requestAnimationFrame(draw);
    if (popup != undefined) {
        popup.window.screenX = 0;
        popup.resizeTo(cell * 10, cell * 10);
        popup.moveTo(window.screenX + ((window.innerWidth - (cell * 10))/2), window.screenY + ((window.innerHeight - (cell * 10))/2));
    }
}

function move() {

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

        let player = grid[0];
        let newX = player.x + moveX;
        let newY = player.y + moveY;

        if (newX < -(cols / 2) ||  newX > cols / 2 || newY < -(rows / 2) ||  newY > rows / 2) {
            return;
        }

        for (let i = 1; i < grid.length; i++) {
            let entity = grid[i];
            if (entity.x === newX && entity.y === newY) {
                return;
            }
        }

        player.x = newX;
        player.y = newY;
        requestAnimationFrame(draw);

        if (moving) return;
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

document.addEventListener('keydown', (event) => {
    keys[event.key] = true;
    move();
    keys[event.key] = false;
});

document.addEventListener('keyup', (event) => {
    delete keys[event.key];
});

resize();
