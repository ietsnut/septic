precision lowp float;
precision lowp int;

attribute vec2 vertex;
attribute vec2 tcoord;

varying vec2 uv;

uniform vec2 scale;
uniform float tilesize;

uniform vec2 tile;
uniform vec2 position;
uniform bool flip;

void main() {
    vec2 cell = vec2(16.0, 16.0) / INCLUDE(septic.png,WIDTH).0;
    vec2 ndcPos = (((position * 2.0 * tilesize) + (vertex * tilesize)) / scale);
    float xCoord = flip ? (1.0 - tcoord.x) : tcoord.x;
    vec2 adjustedTcoord = vec2(
        mix(cell.x * 0.01, cell.x * 0.99, xCoord),
        mix(cell.y * 0.01, cell.y * 0.99, tcoord.y)
    );
    uv = (tile * cell) + adjustedTcoord;
    ndcPos.y = -ndcPos.y;
    gl_Position = vec4(ndcPos, 0.0, 1.0);
}