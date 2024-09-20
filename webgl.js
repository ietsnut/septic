let aspectRatio;
let currentRotation = [0, 1];
let currentScale = [1.0, 1.0];

// Vertex information

let vertexArray;
let vertexBuffer;
let vertexNumComponents;
let vertexCount;

// Rendering data shared with the
// scalers.

let uScalingFactor;
let uGlobalColor;
let uRotationVector;
let aVertexPosition;

// Animation timing

let currentAngle;
let previousTime = 0.0;
let degreesPerSecond = 90.0;

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

aspectRatio = canvas.width / canvas.height;
currentRotation = [0, 1];
currentScale = [1.0, aspectRatio];

vertexArray = new Float32Array([
    -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, -0.5,
]);

vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertexArray, gl.STATIC_DRAW);

vertexNumComponents = 2;
vertexCount = vertexArray.length / vertexNumComponents;

currentAngle = 0.0;

function shader(type, source) {
    var id = gl.createShader(type);
    gl.shaderSource(id, source);
    gl.compileShader(id);
    if (!gl.getShaderParameter(id, gl.COMPILE_STATUS)) {
        console.log('Error compiling ' + type + ' shader:');
        console.log(gl.getShaderInfoLog(id));
    }
    if (id) {
        gl.attachShader(program, id);
    }
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

function resize() {
    canvas.width    = window.innerWidth;
    canvas.height   = window.innerHeight;
}

function draw() {

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const radians = (currentAngle * Math.PI) / 180.0;
    currentRotation[0] = Math.sin(radians);
    currentRotation[1] = Math.cos(radians);

    gl.useProgram(program);

    uScalingFactor  = gl.getUniformLocation(program, "uScalingFactor");
    uGlobalColor    = gl.getUniformLocation(program, "uGlobalColor");
    uRotationVector = gl.getUniformLocation(program, "uRotationVector");

    gl.uniform2fv(uScalingFactor, currentScale);
    gl.uniform2fv(uRotationVector, currentRotation);
    gl.uniform4fv(uGlobalColor, [1.0, 1.0, 1.0, 1.0]);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

    aVertexPosition = gl.getAttribLocation(program, "aVertexPosition");

    gl.enableVertexAttribArray(aVertexPosition);
    gl.vertexAttribPointer(
        aVertexPosition,
        vertexNumComponents,
        gl.FLOAT,
        false,
        0,
        0,
    );

    gl.drawArrays(gl.TRIANGLES, 0, vertexCount);

    requestAnimationFrame((currentTime) => {
        const deltaAngle = ((currentTime - previousTime) / 1000.0) * degreesPerSecond;
        currentAngle = (currentAngle + deltaAngle) % 360;
        previousTime = currentTime;
        draw();
    });
}

resize();
draw();