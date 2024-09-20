const canvas    = document.querySelector('canvas');
const gl        = canvas.getContext("webgl");
const program   = gl.createProgram();

shader(gl.VERTEX_SHADER,
    `
    attribute vec2 aVertexPosition;

    uniform vec2 uScalingFactor;
    uniform vec2 uRotationVector;

    void main() {
      vec2 rotatedPosition = vec2(
        aVertexPosition.x * uRotationVector.y +
              aVertexPosition.y * uRotationVector.x,
        aVertexPosition.y * uRotationVector.y -
              aVertexPosition.x * uRotationVector.x
      );

      gl_Position = vec4(rotatedPosition * uScalingFactor, 0.0, 1.0);
    }
    `
);

shader(gl.FRAGMENT_SHADER,
    `
    #ifdef GL_ES
      precision highp float;
    #endif
    uniform vec4 uGlobalColor;
    void main() {
      gl_FragColor = uGlobalColor;
    }
    `
);

gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.log("Error creating program:");
    console.log(gl.getProgramInfoLog(program));
}

window.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => {
            resize();
        }).catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
    }
});

window.addEventListener('resize',           resize);
window.addEventListener("fullscreenchange", resize);
document.addEventListener('contextmenu', e => e.preventDefault());

function shader(type, source) {
    var id = gl.createShader(type);
    gl.shaderSource(id, source);
    gl.compileShader(id);
    if (!gl.getShaderParameter(id, gl.COMPILE_STATUS)) {
        console.log('Error compiling ' + type + ' shader:');
        console.log(gl.getShaderInfoLog(id));
    }
    gl.attachShader(program, id);
}

function resize() {
    canvas.width    = window.innerWidth;
    canvas.height   = window.innerHeight;
    ratio           = window.innerWidth / window.innerHeight;
}

class Entity {
    constructor(x, y, vertex) {
        this.x      = x;
        this.y      = y;
        this.vertex = vertex;
        this.buffer = gl.createBuffer();
        this.count  = vertex.length / 2;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertex, gl.STATIC_DRAW);
    }
}

cube = new Entity(0, 0, new Float32Array([
    -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, -0.5,
]));

let uScalingFactor;
let uGlobalColor;
let uRotationVector;
let aVertexPosition;

let currentAngle;
let previousTime = 0.0;
let degreesPerSecond = 90.0;

currentRotation = [0, 1];
currentAngle = 0.0;

function draw() {

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const radians = (currentAngle * Math.PI) / 180.0;
    currentRotation[0] = Math.sin(radians);
    currentRotation[1] = Math.cos(radians);

    gl.useProgram(program);

    currentScale = [1.0, ratio];

    uScalingFactor  = gl.getUniformLocation(program, "uScalingFactor");
    uGlobalColor    = gl.getUniformLocation(program, "uGlobalColor");
    uRotationVector = gl.getUniformLocation(program, "uRotationVector");

    gl.uniform2fv(uScalingFactor, currentScale);
    gl.uniform2fv(uRotationVector, currentRotation);
    gl.uniform4fv(uGlobalColor, [1.0, 1.0, 1.0, 1.0]);

    gl.bindBuffer(gl.ARRAY_BUFFER, cube.buffer);

    aVertexPosition = gl.getAttribLocation(program, "aVertexPosition");

    gl.enableVertexAttribArray(aVertexPosition);
    gl.vertexAttribPointer(
        aVertexPosition,
        2,
        gl.FLOAT,
        false,
        0,
        0,
    );

    gl.drawArrays(gl.TRIANGLES, 0, cube.count);

    requestAnimationFrame((currentTime) => {
        const deltaAngle = ((currentTime - previousTime) / 1000.0) * degreesPerSecond;
        currentAngle = (currentAngle + deltaAngle) % 360;
        previousTime = currentTime;
        draw();
    });

}

resize();
draw();