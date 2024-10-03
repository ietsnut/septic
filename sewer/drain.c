#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>   // For file modification times
#include <unistd.h>     // For sleep()

// Include stb_image.h directly
#define STB_IMAGE_IMPLEMENTATION
#include "stb_image.h"

char *read_file(const char *filename);
void write_septic_html(char *index_html, char *preprocessed_js, char *septic_js);
time_t get_file_mod_time(const char *filename);
void process_files();

int main() {
    // Initial processing
    process_files();

    // Get initial modification times
    time_t septic_html_mtime = get_file_mod_time("../septic.html");
    time_t septic_png_mtime  = get_file_mod_time("../septic.png");
    time_t septic_js_mtime   = get_file_mod_time("../septic.js");

    // Enter the watch loop
    while (1) {
        sleep(1); // Sleep for 1 second between checks

        // Get current modification times
        time_t new_septic_html_mtime = get_file_mod_time("../septic.html");
        time_t new_septic_png_mtime  = get_file_mod_time("../septic.png");
        time_t new_septic_js_mtime   = get_file_mod_time("../septic.js");

        // Check if any file has changed
        if (new_septic_html_mtime != septic_html_mtime ||
            new_septic_png_mtime  != septic_png_mtime  ||
            new_septic_js_mtime   != septic_js_mtime) {

            printf("Change detected. Reprocessing files...\n");

            // Update modification times
            septic_html_mtime = new_septic_html_mtime;
            septic_png_mtime  = new_septic_png_mtime;
            septic_js_mtime   = new_septic_js_mtime;

            // Reprocess the files
            process_files();
        }
    }

    return 0;
}

void process_files() {
    // Step 1: Read and process septic.png using stb_image
    int width, height, channels;
    unsigned char *img = stbi_load("../septic.png", &width, &height, &channels, 1); // Load as grayscale

    if (!img) {
        fprintf(stderr, "Failed to load image\n");
        return;
    }

    // Process image data into tileset array
    int img_size = width * height;
    unsigned char *tileset = (unsigned char*) malloc(img_size);

    for (int i = 0; i < img_size; i++) {
        tileset[i] = (img[i] >= 128) ? 1 : 0;
    }

    // Pack tileset into tb array
    int tb_size = (img_size + 7) / 8;
    unsigned char *tb = (unsigned char*) malloc(tb_size);
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

    // Step 2: Prepare JavaScript code with preprocessed data
    // Generate JavaScript code that defines tm and tb
    char *preprocessed_js;
    {
        size_t js_size = tb_size * 5 + 1024;
        preprocessed_js = malloc(js_size);
        if (!preprocessed_js) {
            fprintf(stderr, "Memory allocation failed\n");
            exit(1);
        }
        sprintf(preprocessed_js, "const tm = %d;\nconst tb = new Uint8Array([", width);
        for (int i = 0; i < tb_size; i++) {
            char num_buffer[16];
            sprintf(num_buffer, "%d", tb[i]);
            strcat(preprocessed_js, num_buffer);
            if (i < tb_size -1) {
                strcat(preprocessed_js, ",");
            }
        }
        strcat(preprocessed_js, "]);\n");
    }
    free(tb);

    // Step 3: Read and modify septic.html
    char *index_html = read_file("../septic.html");

    // Step 4: Read septic.js and adjust it
    char *septic_js = read_file("../septic.js");

    // Step 5: Write the combined septic.html
    write_septic_html(index_html, preprocessed_js, septic_js);

    free(preprocessed_js);
    free(septic_js);
    free(index_html);
}

char *read_file(const char *filename) {
    FILE *file = fopen(filename, "rb");
    if (!file) {
        fprintf(stderr, "Could not open %s\n", filename);
        exit(1);
    }
    fseek(file, 0, SEEK_END);
    long fsize = ftell(file);
    rewind(file);

    char *string = (char*) malloc(fsize + 1);
    fread(string, 1, fsize, file);
    fclose(file);

    string[fsize] = '\0';
    return string;
}

void write_septic_html(char *index_html, char *preprocessed_js, char *septic_js) {
    // Remove septic.js script tag
    char *septic_script_tag = "<script type=\"text/javascript\" src=\"septic.js\"></script>";
    char *septic_pos = strstr(index_html, septic_script_tag);
    if (!septic_pos) {
        fprintf(stderr, "Could not find septic.js script tag in septic.html\n");
        exit(1);
    }
    size_t septic_len = strlen(septic_script_tag);

    // Prepare the combined script
    size_t combined_script_len = strlen(preprocessed_js) + strlen(septic_js) + 100;
    char *combined_script = malloc(combined_script_len);
    sprintf(combined_script, "<script type=\"text/javascript\">\n%s\n%s\n</script>", preprocessed_js, septic_js);

    // Build the new index.html content
    size_t new_html_len = strlen(index_html) - septic_len + strlen(combined_script) + 1;
    char *new_index_html = malloc(new_html_len);
    size_t prefix_len = septic_pos - index_html;
    strncpy(new_index_html, index_html, prefix_len);
    new_index_html[prefix_len] = '\0';

    strcat(new_index_html, combined_script);
    strcat(new_index_html, septic_pos + septic_len);

    // Write to septic.html
    FILE *output = fopen("../index.html", "w");
    if (!output) {
        fprintf(stderr, "Could not open index.html for writing\n");
        exit(1);
    }
    fwrite(new_index_html, 1, strlen(new_index_html), output);
    fclose(output);

    free(combined_script);
    free(new_index_html);

    printf("septic.html has been updated.\n");
}

time_t get_file_mod_time(const char *filename) {
    struct stat attr;
    if (stat(filename, &attr) == 0) {
        return attr.st_mtime;
    } else {
        fprintf(stderr, "Could not get modification time for %s\n", filename);
        return 0;
    }
}
