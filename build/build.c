#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/stat.h>
#include <time.h>
#include <ctype.h>
#include <fcntl.h>
#include <sys/select.h>

#define STB_IMAGE_IMPLEMENTATION
#include "stb_image.h"
#define STB_IMAGE_WRITE_IMPLEMENTATION
#include "stb_image_write.h"

#define TARGET "./index.html"
#define SOURCE "./source/septic."
#define SOURCE_HTML SOURCE "html"
#define SOURCE_CSS  SOURCE "css"
#define SOURCE_JS   SOURCE "js"
#define SOURCE_PNG  SOURCE "png"
#define SOURCE_CSV  SOURCE "csv"
#define SOURCE_TFF  SOURCE "tff"
#define SOURCE_MID  SOURCE "mid"
#define SOURCE_VS   SOURCE "vs"
#define SOURCE_FS   SOURCE "fs"

#define MAX_FILE_SIZE 2000000
#define MAX_MACRO_SIZE 10000

#define DEBUG_PRINT(fmt, ...) \
    do { fprintf(stderr, "DEBUG: %s:%d:%s(): " fmt, __FILE__, \
                __LINE__, __func__, __VA_ARGS__); } while (0)

char* read_file(const char* filename) {
    DEBUG_PRINT("Reading file: %s\n", filename);
    FILE* file = fopen(filename, "rb");
    if (!file) {
        DEBUG_PRINT("Failed to open file: %s\n", filename);
        return NULL;
    }
    fseek(file, 0, SEEK_END);
    long size = ftell(file);
    fseek(file, 0, SEEK_SET);
    DEBUG_PRINT("File size: %ld\n", size);
    char* content = malloc(size + 1);
    if (!content) {
        DEBUG_PRINT("Failed to allocate memory for file content\n", "");
        fclose(file);
        return NULL;
    }
    size_t read_size = fread(content, 1, size, file);
    if (read_size != size) {
        DEBUG_PRINT("Failed to read entire file. Read %zu bytes out of %ld\n", read_size, size);
        free(content);
        fclose(file);
        return NULL;
    }
    content[size] = '\0';
    fclose(file);
    return content;
}

void write_file(const char* filename, const char* content) {
    FILE* file = fopen(filename, "w");
    if (file) {
        fputs(content, file);
        fclose(file);
        DEBUG_PRINT("File written successfully: %s\n", filename);
    } else {
        DEBUG_PRINT("Failed to write file: %s\n", filename);
    }
}

char* base64_encode(const unsigned char* data, size_t input_length, size_t* output_length) {
    static const char base64_chars[] =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    *output_length = 4 * ((input_length + 2) / 3);
    char* encoded_data = malloc(*output_length + 1);
    if (!encoded_data) return NULL;

    size_t i, j;
    for (i = 0, j = 0; i < input_length;) {
        uint32_t octet_a = i < input_length ? data[i++] : 0;
        uint32_t octet_b = i < input_length ? data[i++] : 0;
        uint32_t octet_c = i < input_length ? data[i++] : 0;

        uint32_t triple = (octet_a << 16) + (octet_b << 8) + octet_c;

        encoded_data[j++] = base64_chars[(triple >> 18) & 63];
        encoded_data[j++] = base64_chars[(triple >> 12) & 63];
        encoded_data[j++] = base64_chars[(triple >> 6) & 63];
        encoded_data[j++] = base64_chars[triple & 63];
    }

    // Adjust padding
    if (input_length % 3 == 1) {
        encoded_data[*output_length - 1] = '=';
        encoded_data[*output_length - 2] = '=';
        *output_length -= 2;
    } else if (input_length % 3 == 2) {
        encoded_data[*output_length - 1] = '=';
        *output_length -= 1;
    }

    encoded_data[*output_length] = '\0';
    return encoded_data;
}

char* process_include(const char* filename);

char* process_base64(const char* filename) {
    char full_path[512];
    snprintf(full_path, sizeof(full_path), "%s%s", SOURCE, filename);
    DEBUG_PRINT("Processing BASE64 for file: %s\n", full_path);
    
    FILE* file = fopen(full_path, "rb");
    if (!file) {
        DEBUG_PRINT("Failed to open file: %s\n", full_path);
        return NULL;
    }
    
    fseek(file, 0, SEEK_END);
    long file_size = ftell(file);
    fseek(file, 0, SEEK_SET);
    
    unsigned char* content = malloc(file_size);
    if (!content) {
        DEBUG_PRINT("Failed to allocate memory for file content\n", "");
        fclose(file);
        return NULL;
    }
    
    size_t read_size = fread(content, 1, file_size, file);
    fclose(file);
    
    if (read_size != file_size) {
        DEBUG_PRINT("Failed to read entire file. Read %zu bytes out of %ld\n", read_size, file_size);
        free(content);
        return NULL;
    }
    
    DEBUG_PRINT("File size: %ld\n", file_size);
    
    size_t output_length;
    char* base64 = base64_encode(content, file_size, &output_length);
    free(content);
    
    if (!base64) {
        DEBUG_PRINT("Failed to encode file to base64\n", "");
        return NULL;
    }
    
    DEBUG_PRINT("Base64 encoded length: %zu\n", output_length);

    // We're returning the base64 string directly now, without additional processing
    return base64;
}

char* process_tile(int tile_x, int tile_y) {
    DEBUG_PRINT("Processing TILE: x=%d, y=%d\n", tile_x, tile_y);
    int width, height, channels;
    unsigned char* img = stbi_load(SOURCE_PNG, &width, &height, &channels, 0);
    if (!img) {
        DEBUG_PRINT("Failed to load image: %s\n", SOURCE_PNG);
        return NULL;
    }
    
    int tile_size = 16;
    unsigned char* tile = malloc(tile_size * tile_size * channels);
    for (int y = 0; y < tile_size; y++) {
        for (int x = 0; x < tile_size; x++) {
            int src = ((tile_y * tile_size + y) * width + (tile_x * tile_size + x)) * channels;
            int dst = (y * tile_size + x) * channels;
            memcpy(tile + dst, img + src, channels);
        }
    }
    
    size_t output_length;
    char* base64 = base64_encode(tile, tile_size * tile_size * channels, &output_length);
    free(tile);
    stbi_image_free(img);
    
    char* result = malloc(output_length + 30);
    sprintf(result, "data:image/png;base64,%s", base64);
    free(base64);
    return result;
}

char* process_tiles(int tile_x, int tile_y, int tile_w, int tile_h) {
    DEBUG_PRINT("Processing TILES: x=%d, y=%d, w=%d, h=%d\n", tile_x, tile_y, tile_w, tile_h);
    int width, height, channels;
    unsigned char* img = stbi_load(SOURCE_PNG, &width, &height, &channels, 0);
    if (!img) {
        DEBUG_PRINT("Failed to load image: %s\n", SOURCE_PNG);
        return NULL;
    }
    
    int tile_size = 16;
    int chunk_w = tile_w * tile_size, chunk_h = tile_h * tile_size;
    unsigned char* chunk = malloc(chunk_w * chunk_h * channels);
    for (int y = 0; y < chunk_h; y++) {
        for (int x = 0; x < chunk_w; x++) {
            int src = ((tile_y * tile_size + y) * width + (tile_x * tile_size + x)) * channels;
            int dst = (y * chunk_w + x) * channels;
            memcpy(chunk + dst, img + src, channels);
        }
    }
    
    size_t output_length;
    char* base64 = base64_encode(chunk, chunk_w * chunk_h * channels, &output_length);
    free(chunk);
    stbi_image_free(img);
    
    char* result = malloc(output_length + 30);
    sprintf(result, "data:image/png;base64,%s", base64);
    free(base64);
    return result;
}

char* process_tilemap() {
    DEBUG_PRINT("Processing TILEMAP\n", "");
    int width, height, channels;
    unsigned char* img = stbi_load(SOURCE_PNG, &width, &height, &channels, 0);
    if (!img) {
        DEBUG_PRINT("Failed to load image: %s\n", SOURCE_PNG);
        return NULL;
    }
    
    int img_size = width * height;
    unsigned char* tileset = (unsigned char*)malloc(img_size);
    if (!tileset) {
        DEBUG_PRINT("Failed to allocate memory for tileset\n", "");
        stbi_image_free(img);
        return NULL;
    }

    // Convert image to binary (0 or 1)
    for (int i = 0; i < img_size; i++) {
        int pixel = i * channels;
        tileset[i] = (img[pixel] || img[pixel + 1] || img[pixel + 2]) ? 1 : 0;
    }

    int tb_size = (img_size + 7) / 8;
    unsigned char* tb = (unsigned char*)malloc(tb_size);
    if (!tb) {
        DEBUG_PRINT("Failed to allocate memory for packed tilemap\n", "");
        free(tileset);
        stbi_image_free(img);
        return NULL;
    }

    for (int i = 0; i < img_size; i += 8) {
        unsigned char packedByte = 0;
        for (int j = 0; j < 8; j++) {
            if (i + j < img_size)
                packedByte |= (tileset[i + j] > 0 ? 1 : 0) << (7 - j);
        }
        tb[i / 8] = packedByte;
    }

    free(tileset);
    stbi_image_free(img);

    // Convert packed bytes to string
    char* result = malloc(tb_size * 4 + 1);
    if (!result) {
        DEBUG_PRINT("Failed to allocate memory for result string\n", "");
        free(tb);
        return NULL;
    }

    char* ptr = result;
    for (int i = 0; i < tb_size; i++)
        ptr += sprintf(ptr, "%d,", tb[i]);
    *(ptr - 1) = '\0';  // Remove the last comma

    free(tb);
    return result;
}

int get_mapwidth() {
    DEBUG_PRINT("Processing MAPWIDTH\n", "");
    int width, height, channels;
    unsigned char* img = stbi_load(SOURCE_PNG, &width, &height, &channels, 0);
    if (!img) {
        DEBUG_PRINT("Failed to load image: %s\n", SOURCE_PNG);
        return 0;
    }
    stbi_image_free(img);
    return width;
}

char* process_frame(int tile_x, int tile_y) {
    DEBUG_PRINT("Processing FRAME: x=%d, y=%d\n", tile_x, tile_y);
    int width, height, channels;
    unsigned char* img = stbi_load(SOURCE_PNG, &width, &height, &channels, 0);
    if (!img) {
        DEBUG_PRINT("Failed to load image: %s\n", SOURCE_PNG);
        return NULL;
    }
    DEBUG_PRINT("Image loaded: width=%d, height=%d, channels=%d\n", width, height, channels);

    int tile_size = 16, frame_size = 48;
    unsigned char* frame = malloc(frame_size * frame_size * 4); // Always use 4 channels (RGBA) for output
    if (!frame) {
        DEBUG_PRINT("Failed to allocate memory for frame\n", "");
        stbi_image_free(img);
        return NULL;
    }

    // Initialize frame with transparent pixels
    memset(frame, 0, frame_size * frame_size * 4);

    // Helper function to copy and rotate a tile
    void copy_rotate_tile(int src_x, int src_y, int dst_x, int dst_y, int rotate) {
        for (int y = 0; y < tile_size; y++) {
            for (int x = 0; x < tile_size; x++) {
                int src_idx = ((src_y * tile_size + y) * width + (src_x * tile_size + x)) * channels;
                int dst_idx;
                switch (rotate) {
                    case 0: dst_idx = ((dst_y * tile_size + y) * frame_size + (dst_x * tile_size + x)) * 4; break;
                    case 1: dst_idx = ((dst_y * tile_size + x) * frame_size + (dst_x * tile_size + (tile_size-1-y))) * 4; break;
                    case 2: dst_idx = ((dst_y * tile_size + (tile_size-1-y)) * frame_size + (dst_x * tile_size + (tile_size-1-x))) * 4; break;
                    case 3: dst_idx = ((dst_y * tile_size + (tile_size-1-x)) * frame_size + (dst_x * tile_size + y)) * 4; break;
                }
                
                // Copy RGB channels
                for (int c = 0; c < 3; c++) {
                    frame[dst_idx + c] = img[src_idx + c];
                }
                
                // Set alpha channel
                if (frame[dst_idx] == 0 && frame[dst_idx + 1] == 0 && frame[dst_idx + 2] == 0) {
                    frame[dst_idx + 3] = 0; // Transparent for black pixels
                } else {
                    frame[dst_idx + 3] = (channels == 4) ? img[src_idx + 3] : 255;
                }
            }
        }
    }

    // Copy and rotate corner tiles
    copy_rotate_tile(tile_x, tile_y, 0, 0, 0);       // Top-left
    copy_rotate_tile(tile_x, tile_y, 2, 0, 1);       // Top-right
    copy_rotate_tile(tile_x, tile_y, 0, 2, 3);       // Bottom-left
    copy_rotate_tile(tile_x, tile_y, 2, 2, 2);       // Bottom-right

    // Copy and rotate side tiles
    copy_rotate_tile(tile_x, tile_y+1, 1, 0, 1);     // Top
    copy_rotate_tile(tile_x, tile_y+1, 0, 1, 0);     // Left
    copy_rotate_tile(tile_x, tile_y+1, 2, 1, 2);     // Right
    copy_rotate_tile(tile_x, tile_y+1, 1, 2, 3);     // Bottom

    // Encode frame to PNG
    int png_size;
    unsigned char* png_data = stbi_write_png_to_mem(frame, 0, frame_size, frame_size, 4, &png_size);
    if (!png_data) {
        DEBUG_PRINT("Failed to encode frame to PNG\n", "");
        free(frame);
        stbi_image_free(img);
        return NULL;
    }

    // Encode PNG to base64
    size_t base64_size;
    char* base64 = base64_encode(png_data, png_size, &base64_size);
    free(png_data);
    free(frame);
    stbi_image_free(img);

    if (!base64) {
        DEBUG_PRINT("Failed to encode PNG to base64\n", "");
        return NULL;
    }

    DEBUG_PRINT("Frame processing completed successfully\n", "");
    return base64;
}

/*

Current macros:

 - INCLUDE(extension)
 - BASE64(extension)
 - TILE(x, y)
 - TILES(x, y, w, h)
 - TILEMAP
 - MAPWIDTH
 - FRAME(x, y)

Make the following changes:

+ change all macros to INCLUDE with parameters:

 - INCLUDE(file)
 - INCLUDE(file, BASE64)
 - INCLUDE(file, TILE, x, y)
 - INCLUDE(file, TILES, x, y, w, h)
 - INCLUDE(file, TILESET)           // used to be TILEMAP
 - INCLUDE(file, WIDTH)             // echo width of image file
 - INCLUDE(file, FRAME, x, y)
 
+ Change SOURCE to be just "./source/", so any filename and extension can be used
+ Change the process_ methods of each macro to use a filename instead


*/

char* preprocess_content(const char* content) {
    DEBUG_PRINT("Entering preprocess_content\n", "");
    DEBUG_PRINT("Content length: %zu\n", strlen(content));

    char* result = malloc(MAX_FILE_SIZE);
    if (!result) {
        DEBUG_PRINT("Failed to allocate memory for result\n", "");
        return NULL;
    }

    char* output = result;
    const char* input = content;

    while (*input) {
        if (strncmp(input, "INCLUDE(", 8) == 0) {
            const char* start = input + 8;
            const char* end = strchr(start, ')');
            if (end) {
                size_t filename_len = end - start;
                char filename[257];
                strncpy(filename, start, filename_len);
                filename[filename_len] = '\0';
                
                DEBUG_PRINT("Processing INCLUDE macro for file: '%s'\n", filename);
                
                char* included = process_include(filename);
                if (included) {
                    size_t included_len = strlen(included);
                    if (output - result + included_len >= MAX_FILE_SIZE) {
                        DEBUG_PRINT("Not enough space for INCLUDE content\n", "");
                        free(included);
                        free(result);
                        return NULL;
                    }
                    output += sprintf(output, "%s", included);
                    free(included);
                } else {
                    DEBUG_PRINT("Failed to process INCLUDE for file: '%s'. Keeping original macro.\n", filename);
                    output += sprintf(output, "INCLUDE(%s)", filename);
                }
                input = end + 1;
            } else {
                DEBUG_PRINT("Malformed INCLUDE macro: %s\n", input);
                *output++ = *input++;
            }
        } else if (strncmp(input, "BASE64(", 7) == 0) {
            const char* start = input + 7;
            const char* end = strchr(start, ')');
            if (end) {
                size_t filename_len = end - start;
                char filename[257];
                strncpy(filename, start, filename_len);
                filename[filename_len] = '\0';
                
                DEBUG_PRINT("Processing BASE64 macro for file: '%s'\n", filename);
                
                char* base64_content = process_base64(filename);
                if (base64_content) {
                    size_t base64_len = strlen(base64_content);
                    DEBUG_PRINT("BASE64 content length: %zu\n", base64_len);
                    if (output - result + base64_len >= MAX_FILE_SIZE) {
                        DEBUG_PRINT("Not enough space for BASE64 content\n", "");
                        free(base64_content);
                        free(result);
                        return NULL;
                    }
                    output += sprintf(output, "%s", base64_content);
                    free(base64_content);
                    DEBUG_PRINT("BASE64 content added successfully\n", "");
                } else {
                    DEBUG_PRINT("Failed to process BASE64 for file: '%s'. Keeping original macro.\n", filename);
                    output += sprintf(output, "BASE64(%s)", filename);
                }
                input = end + 1;
            } else {
                DEBUG_PRINT("Malformed BASE64 macro: %s\n", input);
                *output++ = *input++;
            }
        } else if (strncmp(input, "TILE(", 5) == 0) {
            int x, y;
            if (sscanf(input, "TILE(%d,%d)", &x, &y) == 2) {
                char* tile_content = process_tile(x, y);
                if (tile_content) {
                    size_t tile_len = strlen(tile_content);
                    if (output - result + tile_len >= MAX_FILE_SIZE) {
                        DEBUG_PRINT("Not enough space for TILE content\n", "");
                        free(tile_content);
                        free(result);
                        return NULL;
                    }
                    output += sprintf(output, "%s", tile_content);
                    free(tile_content);
                } else {
                    DEBUG_PRINT("Failed to process TILE(%d,%d). Keeping original macro.\n", x, y);
                    output += sprintf(output, "TILE(%d,%d)", x, y);
                }
                input = strchr(input, ')') + 1;
            } else {
                DEBUG_PRINT("Malformed TILE macro: %s\n", input);
                *output++ = *input++;
            }
        } else if (strncmp(input, "TILES(", 6) == 0) {
            int x, y, w, h;
            if (sscanf(input, "TILES(%d,%d,%d,%d)", &x, &y, &w, &h) == 4) {
                char* tiles_content = process_tiles(x, y, w, h);
                if (tiles_content) {
                    size_t tiles_len = strlen(tiles_content);
                    if (output - result + tiles_len >= MAX_FILE_SIZE) {
                        DEBUG_PRINT("Not enough space for TILES content\n", "");
                        free(tiles_content);
                        free(result);
                        return NULL;
                    }
                    output += sprintf(output, "%s", tiles_content);
                    free(tiles_content);
                } else {
                    DEBUG_PRINT("Failed to process TILES(%d,%d,%d,%d). Keeping original macro.\n", x, y, w, h);
                    output += sprintf(output, "TILES(%d,%d,%d,%d)", x, y, w, h);
                }
                input = strchr(input, ')') + 1;
            } else {
                DEBUG_PRINT("Malformed TILES macro: %s\n", input);
                *output++ = *input++;
            }
        } else if (strncmp(input, "TILEMAP", 7) == 0) {
            char* tilemap_content = process_tilemap();
            if (tilemap_content) {
                size_t tilemap_len = strlen(tilemap_content);
                if (output - result + tilemap_len >= MAX_FILE_SIZE) {
                    DEBUG_PRINT("Not enough space for TILEMAP content\n", "");
                    free(tilemap_content);
                    free(result);
                    return NULL;
                }
                output += sprintf(output, "%s", tilemap_content);
                free(tilemap_content);
            } else {
                DEBUG_PRINT("Failed to process TILEMAP. Keeping original macro.\n", "");
                output += sprintf(output, "TILEMAP");
            }
            input += 7;
        } else if (strncmp(input, "MAPWIDTH", 8) == 0) {
            int mapwidth = get_mapwidth();
            if (mapwidth > 0) {
                output += sprintf(output, "%d", mapwidth);
            } else {
                DEBUG_PRINT("Failed to process MAPWIDTH. Keeping original macro.\n", "");
                output += sprintf(output, "MAPWIDTH");
            }
            input += 8;
        } else if (strncmp(input, "FRAME(", 6) == 0) {
            int x, y;
            if (sscanf(input, "FRAME(%d,%d)", &x, &y) == 2) {
                DEBUG_PRINT("Processing FRAME macro: x=%d, y=%d\n", x, y);
                char* frame_content = process_frame(x, y);
                if (frame_content) {
                    size_t frame_len = strlen(frame_content);
                    DEBUG_PRINT("FRAME content length: %zu\n", frame_len);
                    if (output - result + frame_len >= MAX_FILE_SIZE) {
                        DEBUG_PRINT("Not enough space for FRAME content\n", "");
                        free(frame_content);
                        free(result);
                        return NULL;
                    }
                    output += sprintf(output, "%s", frame_content);
                    free(frame_content);
                } else {
                    DEBUG_PRINT("Failed to process FRAME(%d,%d). Keeping original macro.\n", x, y);
                    output += sprintf(output, "FRAME(%d,%d)", x, y);
                }
                input = strchr(input, ')') + 1;
            } else {
                DEBUG_PRINT("Malformed FRAME macro: %s\n", input);
                *output++ = *input++;
            }
        } else {
            *output++ = *input++;
        }

        if (output - result >= MAX_FILE_SIZE - 1) {
            DEBUG_PRINT("Output buffer full\n", "");
            free(result);
            return NULL;
        }
    }

    *output = '\0';
    DEBUG_PRINT("Preprocessing completed. Result length: %zu\n", strlen(result));
    return result;
}

char* process_include(const char* filename) {
    char full_path[512];
    snprintf(full_path, sizeof(full_path), "%s%s", SOURCE, filename);
    DEBUG_PRINT("Processing include for file: '%s'\n", full_path);
    
    char* content = read_file(full_path);
    if (!content) {
        DEBUG_PRINT("Failed to read included file: '%s'\n", full_path);
        return NULL;
    }
    DEBUG_PRINT("Successfully read included file: '%s', size: %zu\n", full_path, strlen(content));
    char* processed = preprocess_content(content);
    free(content);
    return processed;
}

char* minify_css(const char* css) {
    char* minified = malloc(strlen(css) + 1);
    char* output = minified;
    const char* input = css;
    int in_comment = 0;
    int in_string = 0;
    char string_char = 0;

    while (*input) {
        if (!in_comment && !in_string && input[0] == '/' && input[1] == '*') {
            in_comment = 1;
            input += 2;
        } else if (in_comment && input[0] == '*' && input[1] == '/') {
            in_comment = 0;
            input += 2;
        } else if (!in_comment && (*input == '"' || *input == '\'')) {
            in_string = !in_string;
            string_char = *input;
            *output++ = *input++;
        } else if (in_string && *input == string_char && *(input-1) != '\\') {
            in_string = 0;
            *output++ = *input++;
        } else if (!in_comment) {
            if (in_string || !isspace(*input) || (output > minified && !isspace(*(output-1))))
                *output++ = *input;
            input++;
        } else {
            input++;
        }
    }
    *output = '\0';
    return minified;
}

char* minify_js(const char* js) {
    char* minified = malloc(strlen(js) + 1);
    char* output = minified;
    const char* input = js;
    int in_string = 0;
    char string_char = 0;
    int in_single_line_comment = 0;
    int in_multi_line_comment = 0;

    while (*input) {
        // Handle string literals
        if (!in_single_line_comment && !in_multi_line_comment && !in_string && (*input == '"' || *input == '\'')) {
            in_string = 1;
            string_char = *input;
            *output++ = *input++;
        } else if (in_string && *input == string_char && *(input-1) != '\\') {
            in_string = 0;
            *output++ = *input++;
        } else if (in_string) {
            *output++ = *input++;
        }
        // Handle single-line comments
        else if (!in_string && !in_multi_line_comment && input[0] == '/' && input[1] == '/') {
            in_single_line_comment = 1;
            input += 2;
        } else if (in_single_line_comment && (*input == '\n' || *input == '\r')) {
            in_single_line_comment = 0;
            *output++ = *input++;
        }
        // Handle multi-line comments
        else if (!in_string && !in_single_line_comment && input[0] == '/' && input[1] == '*') {
            in_multi_line_comment = 1;
            input += 2;
        } else if (in_multi_line_comment && input[0] == '*' && input[1] == '/') {
            in_multi_line_comment = 0;
            input += 2;
        }
        // Handle regular code
        else if (!in_single_line_comment && !in_multi_line_comment) {
            if (isspace(*input)) {
                if (output > minified && !isspace(*(output-1)))
                    *output++ = ' ';
                input++;
            } else {
                *output++ = *input++;
            }
        } else {
            input++;
        }
    }
    *output = '\0';
    return minified;
}

void compile() {
    DEBUG_PRINT("Starting compilation\n", "");
    
    char* html = read_file(SOURCE_HTML);
    char* css = read_file(SOURCE_CSS);
    char* js = read_file(SOURCE_JS);

    if (!html || !css || !js) {
        DEBUG_PRINT("Error reading source files\n", "");
        return;
    }

    DEBUG_PRINT("All source files read successfully\n", "");

    char* processed_css = preprocess_content(css);
    char* processed_js = preprocess_content(js);
    
    if (!processed_css || !processed_js) {
        DEBUG_PRINT("Error preprocessing content\n", "");
        return;
    }

    char* minified_css = minify_css(processed_css);
    char* minified_js = minify_js(processed_js);

    if (!minified_css || !minified_js) {
        DEBUG_PRINT("Error minifying content\n", "");
        return;
    }

    char* result = malloc(strlen(html) + strlen(minified_css) + strlen(minified_js) + 100);
    if (!result) {
        DEBUG_PRINT("Error allocating memory for result\n", "");
        return;
    }

    sprintf(result, "%s\n<style>%s</style>\n<script>%s</script>", html, minified_css, minified_js);

    write_file(TARGET, result);

    free(html);
    free(css);
    free(js);
    free(processed_css);
    free(processed_js);
    free(minified_css);
    free(minified_js);
    free(result);

    DEBUG_PRINT("Compilation complete. Output written to %s\n", TARGET);
}

time_t get_last_modified(const char* filename) {
    struct stat attr;
    if (stat(filename, &attr) == 0)
        return attr.st_mtime;
    return 0;
}

int main() {
    DEBUG_PRINT("Starting main function\n", "");
    
    time_t last_compile = 0;
    const char* source_files[] = {SOURCE_HTML, SOURCE_CSS, SOURCE_JS, SOURCE_PNG, SOURCE_CSV, SOURCE_TFF, SOURCE_MID, SOURCE_VS, SOURCE_FS};
    int num_files = sizeof(source_files) / sizeof(source_files[0]);

    while (1) {
        int need_compile = 0;
        for (int i = 0; i < num_files; i++) {
            time_t file_time = get_last_modified(source_files[i]);
            if (file_time > last_compile) {
                need_compile = 1;
                break;
            }
        }

        if (need_compile) {
            compile();
            last_compile = time(NULL);
        }

        fd_set readfds;
        struct timeval tv;
        FD_ZERO(&readfds);
        FD_SET(STDIN_FILENO, &readfds);
        tv.tv_sec = 1;
        tv.tv_usec = 0;

        if (select(STDIN_FILENO + 1, &readfds, NULL, NULL, &tv) > 0) {
            char c = getchar();
            if (c == 27) { // ESC key
                DEBUG_PRINT("Exiting...\n", "");
                break;
            } else if (c == 32) { // Space key
                compile();
                last_compile = time(NULL);
            }
        }
    }

    DEBUG_PRINT("Exiting main function\n", "");
    return 0;
}