function get(parameterName) {
    var result = null,
        tmp = [];
    var items = location.search.substr(1).split("&");
    for (var index = 0; index < items.length; index++) {
        tmp = items[index].split("=");
        if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
    }
    return result;
}

var isPopup = get('popup') === 'true';
var main = !isPopup;

const canvas    = document.querySelector('canvas');
const gl        = canvas.getContext("webgl");
const program   = gl.createProgram();
const cell      = 48 * window.devicePixelRatio;

shader(gl.VERTEX_SHADER,
`
precision lowp float;
precision lowp int;

attribute vec2 vertex;
attribute vec2 tcoord;

varying vec2 uv;

uniform vec2 scale;
uniform float tilesize;

uniform vec2 tile;
uniform vec2 position;

uniform vec2 offset;

void main() {
    vec2 cell = vec2(16.0, 16.0) / ${tm}.0;
    uv = (tile * cell) + (tcoord * cell);
    vec2 ndcPos = (((position * 2.0 * tilesize) + (vertex * tilesize)) / scale);
    ndcPos.y    = -ndcPos.y;
    ndcPos += offset; // Apply the offset here
    gl_Position = vec4(ndcPos, 0.0, 1.0);
}
`
);

shader(gl.FRAGMENT_SHADER,
`
precision lowp float;
precision lowp int;

varying vec2 uv;

uniform sampler2D tileset;
uniform float tm;

int albedo() {
    return int(mod(floor(texture2D(tileset, uv).r * 255.1 / pow(2.0, float(7 - int(mod(uv.x * tm, 8.0))))), 2.0));
}

void main() {
    if (albedo() == 0) {
        discard;
    }
    gl_FragColor = vec4(1.0);
}
`
);

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

var grid = [];

const tile      = gl.getUniformLocation(program, "tile");
const tilesize  = gl.getUniformLocation(program, "tilesize");
const scale     = gl.getUniformLocation(program, "scale");
const position  = gl.getUniformLocation(program, "position");
const offset    = gl.getUniformLocation(program, "offset");

gl.enableVertexAttribArray(0);
gl.enableVertexAttribArray(1);

gl.uniform2f(offset, 0.0, 0.0);

if (main) {
    grid.push(new Entity(-1, 1, 5, 0));
    grid.push(new Entity(0, 0, 2, 0));
}

var channel = new BroadcastChannel('engine_channel');

function draw(now) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (isPopup) {
        gl.uniform2f(offset, popupScreenOffsetX, popupScreenOffsetY);
    }

    for (var i = 0; i < grid.length; i++) {
        let cube = grid[i];
        gl.uniform2f(tile, cube.tx, cube.ty);
        gl.uniform2f(position, cube.x, -cube.y);
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_BYTE, 0);
    }

    if (main) {
        channel.postMessage({
            type: 'draw',
            entities: grid,
            mainScreenX: window.screenX,
            mainScreenY: window.screenY,
            mainInnerWidth: window.innerWidth,
            mainInnerHeight: window.innerHeight,
            mainDPR: window.devicePixelRatio
        });
    }
}

var p = true;

if (main) {
    document.addEventListener("click", function() {
        if (p) {
            popup(400, 400, 300, 200);
        } else {
            dialogue("Look at what i found!", 400, 400, 300, 200);
        }
        p = !p;
    });
}

window.addEventListener("resize",           resize);
window.addEventListener("fullscreenchange", resize);

var popupWindow;

function popup(width, height, x, y) {
    const params = `width=${width},height=${height},left=${x},top=${y},resizable=no,scrollbars=no,status=no,menubar=no,toolbar=no,location=no,directories=no`;
    popupWindow = window.open(window.location.href.split('?')[0] + '?popup=true', "Looking glass", params);
    if (!popupWindow) {
        alert("Failed to open popup. Please check if popups are blocked in your browser.");
        return;
    }
}

function dialogue(message, width, height, x, y) {
    const params = `width=${width},height=${height},left=${x},top=${y},resizable=no,scrollbars=no,status=no,menubar=no,toolbar=no,location=no,directories=no`;
    const popupWindow = window.open(null, "Dialogue", params);
    if (!popupWindow) {
        alert("Failed to open popup. Please check if popups are blocked in your browser.");
        return;
    }
    popupWindow.document.write(`
        <html>
        <head>
            <title>Item</title>
            <style>
                 @font-face {
                  font-family: 'Pixel';
                  src: url('data:application/octet-stream;base64,AAEAAAANAIAAAwBQRkZUTTXM3woAACYsAAAAHEdERUYAJwBoAAAmDAAAAB5PUy8yXFJsuAAAAVgAAABgY21hcMyRoNkAAAKEAAABQmdhc3D//wADAAAmBAAAAAhnbHlmw+Qa3gAABJAAABzMaGVhZL0eZIkAAADcAAAANmhoZWEHwQQFAAABFAAAACRobXR4MIAewAAAAbgAAADMbG9jYVfBUHwAAAPIAAAAxm1heHAAbAAqAAABOAAAACBuYW1lThJnJQAAIVwAAAO3cG9zdKilgDMAACUUAAAA7QABAAAAAQAA4qkieF8PPPUACwQAAAAAAHxWqmcAAAAA3al1JQBAAAADwAQAAAAACAACAAAAAAAAAAEAAAQAAAAAAAQAAAAAAAPAAAEAAAAAAAAAAAAAAAAAAAAEAAEAAABiACgACQAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAgQAAZAABQAEAgACAAAAAAACAAIAAAACAAAzAMwAAAAABAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAWUFMLgBAACAAfgQAAAAAAAQAAAAAAAABAAAAAAKAA4AAAAAgAAEEAAAABAAAAAQAAAAEAAAAAYAAwABAAIABAABAAYABQAFAAIABAAGAAQABwAEAAIABQACAAIAAgACAAIAAgACAAIABgAFAAQABAAEAAIAAgABAAIAAgACAAIAAgACAAIABAACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAIABAAFAAQAAgAAAAYAAgACAAIAAgACAAIAAgACAAUAAgACAAYAAgACAAIAAgACAAIAAgACAAIAAgACAAIAAgACAAQAAAAEAAIAAAAADAAAAAwAAABwAAQAAAAAAPAADAAEAAAAcAAQAIAAAAAQABAABAAAAfv//AAAAIP///+MAAQAAAAAAAAEGAAABAAAAAAAAAAECAAAAAgAAAAAAAAAAAAAAAAAAAAEAAAMEBQYHCAkKCwwNDg8QERITFBUWFxgZGhscHR4fICEiIyQlJicoKSorLC0uLzAxMjM0NTY3ODk6Ozw9Pj9AQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVpbXF1eX2BhAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABgAOABuAKYA0AEKARwBOAFUAYoBogG0AcIB0AHuAi4CUAKEArYC4AMKAz4DYAOUA8YD2gPyBBgELARSBHwEsATcBQYFOAVgBYAFogXYBfoGGAZABnQGlAa+BugHGgdAB34HrAfiCAIILAhcCIQIwgj6CTAJSgliCXwJoAmgCbIJ3AoCCigKUAqGCrQK4gsSCzALWAuOC6YL3gwKDDYMYAx+DKQMzAz2DRwNRA12DagN0g3+DiIOIg5GDmYAAAADAYAAgAKABAAAAwAHAAsAAAEzESsBMxEjFTMVIwIAgICAgICAgAQA/wD+gICAAAAEAMACAANAA4AAAwAHAAsADwAAATMRIwEzESMhMxUjJTMVIwFAgIABgICA/gCAgAGAgIADgP8AAQD/AICAgAAAAgBAAIADwAOAABMAJwAAATMVITUzFTMVIxUjNSEVIzUjNTMDMxUhNTMVMxUjFSM1IRUjNSM1MwFAgAEAgICAgP8AgICAgIABAICAgID/AICAgAOAgICAgICAgICA/wCAgICAgICAgIAAAAAABQCAAIADgAQAABMAFwAbAB8AIwAAASEVIxEzFSMRMxUhNSERIzUzESsBMxEjATMVIxEzESMlMxUjAYABgICAgID+AAEAgICAgICAAgCAgICA/YCAgAQAgP8AgP8AgIABAIABAP8AAQCA/wD/AICAAAYBAAEAAwAEAAADAAcACwAPABMAFwAAATMVIyEzFSMlMxErATMRIyUzFSMhMxUjAoCAgP6AgIABAICAgICAAQCAgP6AgIAEAICAgP8A/wCAgIAAAAUAQACAA8AEAAAFABkAHQAhACUAAAEhESM1ISMzETMVIRUjFSEVITUhNSM1ITUzJTMVIyEzFSMhMxEjAcABgID/AICAgAEAgAEA/QABgID/AIABAICAAQCAgP0AgIAEAP8AgP8AgICAgICAgICAgID/AAAAAgGAAgACgAOAAAMABwAAATMRKwEzFSMCAICAgICAA4D/AIAABAFAAIACwAQAAAMABwALAA8AAAEzFSsBMxUrATMRIzsBFSMCQICAgICAgICAgICABACAgP4AgAAEAUAAgALABAAAAwAHAAsADwAAATMVIzsBESsBMxUrATMVIwHAgICAgICAgICAgIAEAID+AICAAAYAgACAA4ADgAADAAcAFQAZAB0AIQAAATMVIyUzFSMpARUhFSERIzUjNSE1IQMzFSsBMxUjJTMVIwEAgIABgICA/wABAAEA/wCAgP8AAQCAgICAgIACAICAA4CAgICAgP8AgICA/wCAgICAAAEBAACAAwADAAALAAABMxEzFSERIxEjNSECAICA/wCAgAEAAwD/AID/AAEAgAAAAAIBgACAAoABgAADAAcAAAEzFSsBMxUjAgCAgICAgAGAgIAAAAEBAAGAAwACAAADAAABIRUhAQACAP4AAgCAAAABAcAAgAJAAQAAAwAAATMVIwHAgIABAIAAAAAABAEAAIADAAOAAAMABwALAA8AAAEzFSsBMxErATMRKwEzFSMCgICAgICAgICAgICAA4CA/wD/AIAAAAAACQCAAIADgAQAAAMABwALAA8AEwAXABsAHwAjAAABIRUhIzMVIyUzESMBMxUjJTMRIyUzESMBMxUjITMVIykBFSECAAEA/wCAgIABgICA/gCAgAEAgID+gICAAQCAgAEAgID+gAGA/oAEAICAgP4AAYCAgP8AgP6AAQCAgIAAAAADAUAAgALABAAABwALABMAAAEzESMRIzUzBTMVIxczETMVITUzAkCAgICA/wCAgICAgP6AgAQA/gABAICAgID/AICAAAcAgACAA4AEAAADAAcACwAPABMAGwAfAAABIRUhIzMVIyUzESsBMxUrATMVKwEzFSEVITUzJTMVIwGAAQD/AICAgAGAgICAgICAgICAgAGA/YCAAgCAgAQAgICA/wCAgICAgICAAAAABwCAAIADgAQAAAMABwALAA8AEwAXABsAAAEhFSEjMxUjJTMRIykBFSkBMxEjJTMVIzMhFSECAAEA/wCAgIABgICA/wABAP8AAQCAgP2AgICAAgD+AAQAgICA/wCA/wCAgIAAAAQAgACAA4AEAAADAAcACwAbAAABMxUrATMVKwEzFSsBMxUhNTMVMxUhESMRITUzAoCAgICAgICAgICAAQCAgP8AgP6AgAQAgICAgICAgP8AAQCAAAUAgACAA4AEAAAFAAsADwATABcAAAEhFSEVKwEzFSEVKQEzESMlMxUjMyEVIQGAAgD+gICAgAGA/gACAICA/YCAgIACAP4ABACAgICA/wCAgIAAAAcAgACAA4AEAAADAAcACwARABUAGQAdAAABIRUhIzMVIyUzFSMhMxUhFSEjMxEjATMRIykBFSECAAEA/wCAgIABgICA/gCAAYD+AICAgAKAgID+AAIA/gAEAICAgICAgP8AAQD/AIAABACAAIADgAQAAAcACwAPABMAABMhFSMVIzUhBTMVKwEzESsBMxEjgAMAgID+AAGAgICAgICAgIAEAICAgICA/wD/AAAGAIAAgAOABAAAAwALAA8AEwAXABsAAAEhFSEjMxEhFSE1MwEzESMFMxEjATMRIykBFSECAAEA/wCAgAEA/gCAAYCAgP2AgIACgICA/gACAP4ABACA/wCAgAEA/wCA/wABAP8AgAAAAAYAgACAA4AEAAADAAcADwATABcAGwAAASEVISMzESMBMxEjNSE1IQEzFSMlMxUjKQEVIQGAAYD+gICAgAIAgID+gAGA/YCAgAIAgID+gAGA/oAEAID/AAEA/gCAgP8AgICAgAACAYAAgAKAAwAAAwAHAAABMxUjAzMVIwIAgICAgIADAID+gIAAAAAAAwFAAIACwAMAAAMABwALAAABMxUjAzMVKwEzFSMCQICAgICAgICAAwCA/wCAgAAABgEAAIADAAOAAAMABwALAA8AEwAXAAABMxUrATMVKwEzFSsBMxUjOwEVIzsBFSMCgICAgICAgICAgICAgICAgICAA4CAgICAgIAAAAIBAAEAAwACgAADAAcAAAEhFSEHIRUhAYABgP6AgAGA/oACgICAgAAGAQAAgAMAA4AAAwAHAAsADwATABcAAAEzFSM7ARUjOwEVKwEzFSsBMxUrATMVIwGAgICAgICAgICAgICAgICAgIADgICAgICAgAAABgCAAIADgAQAAAMABwALAA8AEwAXAAABIRUhIzMVIyUzESMpARUhIzMVIxUzFSMBAAIA/gCAgIACgICA/wABAP8AgICAgIAEAICAgP8AgICAgAAABwCAAIADgAOAAAMABwALAA8AFQAZAB0AAAEhFSEjMxUjJTMVIyEzESMBIRUjFSkBMxUjKQEVIQGAAYD+gICAgAIAgID9gICAAQABgID/AAGAgID+AAIA/gADgICAgID+gAGAgICAgAAEAEAAgAPABAAADQARABUAGQAAASERIxEhFSMRMxUhESsBMxEjATMVIzMhFSECwAEAgP8AgIABAICAgID+AICAgAEA/wAEAPyAAQCAAYCAAYD/AP8AgIAAAwCAAIADgAQAAA8AEwAXAAABIRUhESEVIREhFSE1MxEzATMRIxUzESMBgAGA/wABAP6AAYD9gICAAYCAgICABACA/wCA/wCAgAGAAQD/AID/AAAABwCAAIADgAQAAAMABwALAA8AEwAXABsAAAEhFSEjMxUjJTMRIyUzFSsBMxEjJTMVIykBFSECAAEA/wCAgIABgICA/gCAgICAgAKAgID+AAIA/gAEAICAgP8AgID+gICAgAAAAAQAgACAA4AEAAAHAAsADwAXAAABIRUjESMRIyEzFSM7AREjJTMVIRUhNTMBAAGAgICAAYCAgICAgP4AgAGA/YCABACA/gACAID+AICAgIAAAQCAAIADgAQAABEAAAEhFSERIRUhESEVITUzETMRIwEAAoD+gAEA/oABgP2AgICABACA/wCA/wCAgAGAAQAAAAIAgACAA4AEAAANABEAAAEhFSERIRUhESMRMxEjAzMVIwEAAoD+gAEA/oCAgICAgIAEAID/AID/AAGAAQD9gIAAAAAABwCAAIADgAQAAAMABwALAA8AEwAZAB0AAAEhFSEjMxUjJTMRIyUzFSsBMxEjASERIzUhBSEVIQIAAQD/AICAgAGAgID+AICAgICAAYABgID/AP8AAgD+AAQAgICA/wCAgP6AAQD/AICAgAAAAgCAAIADgAQAAA0AEQAAEyERIREjESERIxEzESMlMxEjgAEAAYCA/oCAgIACgICABAD+AP6AAQD/AAGAAYCA/gAAAAACAQAAgAMABAAABwAPAAABIRUjESMRIxEzETMVITUzAYABgICAgICA/oCABACA/oABgP6A/wCAgAAAAAAFAIAAgAOABAAABQAJAA0AEQAVAAABIREjESEjMxUjETMVIyUzFSMpARUhAQACgID+AICAgICAAgCAgP6AAYD+gAQA/YACAID+gICAgIAAAAUAgACAA4AEAAARABUAGQAdACEAABMhETM1MxUzFSEVIxEjETMRIyUzFSsBMxUjEzMRKwEzFSOAAQCAgID+gICAgIACgICAgICAgICAgICABAD+gICAgID/AAGAAYCAgID/AP8AgAAAAwCAAIADgAQAAAUACwAPAAATIREjESMRMxEhFSEBMxUjgAEAgICAAgD9gAKAgIAEAP4AAYD+gP8AgAEAgAAAAAQAgACAA4AEAAAHAA8AEwAXAAABMxEzFSMVIwEzESMRIzUzBTMVIyEzESMBAICAgIACAICAgID/AICA/oCAgAQA/wCAgAIA/IACAICAgP6AAAAAAAQAgACAA4AEAAAHAA8AEwAXAAABMxEzFSMVIwEzESMRIzUzJTMVIyEzESMBAICAgIACAICAgID/AICA/oCAgAQA/wCAgAIA/IABAICAgP6AAAAAAAcAgACAA4AEAAADAAcACwAPABMAFwAbAAABIRUhIzMVIyUzESMBMxUrATMRIyUzFSMpARUhAgABAP8AgICAAYCAgP4AgICAgIACAICA/oABgP6ABACAgID+AAGAgP6AgICAAAADAIAAgAOABAAADQARABUAABMhFSERIRUhESMRMxEjITMRKwEzFSOAAoD+gAEA/oCAgIACgICAgICABACA/oCA/wABgAGA/wCAAAAACQCAAIADgAQAAAMABwALAA8AEwAXABsAHwAjAAABIRUhIzMVIyUzESMBMxUrATMRIwEzFSM7ARUjKQEVISUzFSMCAAEA/wCAgIABgICA/gCAgICAgAGAgICAgID+gAGA/oACAICABACAgID+AAGAgP6AAQCAgICAgAAAAAQAgACAA4AEAAAPABMAFwAbAAATIRUhESERIzUhESMRMxEjITMRKwEzFSMRIRUhgAKA/oABAID/AICAgAKAgICAgIABAP8ABACA/oD/AID/AAGAAYD/AID/AIAACACAAIADgAQAAAMABwALAA8AEwAXABsAHwAAASEVISMzFSMlMxUjITMVIzMhFSkBMxEjJTMVIzMhFSECAAEA/wCAgIABgICA/gCAgIABgP6AAYCAgP2AgICAAgD+AAQAgICAgICA/wCAgIAAAwCAAIADgAQAAAcACwAPAAABIRUhESMRISMzFSMBMxEjAQACgP8AgP8AgICAAQCAgAQAgP6AAYCA/wD+gAAAAAUAgACAA4AEAAAFAAkADQARABUAABMhESMRIyUzESMBMxEjJTMVIykBFSGAAQCAgAKAgID9gICAAgCAgP6AAYD+gAQA/oABAID9gAEA/oCAgIAAAAYAgACAA4AEAAAFAAkADQATABcAGwAAEyERIxEjJTMRKwEzESMlMxEzFSEBMxUrATMVI4ABAICAAoCAgICAgP4AgID/AAGAgICAgIAEAP6AAQCA/wD/AID+gIABgICAAAQAgACAA4AEAAAHAAsAEwAXAAATMxEzFSMVIwEzESsBMxEjNSM1MyUzFSOAgICAgAKAgICAgICAgP8AgIAEAP2AgIADgP6A/gCAgICAAAAACQCAAIADgAQAAAMABwALAA8AEwAXABsAHwAjAAATIRUhJTMRIyUzESMlMxUrATMVKwEzFSMlMxEjJTMRIyUzFSOAAQD/AAKAgID+gICAAQCAgICAgICAgAEAgID+gICAAgCAgAQAgID/AID/AICAgICA/wCA/wCAgAAAAAcAgACAA4AEAAADAAcACwATABcAGwAfAAABMxUjJTMVIyEzESMBMxEjNSE1IQEzFSMlMxUjKQEVIQEAgIACAICA/YCAgAIAgID+gAGA/gCAgAGAgID/AAEA/wAEAICAgP8AAQD+AICA/wCAgICAAAAHAIAAgAOABAAABQAJAA0AEQAVAB0AIQAAASERIzUhIzMVIyEzFSsBMxUrATMVKwEzFSEVITUzJTMVIwEAAoCA/gCAgIACAICAgICAgICAgIABgP2AgAIAgIAEAP8AgICAgICAgICAgAAAAAACAQAAgAMABAAABQALAAABIRUhESsBMxEhFSEBgAGA/wCAgIABAP6ABACA/oD/AIAAAAAAAwFAAIACwAOAAAMABwALAAABMxEjOwERIzsBESMBQICAgICAgICAA4D/AP8A/wAAAgEAAIADAAQAAAUACwAAASERIxEhEzMRITUhAYABgID/AICA/oABAAQA/gABgP6A/oCAAAUAgAKAA4AEAAADAAcACwAPABMAAAEzFSsBMxUjJTMVIykBFSElMxUjAgCAgICAgAEAgID+AAEA/wACgICABACAgICAgICAAAIBgAIAAoADgAADAAcAAAEzESM7ARUjAYCAgICAgAOA/wCAAAUAgACAA4ADAAAHAAsADwATABcAAAEhFSMRIxEhIzMVKwEzESMzIRUhJTMVIwGAAgCAgP8AgICAgICAgAGA/oACAICAAwCA/oABgID/AICAgAAAAAMAgACAA4AEAAANABEAFQAAEyERMxUjESEVITUzESMFIRUpATMRI4ABAICAAYD9gICAAYABAP8AAQCAgAQA/oCA/wCAgAKAgID+gAAFAIAAgAOAAwAAAwAHAAsADwATAAABIRUhIzMVKwEzESMlMxUjKQEVIQGAAYD+gICAgICAgAKAgID+AAIA/gADAICA/wCAgIAAAAAABACAAIADgAQAAAMADwATABcAAAEzFSsBMxEzFSE1IREjNTMlIRUhIzMRIwMAgICAgID9gAGAgID+gAEA/wCAgIAEAID9gICAAQCAgID+gAAHAIAAgAOAA4AAAwAHAAsAEwAXABsAHwAAASEVISMzFSMlMxUjITMVIRUhFSMBMxUjFzMVIykBFSEBgAGA/oCAgIACAICA/YCAAYD+gIACAICAgICA/gACAP4AA4CAgICAgICAAYCAgICAAAAFAIAAgAOABAAAAwAPABMAFwAbAAABIRUhIzMRMxUjFSMRIzUzATMRKwEzFSMBMxUjAYABgP6AgICAgICAgAIAgICAgID+AICABACA/oCAgAEAgAEA/wCA/wCAAAUAgAAAA4ADAAADAAcACwATABcAAAEhFSElMxUjITMRIwEzESM1ITUhASEVIQEAAYD+gAIAgID9gICAAgCAgP6AAYD+gAGA/oADAICAgP8AAQD+AICA/wCAAAAABgCAAIADgAQAAAMACwAPABMAFwAbAAATMxUjOwERMxUjESMBIRUpATMRIyEzFSMlMxUjgICAgICAgIABAAEA/wABAICA/YCAgAIAgIAEAID/AID/AAIAgP6AgICAAAAAAwFAAIACwAQAAAMACwAPAAABMxUjBzMRIxEjNTMTMxUjAkCAgICAgICAgICABACAgP4AAQCA/oCAAAAABQCAAIADgAQAAAMACQANABEAFQAAATMVIwUhESMRKwEzFSMFMxUjMyEVIQMAgID/AAEAgICAgID/AICAgAGA/oAEAICA/gABgICAgIAAAAAHAIAAgAOAA4AAAwAHAA8AEwAXABsAHwAAEzMVIyUzFSMhMxEhFSEVIwEzESMVMxUjITMVIyUzFSOAgIABgICA/wCAAQD/AIABgICAgID+AICAAoCAgAOAgICA/wCAgAIA/wCAgICAgAAAAAADAYAAgAKABAAAAwAHAAsAAAEzFSM7ARErATMVIwGAgICAgICAgIAEAID9gIAAAAAIAIAAgAOAAwAAAwAHAAsADwATABcAGwAfAAATMxUjJTMVIyUzFSMhMxEjATMRIwEzESMhMxUjJTMVI4CAgAEAgIABAICA/oCAgAEAgIABAICA/YCAgAIAgIADAICAgICA/oABgP8AAQD+gICAgAAABgCAAIADgAMAAAMABwALAA8AEwAXAAATMxUjJSEVISMzESMBMxEjITMVIyUzFSOAgIABAAGA/oCAgIACAICA/YCAgAIAgIADAICAgP6AAYD+gICAgAAAAAYAgACAA4ADAAADAAcACwAPABMAFwAAASEVISMzFSMlMxEjJTMRIyUzFSMpARUhAYABgP6AgICAAgCAgP2AgIACAICA/oABgP6AAwCAgID/AID/AICAgAAFAIAAgAOAAwAAAwAHAA0AEQAVAAATMxUjJSEVISMzESEVIQEzESMFMxUjgICAAQABgP6AgIABgP4AAgCAgP2AgIADAICAgP8AgAGA/wCAgAAAAAACAIAAgAOAAwAACwAPAAABIRUjESM1ITUhESEjMxEjAQACgICA/oABgP6AgICAAwCA/gCAgAEA/wAAAAAFAIAAgAOAAwAAAwAHAAsADwATAAATMxUjJSEVISMzESMBMxUjATMVI4CAgAEAAYD+gICAgAIAgID9gICAAwCAgID+gAGAgP8AgAAABQCAAIADgAOAAAMABwALABEAFQAAATMVIykBFSEjMxUjMyERIzUhBSEVIQMAgID+gAGA/oCAgICAAgCA/oD/AAKA/YADgICAgP8AgICAAAAFAIAAgAOABAAAAwALAA8AEwAXAAATMxUjOwEVIRUhESMBMxUjEzMVIykBFSGAgICAgAEA/wCAAYCAgICAgP6AAYD+gAQAgICA/oACgID+gICAAAAFAIAAgAOAAwAAAwAHAAsADwATAAATMxUjJTMVIyEzESMBMxEjKQEVIYCAgAIAgID+gICAAgCAgP6AAYD+gAMAgICA/oABgP6AgAAABQCAAIADgAMAAAMABwAPABMAFwAAEzMVIyUzFSMhMxEzFSMVIwEzFSsBMxUjgICAAoCAgP4AgICAgAGAgICAgIADAICAgP8AgIACAICAAAAFAIAAgAOAAwAAAwAHABcAGwAfAAATMxUjJTMVIyEzETM1MxUzESM1IxUjNSMBMxEjBTMVI4CAgAIAgID+gICAgICAgICAAgCAgP2AgIADAICAgP8AgID/AICAgAGA/wCAgAAABwCAAIADgAMAAAMABwALAA8AEwAXABsAABMhFSElMxEjJTMVIzMh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') format('truetype');
                }
                * {
                    box-sizing: border-box;
                    font-family: 'Pixel';
                    user-select: none;
                }
                html, body {
                    background-color: black;
                    color: white;
                    font-size: 24px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100%;
                    width: 100%;
                    margin: 0;
                }
                div {
                    width: 100%;
                    height: 100%;
                    image-rendering: pixelated;
                    border: 48px solid transparent;
                    border-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAIAAADYYG7QAAAACXBIWXMAAAsTAAALEwEAmpwYAAABI0lEQVRYhe1Zyw6EIAyk+///3D2gpEAf6ApMss5FGG07KS1RpHSCmfOAiCTjTyXjkJecHDfKvTxQpw3ZjB3S8dnb1hONaSzV50PS8Vkxlk1v8CCsXDLzR94gIkv4j/osJzLoUUYjGXokWxcChTU0A0HQZdVjKVDU8Ik1akroEtRcr42ougwI6la7OfouTVhq9OhoRS0uu1FtOts1FQHYbb8XWAWUgbhTwwlKCWbVgvf8xXjbfgBv248BTlBKMKv2tv0g1n+LWQBte3EBecn32H9To0dHqyG8tk9oxzFSUz+erUYPinWkB3fo2XRdvwUoC3xXTej8EKTuQ1NXLchWWEONjfp8SDo+Faa3VLPq59IhHZ+NdO/PUmbkdORPVOikn0rmCythefLVkex/AAAAAElFTkSuQmCC") 16 round;
                }
            </style>
        </head>
        <body>
            <div>${message}</div>
        </body>
        </html>
    `);
}

function resize() {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    gl.uniform2f(scale, canvas.width, canvas.height);
    gl.uniform1f(tilesize, cell);
    gl.viewport(0, 0, canvas.width, canvas.height);
    requestAnimationFrame(draw);

    if (main) {
        channel.postMessage({
            type: 'resize',
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
            mainScreenX: window.screenX,
            mainScreenY: window.screenY,
            mainInnerWidth: window.innerWidth,
            mainInnerHeight: window.innerHeight,
            mainDPR: window.devicePixelRatio
        });
    }
}

let walking;

if (main) {
    document.addEventListener('keydown', (event) => {
        if (walking) {
            return;
        }
        switch (event.key) {
            case 'w':
                walking = true;
                grid[0].ty = 1;
                grid[0].y = grid[0].y + 0.5;
                requestAnimationFrame(draw);
                setTimeout(function(){
                    grid[0].ty = 2;
                    grid[0].y = grid[0].y + 0.5;
                    requestAnimationFrame(draw);
                }, 50);
                setTimeout(function(){
                    grid[0].ty = 0;
                    requestAnimationFrame(draw);
                    walking = false;
                }, 100);
                break;
            case 'a':
                walking = true;
                grid[0].ty = 1;
                grid[0].x = grid[0].x - 0.5;
                requestAnimationFrame(draw);
                setTimeout(function(){
                    grid[0].ty = 2;
                    grid[0].x = grid[0].x - 0.5;
                    requestAnimationFrame(draw);
                }, 50);
                setTimeout(function(){
                    grid[0].ty = 0;
                    requestAnimationFrame(draw);
                    walking = false;
                }, 100);
                break;
            case 's':
                walking = true;
                grid[0].ty = 1;
                grid[0].y = grid[0].y - 0.5;
                requestAnimationFrame(draw);
                setTimeout(function(){
                    grid[0].ty = 2;
                    grid[0].y = grid[0].y - 0.5;
                    requestAnimationFrame(draw);
                }, 50);
                setTimeout(function(){
                    grid[0].ty = 0;
                    requestAnimationFrame(draw);
                    walking = false;
                }, 100);
                break;
            case 'd':
                walking = true;
                grid[0].ty = 1;
                grid[0].x = grid[0].x + 0.5;
                requestAnimationFrame(draw);
                setTimeout(function(){
                    grid[0].ty = 2;
                    grid[0].x = grid[0].x + 0.5;
                    requestAnimationFrame(draw);
                }, 50);
                setTimeout(function(){
                    grid[0].ty = 0;
                    requestAnimationFrame(draw);
                    walking = false;
                }, 100);
                break;
            case ' ':
                for (var i = grid.length - 1; i >= 0; i--) {
                    grid[i].ty = grid[i].ty == 0 ? 1 : 0;
                }
                break;
        }
        requestAnimationFrame(draw);
    });
}

if (main) {
    var lastMainScreenX = window.screenX;
    var lastMainScreenY = window.screenY;

    function checkMainWindowPosition() {
        if (window.screenX !== lastMainScreenX || window.screenY !== lastMainScreenY) {
            channel.postMessage({
                type: 'move',
                mainScreenX: window.screenX,
                mainScreenY: window.screenY,
                mainInnerWidth: window.innerWidth,
                mainInnerHeight: window.innerHeight,
                mainDPR: window.devicePixelRatio
            });
            lastMainScreenX = window.screenX;
            lastMainScreenY = window.screenY;
        }
        requestAnimationFrame(checkMainWindowPosition);
    }

    requestAnimationFrame(checkMainWindowPosition);
}

var popupScreenOffsetX = 0.0;
var popupScreenOffsetY = 0.0;

if (isPopup) {

    document.title = "Looking Glass";
    document.getElementById("border1").style.display = "block";

    var mainScreenX = 0;
    var mainScreenY = 0;
    var mainInnerWidth = 0;
    var mainInnerHeight = 0;
    var mainDPR = 1.0;

    var popupScreenX = window.screenX;
    var popupScreenY = window.screenY;
    var popupInnerWidth = window.innerWidth;
    var popupInnerHeight = window.innerHeight;
    var popupDPR = window.devicePixelRatio;

    var lastPopupScreenX = window.screenX;
    var lastPopupScreenY = window.screenY;

    channel.onmessage = function(event) {
        var data = event.data;
        if (data.type === 'draw') {
            var entities = data.entities;
            grid = entities.map(function(e) {
                return new Entity(e.x, e.y, e.tx, e.ty);
            });
            mainScreenX = data.mainScreenX;
            mainScreenY = data.mainScreenY;
            mainInnerWidth = data.mainInnerWidth;
            mainInnerHeight = data.mainInnerHeight;
            mainDPR = data.mainDPR;
            recalculateOffset();
            requestAnimationFrame(draw);
        } else if (data.type === "resize") {
            mainScreenX = data.mainScreenX;
            mainScreenY = data.mainScreenY;
            mainInnerWidth = data.mainInnerWidth;
            mainInnerHeight = data.mainInnerHeight;
            mainDPR = data.mainDPR;
            recalculateOffset();
            requestAnimationFrame(draw);
        } else if (data.type === "move") {
            mainScreenX = data.mainScreenX;
            mainScreenY = data.mainScreenY;
            mainInnerWidth = data.mainInnerWidth;
            mainInnerHeight = data.mainInnerHeight;
            mainDPR = data.mainDPR;
            recalculateOffset();
            requestAnimationFrame(draw);
        }
    };

    window.addEventListener("resize", function(event) {
        canvas.width = window.innerWidth * window.devicePixelRatio;
        canvas.height = window.innerHeight * window.devicePixelRatio;
        gl.uniform2f(scale, canvas.width, canvas.height);
        gl.uniform1f(tilesize, cell);
        gl.viewport(0, 0, canvas.width, canvas.height);
        recalculateOffset();
        requestAnimationFrame(draw);
    });

    function recalculateOffset() {
        popupScreenX = window.screenX;
        popupScreenY = window.screenY;
        popupInnerWidth = window.innerWidth;
        popupInnerHeight = window.innerHeight;
        popupDPR = window.devicePixelRatio;

        // Calculate centers in device pixels
        var mainCenterX_devicePixels = (mainScreenX * mainDPR) + ((mainInnerWidth * mainDPR) / 2);
        var mainCenterY_devicePixels = (mainScreenY * mainDPR) + ((mainInnerHeight * mainDPR) / 2);

        var popupCenterX_devicePixels = (popupScreenX * popupDPR) + ((popupInnerWidth * popupDPR) / 2);
        var popupCenterY_devicePixels = (popupScreenY * popupDPR) + ((popupInnerHeight * popupDPR) / 2);

        // Offset between centers
        var offsetX_devicePixels = mainCenterX_devicePixels - popupCenterX_devicePixels;
        var offsetY_devicePixels = mainCenterY_devicePixels - popupCenterY_devicePixels;

        // Convert to NDC
        var offsetX_NDC = (offsetX_devicePixels * 2) / canvas.width;
        var offsetY_NDC = -(offsetY_devicePixels * 2) / canvas.height;

        popupScreenOffsetX = offsetX_NDC;
        popupScreenOffsetY = offsetY_NDC;
    }

    function update() {
        if (window.screenX !== lastPopupScreenX || window.screenY !== lastPopupScreenY) {
            recalculateOffset();
            requestAnimationFrame(draw);
            lastPopupScreenX = window.screenX;
            lastPopupScreenY = window.screenY;
        }
        requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
} else {
    document.getElementById("border2").style.display = "block";
    channel.onmessage = function(event) {
        channel.postMessage({
            type: 'draw',
            entities: grid,
            mainScreenX: window.screenX,
            mainScreenY: window.screenY,
            mainInnerWidth: window.innerWidth,
            mainInnerHeight: window.innerHeight,
            mainDPR: window.devicePixelRatio
        });
    };
}
channel.postMessage({
    type: 'draw'
});

resize();

if (!isPopup) {
    requestAnimationFrame(draw);
}
