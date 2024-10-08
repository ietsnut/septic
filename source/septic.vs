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
    vec2 cell = vec2(16.0, 16.0) / MAPWIDTH.0; 
    uv = (tile * cell) + (tcoord * cell);
    vec2 ndcPos = (((position * 2.0 * tilesize) + (vertex * tilesize)) / scale);
    float xCoord = flip ? (1.0 - tcoord.x) : tcoord.x;
    uv = (tile * cell) + (vec2(xCoord, tcoord.y) * cell);
    ndcPos.y    = -ndcPos.y;
    gl_Position = vec4(ndcPos, 0.0, 1.0);
}