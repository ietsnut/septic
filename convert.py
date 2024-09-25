from PIL import Image
import sys

def image_to_js_texture(image_path):
    # Open the image
    with Image.open(image_path) as img:
        # Convert the image to grayscale
        img = img.convert('L')  # 'L' mode is for grayscale
        
        # Get image dimensions
        width, height = img.size
        
        # Threshold the image (automatically setting 1 for white and 0 for black)
        threshold = 128
        binary_pixels = [(1 if pixel >= threshold else 0) for pixel in img.getdata()]
        
        # Format the pixel data as a string for JavaScript
        js_array = ", ".join(map(str, binary_pixels))
        
        # Generate the JavaScript constant
        js_code = f"""const texture = new Texture(gl, [
    {js_array}
], {width}, {height});
"""
        return js_code

if __name__ == "__main__":
    # Example usage: python script.py image.png
    if len(sys.argv) != 2:
        print("Usage: python script.py <image_path>")
        sys.exit(1)
    
    image_path = sys.argv[1]
    js_code = image_to_js_texture(image_path)
    
    # Print the generated JavaScript code
    print(js_code)
