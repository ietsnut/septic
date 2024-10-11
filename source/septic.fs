precision lowp float;
precision lowp int;

varying vec2 uv;

uniform sampler2D tileset;
uniform float tm;

uniform bool gray;

int albedo() {
    return int(mod(floor(texture2D(tileset, uv).r * 255.1 / pow(2.0, float(7 - int(mod(uv.x * tm, 8.0))))), 2.0));
}

void main() {
    if (albedo() == 0) {
        discard;
    }
    gl_FragColor = gray ? vec4(vec3(0.60), 1.0) : vec4(1.0);
}