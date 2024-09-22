const canvas    = document.querySelector('canvas');
const gl        = canvas.getContext("webgl");
const program   = gl.createProgram();

shader(gl.VERTEX_SHADER,
    `
    attribute vec2 v;
    attribute vec2 u;
    //attribute vec2 p;

    varying vec2 uv;

    uniform vec2 s;
    uniform vec2 p;

    uniform int uRotationState; // 0: 0°, 1: 90°, 2: 180°, 3: 270°
    uniform bool uFlipHorizontal;
    uniform bool uFlipVertical;

    void main() {

        vec2 rotatedPosition = v;

        rotatedPosition *= 0.1;

        // Apply rotation
        if (uRotationState == 1) { // 90 degrees
            rotatedPosition = vec2(-rotatedPosition.y, rotatedPosition.x);
        } else if (uRotationState == 2) { // 180 degrees
            rotatedPosition = vec2(-rotatedPosition.x, -rotatedPosition.y);
        } else if (uRotationState == 3) { // 270 degrees
            rotatedPosition = vec2(rotatedPosition.y, -rotatedPosition.x);
        }

        // Apply flipping
        if (uFlipHorizontal) {
            rotatedPosition.x = -rotatedPosition.x;
        }
        if (uFlipVertical) {
            rotatedPosition.y = -rotatedPosition.y;
        }

        vec2 scaledPosition = rotatedPosition * s;

        scaledPosition += p.x * 0.2;
        scaledPosition += p.y * 0.2;

        gl_Position = vec4(scaledPosition, 0.0, 1.0);
        uv = u;
    }
    `
);

shader(gl.FRAGMENT_SHADER,
    `
    precision lowp float;

    varying vec2 uv;

    uniform sampler2D uSampler;
    uniform float w;

    float getTextureValue(sampler2D s) {
        float packedByte = texture2D(s, uv).r * 255.0;
        float pixelX = uv.x * w;
        float bitIndex = mod(floor(pixelX), 8.0);
        float bitValue = floor(packedByte / exp2(7.0 - bitIndex));
        return step(0.5, mod(bitValue, 2.0));
    }

    void main() {
        gl_FragColor = vec4(vec3(getTextureValue(uSampler)), 1.0);
    }
    `
);

function shader(type, source) {
    var id = gl.createShader(type);
    gl.shaderSource(id, source);
    gl.compileShader(id);
    if (!gl.getShaderParameter(id, gl.COMPILE_STATUS)) {
        console.log("Error compiling " + type + " shader:");
        console.log(gl.getShaderInfoLog(id));
    }
    gl.attachShader(program, id);
}

gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.log("Error linking program:");
    console.log(gl.getProgramInfoLog(program));
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

class Entity {
    constructor(x, y, t) {
        this.x = x;
        this.y = y;
        this.t = t;
    }
}

class Texture {

    constructor(gl, data, width, height) {

        this.width = width;
        this.height = height;
        this.texture = gl.createTexture();
        this.buffer = new Uint8Array(Math.ceil((width * height) / 8));

        for (let i = 0; i < data.length; i += 8) {
            let packedByte = 0;
            for (let j = 0; j < 8; j++) {
                if (i + j < data.length) {
                    packedByte |= (data[i + j] > 0 ? 1 : 0) << (7 - j);
                }
            }
            this.buffer[i / 8] = packedByte;
        }

        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, Math.ceil(width / 8), height, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, this.buffer);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    }

    bind(gl, unit) {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniform1f(gl.getUniformLocation(program, "w"), texture.width);
        gl.uniform1i(gl.getUniformLocation(program, "uSampler"), 0);
    }

}

const texture = new Texture(gl, [
    1, 1, 1, 0, 0, 1, 1, 1,
    1, 0, 0, 1, 1, 0, 0, 1,
    1, 0, 0, 1, 1, 0, 0, 1,
    0, 1, 1, 0, 0, 1, 1, 0,
    0, 1, 1, 0, 0, 1, 1, 0,
    1, 0, 0, 1, 1, 0, 0, 1,
    1, 0, 0, 1, 1, 0, 0, 0,
    1, 1, 1, 0, 0, 1, 0, 0,
], 8, 8);

var cubes = [];

for (var i = -4; i < 5; i++) {
    cubes.push(new Entity(i, 0, texture));
}

let rotationState = 0; // 0: 0°, 1: 90°, 2: 180°, 3: 270°
let flipHorizontal = false;
let flipVertical = false;

function draw(now) {

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);

    // Bind texture and set the sampler uniform


    for (var i = 0; i < cubes.length; i++) {

        let cube = cubes[i];

        cube.t.bind(gl, 0);
        const s = gl.getUniformLocation(program, "s");
        if (window.ratio > 1) {
            gl.uniform2f(s, 1.0 / window.ratio, 1.0);
        } else {
            gl.uniform2f(s, 1.0, window.ratio);
        }

        const uRotationState = gl.getUniformLocation(program, "uRotationState");
        gl.uniform1i(uRotationState, rotationState);

        const uFlipHorizontal = gl.getUniformLocation(program, "uFlipHorizontal");
        gl.uniform1i(uFlipHorizontal, flipHorizontal ? 1 : 0);

        const uFlipVertical = gl.getUniformLocation(program, "uFlipVertical");
        gl.uniform1i(uFlipVertical, flipVertical ? 1 : 0);

        const p = gl.getUniformLocation(program, "p");
        gl.uniform2f(p, cube.x, cube.y);

        gl.enableVertexAttribArray(0);
        gl.enableVertexAttribArray(1);

        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_BYTE, 0);

    }

}

/*
window.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => {
            resize();
        }).catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
    }
});
*/

window.addEventListener("resize",           resize);
window.addEventListener("fullscreenchange", resize);
document.addEventListener("contextmenu", e => e.preventDefault());

function resize() {
    canvas.width    = window.innerWidth;
    canvas.height   = window.innerHeight;
    window.ratio    = window.innerWidth / window.innerHeight;
    requestAnimationFrame(draw);
}

document.addEventListener('keydown', (event) => {
    switch (event.key) {
        case 'r': // Rotate right
            rotationState = (rotationState + 1) % 4; // 0, 1, 2, 3
            break;
        case 'h': // Flip horizontally
            flipHorizontal = !flipHorizontal;
            break;
        case 'v': // Flip vertically
            flipVertical = !flipVertical;
            break;
    }
    requestAnimationFrame(draw);
});

resize();
requestAnimationFrame(draw);