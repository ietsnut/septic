const canvas = document.querySelector('canvas');
const context = canvas.getContext('2d');

const Display = {
    resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        draw();
    }
}

canvas.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => {
            Display.resize();
        }).catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
    }
});

window.addEventListener('resize', Display.resize);

window.addEventListener('keydown', (event) => {
    switch (event.key) {
        case 'r': // If 'r' is pressed, draw a red rectangle
            context.fillStyle = "red";
            context.fillRect(0, 0, canvas.width, canvas.height);
            break;
        case 'c': // If 'c' is pressed, clear the canvas
            context.clearRect(0, 0, canvas.width, canvas.height);
            break;
        default:
            console.log(`Key pressed: ${event.key}`);
    }
});

function draw() {
    with(context) {
        clearRect(0, 0, canvas.width, canvas.height);
        fillStyle = "blue";
        fillRect(50, 50, 200, 150);
    }
}

class Entity {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    draw(context) {
        // To be implemented by subclasses
    }
}

class Frame {}

class Memory {}

class Resource {}
class Image extends Resource {
    constructor(width, height, data) {
        super();
        this.width = width;
        this.height = height;
        this.data = data;
    }
}
class Audio extends Resource {

}

const imageData = [
    3, 3, 3, 3, 2, 2, 2, 2,
    3, 1, 1, 3, 2, 0, 0, 2,
    3, 1, 1, 3, 2, 0, 0, 2,
    3, 3, 3, 3, 2, 2, 2, 2
];
const myImage = new Image(8, 4, imageData);

const entity = new Entity(0, 0);

Display.resize();
draw();