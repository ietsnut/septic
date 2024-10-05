// Include necessary headers
#include "rogueutil.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <unistd.h>     // For sleep(), usleep()
#include <time.h>       // For time(), localtime(), strftime()
#include <signal.h>     // For signal handling

// Include stb_image.h directly
#define STB_IMAGE_IMPLEMENTATION
#include "stb_image.h"

// Function declarations
char *read_file(const char *filename);
void process_files();
time_t get_file_mod_time(const char *filename);
void center_box(const char *message);

// Global variables
volatile sig_atomic_t resize_flag = 1;  // Flag for terminal resize
char last_message[256] = "PIPES DRAINED"; // Store the last message

// Signal handler for terminal resize
void handle_sigwinch(int sig) {
    resize_flag = 1;
}

int main(void) {

    title("sewer");

    hidecursor();             // Hide cursor
    saveDefaultColor();       // Save default color settings

    cls();  // Clear the screen

    // Initial processing
    process_files();
    // Set up signal handler for terminal resize
    signal(SIGWINCH, handle_sigwinch);

    // Display the initial message
    center_box(last_message);

    // Get initial modification times
    time_t septic_html_mtime = get_file_mod_time("./septic.html");
    time_t septic_png_mtime  = get_file_mod_time("./septic.png");
    time_t septic_js_mtime   = get_file_mod_time("./septic.js");

    int quit = 0;
    while (!quit) {

        // Check for key presses
        if (kbhit()) {
            int key = getkey();

            switch (key) {
                case 'q':  // Exit the loop when 'q' is pressed
                case KEY_ESCAPE:
                    quit = 1;
                    break;
                case 'r':
                case ' ':
                    process_files();
                    time_t now = time(NULL);
                    struct tm *tm_info = localtime(&now);
                    char time_str[64];
                    strftime(time_str, sizeof(time_str), "%H:%M:%S", tm_info);

                    // Update and display the message with the timestamp
                    snprintf(last_message, sizeof(last_message), "PIPES DRAINED @ %s", time_str);
                    center_box(last_message);
                    fflush(stdout);
                    break;
                default:
                    break;
            }
        }

        // Check for file changes every 0.5 seconds
        static unsigned long last_check = 0;
        unsigned long current_time = time(NULL);
        if (current_time - last_check >= 0.5) {
            last_check = current_time;

            // Get current modification times
            time_t new_septic_html_mtime = get_file_mod_time("./septic.html");
            time_t new_septic_png_mtime  = get_file_mod_time("./septic.png");
            time_t new_septic_js_mtime   = get_file_mod_time("./septic.js");

            // Check if any file has changed
            if (new_septic_html_mtime != septic_html_mtime ||
                new_septic_png_mtime  != septic_png_mtime  ||
                new_septic_js_mtime   != septic_js_mtime) {

                // Reprocess the files
                process_files();

                // Build the status message
                char status_message[256];
                char mod_time_str[64];
                struct tm *tm_info;
                int first = 1;
                time_t latest_mod_time = 0;
                char changed_files[128] = "";

                if (new_septic_html_mtime != septic_html_mtime) {
                    if (!first) strcat(changed_files, ", ");
                    strcat(changed_files, "septic.html");
                    if (new_septic_html_mtime > latest_mod_time)
                        latest_mod_time = new_septic_html_mtime;
                    first = 0;
                }

                if (new_septic_png_mtime != septic_png_mtime) {
                    if (!first) strcat(changed_files, ", ");
                    strcat(changed_files, "septic.png");
                    if (new_septic_png_mtime > latest_mod_time)
                        latest_mod_time = new_septic_png_mtime;
                    first = 0;
                }

                if (new_septic_js_mtime != septic_js_mtime) {
                    if (!first) strcat(changed_files, ", ");
                    strcat(changed_files, "septic.js");
                    if (new_septic_js_mtime > latest_mod_time)
                        latest_mod_time = new_septic_js_mtime;
                    first = 0;
                }

                // Format the latest modification time
                tm_info = localtime(&latest_mod_time);
                strftime(mod_time_str, sizeof(mod_time_str), "%H:%M:%S", tm_info);

                snprintf(status_message, sizeof(status_message), "PIPES DRAINED %s @ %s", changed_files, mod_time_str);

                // Update modification times
                septic_html_mtime = new_septic_html_mtime;
                septic_png_mtime  = new_septic_png_mtime;
                septic_js_mtime   = new_septic_js_mtime;

                // Update and display the message
                strncpy(last_message, status_message, sizeof(last_message) - 1);
                last_message[sizeof(last_message) - 1] = '\0';
                center_box(last_message);
                fflush(stdout);
            }
        }

        // Handle terminal resize
        if (resize_flag) {
            center_box(last_message);
            resize_flag = 0;
        }

        // Sleep for a short time to reduce CPU usage
        usleep(100);
    }

    cls();           // Clear the screen when exiting
    resetColor();    // Reset color settings
    showcursor();    // Show the cursor again
    fflush(stdout);  // Ensure everything is printed

    return 0;
}

void center_box(const char *message) {
    cls();
    fflush(stdout);
    int term_width = tcols();
    int term_height = trows();

    int msg_len = strlen(message);

    // Ensure the box is not larger than the terminal
    int max_box_width = term_width - 4;  // Leave at least a 2-character margin on each side
    int box_width = msg_len + 8;         // Adding padding
    if (box_width > max_box_width) {
        box_width = max_box_width;
    }

    int box_height = 5; // Top border, empty line, message line, empty line, bottom border

    // Calculate top-left corner of the box
    int x = (term_width - box_width) / 2 + 1; // +1 because locate() starts from 1
    int y = (term_height - box_height) / 2 + 1;

    // Draw the box
    drawBox(x, y, box_width, box_height);

    // Print the message centered within the box
    int msg_x = x + (box_width - msg_len) / 2;
    int msg_y = y + box_height / 2;

    // Ensure message does not exceed box width
    char truncated_message[256];
    if (msg_len > box_width - 4) { // 4 accounts for box borders and padding
        strncpy(truncated_message, message, box_width - 4);
        truncated_message[box_width - 4] = '\0';
    } else {
        strcpy(truncated_message, message);
    }

    printXY(msg_x, msg_y, truncated_message);
    fflush(stdout);
}

void process_files() {
    // Step 1: Read and process septic.png using stb_image
    int width, height, channels;
    unsigned char *img = stbi_load("./septic.png", &width, &height, &channels, 1); // Load as grayscale

    if (!img) {
        fprintf(stderr, "Failed to load septic.png\n");
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
    char *septic_html = read_file("./septic.html");

    // Step 4: Read septic.js
    char *septic_js = read_file("./septic.js");

    // Remove septic.js script tag from septic_html
    char *septic_script_tag = "<script type=\"text/javascript\" src=\"septic.js\"></script>";
    char *septic_pos = strstr(septic_html, septic_script_tag);
    if (!septic_pos) {
        fprintf(stderr, "Could not find septic.js script tag in septic.html\n");
        free(preprocessed_js);
        free(septic_js);
        free(septic_html);
        return;
    }
    size_t septic_len = strlen(septic_script_tag);

    // Prepare the combined script
    size_t combined_script_len = strlen(preprocessed_js) + strlen(septic_js) + 100;
    char *combined_script = malloc(combined_script_len);
    sprintf(combined_script, "<script type=\"text/javascript\">\n%s\n%s\n</script>", preprocessed_js, septic_js);

    // Build the new index.html content
    size_t new_html_len = strlen(septic_html) - septic_len + strlen(combined_script) + 1;
    char *new_index_html = malloc(new_html_len);
    size_t prefix_len = septic_pos - septic_html;
    strncpy(new_index_html, septic_html, prefix_len);
    new_index_html[prefix_len] = '\0';

    strcat(new_index_html, combined_script);
    strcat(new_index_html, septic_pos + septic_len);

    // Write to index.html
    FILE *output = fopen("./index.html", "w");
    if (!output) {
        fprintf(stderr, "Could not open index.html for writing\n");
        free(preprocessed_js);
        free(septic_js);
        free(septic_html);
        free(combined_script);
        free(new_index_html);
        return;
    }
    fwrite(new_index_html, 1, strlen(new_index_html), output);
    fclose(output);

    free(preprocessed_js);
    free(septic_js);
    free(septic_html);
    free(combined_script);
    free(new_index_html);
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
time_t get_file_mod_time(const char *filename) {
    struct stat attr;
    if (stat(filename, &attr) == 0) {
        return attr.st_mtime;
    } else {
        return 0;
    }
}
