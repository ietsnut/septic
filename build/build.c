#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/stat.h>
#include <time.h>
#include <ctype.h>
#include <fcntl.h>
#include <sys/select.h>
#include <dirent.h>

#define STB_IMAGE_IMPLEMENTATION
#include "stb_image.h"
#define STB_IMAGE_WRITE_IMPLEMENTATION
#include "stb_image_write.h"

#define TARGET "./index.html"
#define SOURCE "./source/"

#define MAX_FILE_SIZE 100000000
#define MAX_MACRO_SIZE 10000
#define MAX_INCLUDE_FILES 100
#define MAX_INCLUDED_FILES 100

#define DEBUG 0  // Set to 1 to enable debug output, 0 to disable

#if DEBUG
#define DEBUG_PRINT(fmt, ...) \
    do { fprintf(stderr, "DEBUG: %s:%d:%s(): " fmt, __FILE__, \
                __LINE__, __func__, __VA_ARGS__); } while (0)
#else
#define DEBUG_PRINT(fmt, ...) do {} while (0)
#endif

// Forward declarations
char* read_file(const char* filename);
char* process_include(const char* filename);
char* preprocess_content(const char* content, const char* current_file);

/*

 - INCLUDE(file)
 - INCLUDE(file, BASE64)
 - INCLUDE(file, TILE, x, y)
 - INCLUDE(file, TILESET)           // used to be TILEMAP
 - INCLUDE(file, WIDTH)             // echo width of image file
 - INCLUDE(file, FRAME, x, y)

*/

char* processed_files[MAX_INCLUDE_FILES];
int num_processed_files = 0;

struct inclusion_info {
    char filename[512];
    char args[512];
    struct inclusion_info* children;
    int num_children;
    int max_children;
};

struct included_file {
    char filename[512];
    time_t last_modified;
};

struct included_file included_files[MAX_INCLUDED_FILES];
int num_included_files = 0;

time_t get_last_modified(const char* filename) {
    struct stat attr;
    if (stat(filename, &attr) == 0)
        return attr.st_mtime;
    return 0;
}

void add_processed_file(const char* filename) {
    if (num_processed_files < MAX_INCLUDE_FILES) {
        processed_files[num_processed_files] = strdup(filename);
        num_processed_files++;
    }
}

int is_file_processed(const char* filename) {
    for (int i = 0; i < num_processed_files; i++) {
        if (strcmp(processed_files[i], filename) == 0) {
            return 1;
        }
    }
    return 0;
}

void free_processed_files() {
    for (int i = 0; i < num_processed_files; i++) {
        free(processed_files[i]);
    }
    num_processed_files = 0;
}

struct inclusion_info* process_includes_recursively(const char* filename, const char* args) {
    struct inclusion_info* info = malloc(sizeof(struct inclusion_info));
    strcpy(info->filename, filename);
    strcpy(info->args, args ? args : "");
    info->children = NULL;
    info->num_children = 0;
    info->max_children = 0;

    if (is_file_processed(filename)) {
        return info;
    }
    
    add_processed_file(filename);
    
    char full_path[512];
    snprintf(full_path, sizeof(full_path), "%s%s", SOURCE, filename);
    
    // Add the file to the included_files array if it's not already there
    int file_index = -1;
    for (int i = 0; i < num_included_files; i++) {
        if (strcmp(included_files[i].filename, filename) == 0) {
            file_index = i;
            break;
        }
    }
    if (file_index == -1 && num_included_files < MAX_INCLUDED_FILES) {
        file_index = num_included_files++;
        strcpy(included_files[file_index].filename, filename);
        included_files[file_index].last_modified = 0;  // Initialize to 0
    }
    
    char* content = read_file(full_path);
    if (!content) {
        return info;
    }
    
    const char* input = content;
    while (*input) {
        if (strncmp(input, "INCLUDE(", 8) == 0) {
            const char* start = input + 8;
            const char* end = strchr(start, ')');
            if (end) {
                char included_file[256];
                char included_args[512] = "";
                size_t len = end - start;
                strncpy(included_file, start, len);
                included_file[len] = '\0';
                
                char* comma = strchr(included_file, ',');
                if (comma) {
                    *comma = '\0';
                    strcpy(included_args, comma + 1);
                }
                
                struct inclusion_info* child = process_includes_recursively(included_file, included_args);
                
                if (info->num_children >= info->max_children) {
                    info->max_children = info->max_children ? info->max_children * 2 : 8;
                    info->children = realloc(info->children, info->max_children * sizeof(struct inclusion_info));
                }
                info->children[info->num_children++] = *child;
                free(child);
                
                input = end + 1;
            } else {
                input++;
            }
        } else {
            input++;
        }
    }
    
    free(content);
    return info;
}

void print_inclusion_tree(struct inclusion_info* info, int depth, int is_last, char* prefix) {
    if (depth > 0) {
        printf("%s", prefix);
        printf(is_last ? "└── " : "├── ");
    }
    
    printf("%s", info->filename);
    if (info->args[0] != '\0') {
        printf(" (%s)", info->args);
    }
    printf("\n");
    
    char new_prefix[1024];
    strcpy(new_prefix, prefix);
    if (depth > 0) {
        strcat(new_prefix, is_last ? "    " : "│   ");
    }
    
    for (int i = 0; i < info->num_children; i++) {
        print_inclusion_tree(&info->children[i], depth + 1, i == info->num_children - 1, new_prefix);
    }
}

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

int write_file(const char* filename, const char* content) {
    FILE* file = fopen(filename, "w");
    if (file) {
        fputs(content, file);
        fclose(file);
        DEBUG_PRINT("File written successfully: %s\n", filename);
        return 0;
    } else {
        DEBUG_PRINT("Failed to write file: %s\n", filename);
        return -1;
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

    return base64;
}

char* process_tiles(const char* filename, int tile_x, int tile_y, int tile_w, int tile_h) {
    DEBUG_PRINT("Processing TILES: file=%s, x=%d, y=%d, w=%d, h=%d\n", filename, tile_x, tile_y, tile_w, tile_h);
    char full_path[512];
    snprintf(full_path, sizeof(full_path), "%s%s", SOURCE, filename);
    
    int width, height, channels;
    unsigned char* img = stbi_load(full_path, &width, &height, &channels, 0);
    if (!img) {
        DEBUG_PRINT("Failed to load image: %s\n", full_path);
        return NULL;
    }
    
    int tile_size = 16;
    int output_width = tile_w * tile_size;
    int output_height = tile_h * tile_size;
    unsigned char* tiles = malloc(output_width * output_height * 4); // Always use 4 channels (RGBA) for output
    if (!tiles) {
        DEBUG_PRINT("Failed to allocate memory for tiles\n", "");
        stbi_image_free(img);
        return NULL;
    }

    // Extract the tiles
    for (int y = 0; y < tile_h; y++) {
        for (int x = 0; x < tile_w; x++) {
            for (int py = 0; py < tile_size; py++) {
                for (int px = 0; px < tile_size; px++) {
                    int src_idx = (((tile_y + y) * tile_size + py) * width + ((tile_x + x) * tile_size + px)) * channels;
                    int dst_idx = ((y * tile_size + py) * output_width + (x * tile_size + px)) * 4;
                    
                    // Copy RGB channels
                    for (int c = 0; c < 3; c++) {
                        tiles[dst_idx + c] = img[src_idx + c];
                    }
                    
                    // Set alpha channel
                    tiles[dst_idx + 3] = (channels == 4) ? img[src_idx + 3] : 255;
                }
            }
        }
    }
    
    stbi_image_free(img);

    // Encode tiles to PNG
    int png_size;
    unsigned char* png_data = stbi_write_png_to_mem(tiles, 0, output_width, output_height, 4, &png_size);
    free(tiles);

    if (!png_data) {
        DEBUG_PRINT("Failed to encode tiles to PNG\n", "");
        return NULL;
    }

    // Encode PNG to base64
    size_t base64_size;
    char* base64 = base64_encode(png_data, png_size, &base64_size);
    free(png_data);

    if (!base64) {
        DEBUG_PRINT("Failed to encode PNG to base64\n", "");
        return NULL;
    }

    DEBUG_PRINT("Tiles processed successfully. Base64 length: %zu\n", base64_size);

    // Prepend the data URL scheme
    char* result = malloc(base64_size + 30);
    if (!result) {
        DEBUG_PRINT("Failed to allocate memory for result\n", "");
        free(base64);
        return NULL;
    }
    sprintf(result, "data:image/png;base64,%s", base64);
    free(base64);

    return result;
}

char* process_tile(const char* filename, int tile_x, int tile_y) {
    DEBUG_PRINT("Processing TILE: file=%s, x=%d, y=%d\n", filename, tile_x, tile_y);
    char full_path[512];
    snprintf(full_path, sizeof(full_path), "%s%s", SOURCE, filename);
    
    int width, height, channels;
    unsigned char* img = stbi_load(full_path, &width, &height, &channels, 0);
    if (!img) {
        DEBUG_PRINT("Failed to load image: %s\n", full_path);
        return NULL;
    }
    
    int tile_size = 16;
    unsigned char* tile = malloc(tile_size * tile_size * 4); // Always use 4 channels (RGBA) for output
    if (!tile) {
        DEBUG_PRINT("Failed to allocate memory for tile\n", "");
        stbi_image_free(img);
        return NULL;
    }

    // Extract the tile
    for (int y = 0; y < tile_size; y++) {
        for (int x = 0; x < tile_size; x++) {
            int src_idx = ((tile_y * tile_size + y) * width + (tile_x * tile_size + x)) * channels;
            int dst_idx = (y * tile_size + x) * 4;
            
            // Copy RGB channels
            for (int c = 0; c < 3; c++) {
                tile[dst_idx + c] = img[src_idx + c];
            }
            
            // Set alpha channel
            tile[dst_idx + 3] = (channels == 4) ? img[src_idx + 3] : 255;
        }
    }
    
    stbi_image_free(img);

    // Encode tile to PNG
    int png_size;
    unsigned char* png_data = stbi_write_png_to_mem(tile, 0, tile_size, tile_size, 4, &png_size);
    free(tile);

    if (!png_data) {
        DEBUG_PRINT("Failed to encode tile to PNG\n", "");
        return NULL;
    }

    // Encode PNG to base64
    size_t base64_size;
    char* base64 = base64_encode(png_data, png_size, &base64_size);
    free(png_data);

    if (!base64) {
        DEBUG_PRINT("Failed to encode PNG to base64\n", "");
        return NULL;
    }

    DEBUG_PRINT("Tile processed successfully. Base64 length: %zu\n", base64_size);

    // Prepend the data URL scheme
    char* result = malloc(base64_size + 30);
    if (!result) {
        DEBUG_PRINT("Failed to allocate memory for result\n", "");
        free(base64);
        return NULL;
    }
    sprintf(result, "data:image/png;base64,%s", base64);
    free(base64);

    return result;
}

char* process_tileset(const char* filename) {
    DEBUG_PRINT("Processing TILESET for file: %s\n", filename);
    char full_path[512];
    snprintf(full_path, sizeof(full_path), "%s%s", SOURCE, filename);
    
    int width, height, channels;
    unsigned char* img = stbi_load(full_path, &width, &height, &channels, 0);
    if (!img) {
        DEBUG_PRINT("Failed to load image: %s\n", full_path);
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

int get_image_width(const char* filename) {
    DEBUG_PRINT("Processing WIDTH for file: %s\n", filename);
    char full_path[512];
    snprintf(full_path, sizeof(full_path), "%s%s", SOURCE, filename);
    
    int width, height, channels;
    unsigned char* img = stbi_load(full_path, &width, &height, &channels, 0);
    if (!img) {
        DEBUG_PRINT("Failed to load image: %s\n", full_path);
        return 0;
    }
    stbi_image_free(img);
    return width;
}

char* process_frame(const char* filename, int tile_x, int tile_y) {
    DEBUG_PRINT("Processing FRAME: file=%s, x=%d, y=%d\n", filename, tile_x, tile_y);
    char full_path[512];
    snprintf(full_path, sizeof(full_path), "%s%s", SOURCE, filename);
    
    int width, height, channels;
    unsigned char* img = stbi_load(full_path, &width, &height, &channels, 0);
    if (!img) {
        DEBUG_PRINT("Failed to load image: %s\n", full_path);
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
    char* result = malloc(base64_size + 30);
    sprintf(result, "data:image/png;base64,%s", base64);
    free(base64);
    return result;
}

char* preprocess_content(const char* content, const char* current_file) {
    DEBUG_PRINT("Entering preprocess_content for file: %s\n", current_file);
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
                char params[MAX_MACRO_SIZE];
                size_t param_len = end - start;
                strncpy(params, start, param_len);
                params[param_len] = '\0';
                
                char* token = strtok(params, ",");
                char* filename = token;
                token = strtok(NULL, ",");
                
                if (token == NULL) {
                    // Simple include
                    DEBUG_PRINT("Processing simple INCLUDE for file: '%s'\n", filename);
                    char* included = process_include(filename);
                    if (included) {
                        // Check if the file is a CSV
                        char* ext = strrchr(filename, '.');
                        if (ext && strcmp(ext, ".csv") == 0) {
                            // Process CSV content
                            char* csv_content = included;
                            while (*csv_content) {
                                if (*csv_content == '\n') {
                                    // Add a comma before the newline
                                    *output++ = ',';
                                }
                                *output++ = *csv_content++;
                            }
                            // Remove the last comma if it's at the end
                            if (*(output - 1) == ',') {
                                output--;
                            }
                        } else {
                            // Non-CSV file, process as before
                            output += sprintf(output, "%s", included);
                        }
                        free(included);
                    }
                } else if (strcmp(token, "BASE64") == 0) {
                    DEBUG_PRINT("Processing INCLUDE with BASE64 for file: '%s'\n", filename);
                    char* base64_content = process_base64(filename);
                    if (base64_content) {
                        output += sprintf(output, "%s", base64_content);
                        free(base64_content);
                    }
                } else if (strcmp(token, "TILE") == 0) {
                    int x, y;
                    sscanf(strtok(NULL, ","), "%d", &x);
                    sscanf(strtok(NULL, ","), "%d", &y);
                    DEBUG_PRINT("Processing INCLUDE with TILE for file: '%s', x=%d, y=%d\n", filename, x, y);
                    char* tile_content = process_tile(filename, x, y);
                    if (tile_content) {
                        output += sprintf(output, "%s", tile_content);
                        DEBUG_PRINT("TILE content (first 64 chars): %.64s\n", tile_content);
                        free(tile_content);
                    }
                } else if (strcmp(token, "TILES") == 0) {
                    int x, y, w, h;
                    sscanf(strtok(NULL, ","), "%d", &x);
                    sscanf(strtok(NULL, ","), "%d", &y);
                    sscanf(strtok(NULL, ","), "%d", &w);
                    sscanf(strtok(NULL, ","), "%d", &h);
                    DEBUG_PRINT("Processing INCLUDE with TILES for file: '%s', x=%d, y=%d, w=%d, h=%d\n", filename, x, y, w, h);
                    char* tiles_content = process_tiles(filename, x, y, w, h);
                    if (tiles_content) {
                        output += sprintf(output, "%s", tiles_content);
                        DEBUG_PRINT("TILES content (first 64 chars): %.64s\n", tiles_content);
                        free(tiles_content);
                    }
                } else if (strcmp(token, "TILESET") == 0) {
                    DEBUG_PRINT("Processing INCLUDE with TILESET for file: '%s'\n", filename);
                    char* tileset_content = process_tileset(filename);
                    if (tileset_content) {
                        output += sprintf(output, "%s", tileset_content);
                        free(tileset_content);
                    }
                } else if (strcmp(token, "WIDTH") == 0) {
                    DEBUG_PRINT("Processing INCLUDE with WIDTH for file: '%s'\n", filename);
                    int width = get_image_width(filename);
                    output += sprintf(output, "%d", width);
                } else if (strcmp(token, "FRAME") == 0) {
                    int x, y;
                    sscanf(strtok(NULL, ","), "%d", &x);
                    sscanf(strtok(NULL, ","), "%d", &y);
                    DEBUG_PRINT("Processing INCLUDE with FRAME for file: '%s', x=%d, y=%d\n", filename, x, y);
                    char* frame_content = process_frame(filename, x, y);
                    if (frame_content) {
                        output += sprintf(output, "%s", frame_content);
                        free(frame_content);
                    }
                }
                
                input = end + 1;
            } else {
                DEBUG_PRINT("Malformed INCLUDE macro: %s\n", input);
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
    DEBUG_PRINT("Preprocessing completed for file: %s. Result length: %zu\n", current_file, strlen(result));
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
    char* processed = preprocess_content(content, filename);
    free(content);
    return processed;
}

void compile() {
    DEBUG_PRINT("Starting compilation\n", "");
    
    char* html = read_file(SOURCE "septic.html");
    if (!html) {
        DEBUG_PRINT("Error reading septic.html\n", "");
        return;
    }

    DEBUG_PRINT("septic.html read successfully\n", "");

    char* processed_html = preprocess_content(html, "septic.html");
    
    if (!processed_html) {
        DEBUG_PRINT("Error preprocessing content\n", "");
        free(html);
        return;
    }

    if (write_file(TARGET, processed_html) != 0) {
        DEBUG_PRINT("Error writing to %s\n", TARGET);
    } else {
        DEBUG_PRINT("Compilation complete. Output written to %s\n", TARGET);
    }

    free(html);
    free(processed_html);
}

void free_inclusion_tree(struct inclusion_info* info) {
    if (info == NULL) {
        return;
    }
    for (int i = 0; i < info->num_children; i++) {
        free_inclusion_tree(&info->children[i]);
    }
    free(info->children);
}

int main() {
    time_t last_compile = 0;
    int first_run = 1;

    // Initialize included_files array
    for (int i = 0; i < MAX_INCLUDED_FILES; i++) {
        included_files[i].filename[0] = '\0';
        included_files[i].last_modified = 0;
    }

    while (1) {
        int need_compile = first_run;  // Always compile on first run
        
        // Reset processed files
        free_processed_files();
        
        // Start with septic.html and process includes recursively
        struct inclusion_info* root = process_includes_recursively("septic.html", NULL);
        
        for (int i = 0; i < num_included_files; i++) {
            char full_path[512];
            snprintf(full_path, sizeof(full_path), "%s%s", SOURCE, included_files[i].filename);
            
            time_t current_mod_time = get_last_modified(full_path);
            
            if (current_mod_time != included_files[i].last_modified) {
                need_compile = 1;
                included_files[i].last_modified = current_mod_time;
            }
        }

        if (need_compile) {
            // Clear the terminal
            printf("\033[2J\033[H");
            
            // Print the inclusion tree
            print_inclusion_tree(root, 0, 1, "");
            printf("\n");

            compile();
            last_compile = time(NULL);
            first_run = 0;  // Set first_run to 0 after initial compilation
        }

        // Free the inclusion tree
        free_inclusion_tree(root);
        free(root);

        // Sleep for a longer duration to reduce CPU usage
        sleep(1); // Sleep for 1 second
    }

    // Clean up
    free_processed_files();

    return 0;
}