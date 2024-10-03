/**
 * rogueutil.h by Sergei Akhmatdinov refactored by ietsnut for cosmopolitan
 */

#pragma once

#ifndef RUTIL_H
#define RUTIL_H

#include <stdio.h> /* for getch() / printf() */
#include <string.h> /* for strlen() */
#include <stdarg.h> /* for colorPrint() */

void locate(int x, int y);

#include <termios.h> /* for getch() and kbhit() */
#include <unistd.h> /* for getch(), kbhit() and getuid() */
#include <time.h>   /* for nanosleep() */
#include <sys/ioctl.h> /* for getkey() */
#include <sys/types.h> /* for kbhit() */
#include <sys/time.h> /* for kbhit() */
#include <pwd.h> /* for getpwuid() */

static struct termios oldt;

/**
 * @brief Get a charater without waiting on a Return
 * @details Windows has this functionality in conio.h
 * @return The character
 */
int getch(void) {
	struct termios newt;
	int ch;
	tcgetattr(STDIN_FILENO, &oldt);
	newt = oldt;
	newt.c_lflag &= ~(ICANON | ECHO);
	tcsetattr(STDIN_FILENO, TCSANOW, &newt);
	ch = getchar();
	tcsetattr(STDIN_FILENO, TCSANOW, &oldt);
	return ch;
}

/**
 * @brief Determines if a button was pressed.
 * @details Windows has this in conio.h
 * @return Number of characters read
 */
int kbhit(void) {
	struct termios newt;
	int cnt = 0;
	tcgetattr(STDIN_FILENO, &oldt);
	newt = oldt;
	newt.c_lflag    &= ~(ICANON | ECHO);
	newt.c_iflag     = 0; /* input mode */
	newt.c_oflag     = 0; /* output mode */
	newt.c_cc[VMIN]  = 1; /* minimum time to wait */
	newt.c_cc[VTIME] = 1; /* minimum characters to wait for */
	tcsetattr(STDIN_FILENO, TCSANOW, &newt);
	ioctl(0, FIONREAD, &cnt); /* Read count */
	struct timeval tv;
	tv.tv_sec  = 0;
	tv.tv_usec = 100;
	select(STDIN_FILENO+1, NULL, NULL, NULL, &tv); /* A small time delay */
	tcsetattr(STDIN_FILENO, TCSANOW, &oldt);
	return cnt; /* Return number of characters */
}

void gotoxy(int x, int y) {
    locate(x,y);
}

/**
 * @brief Provides easy color codes with similar numbers to QBasic
 */
typedef enum color_code {
	BLACK,
	GREY,
	DARKGREY,
	WHITE
} color_code;

/* Constant strings for ANSI colors ans seqiences */
static const const char* ANSI_CLS                = "\033[2J\033[3J";
static const const char* ANSI_CONSOLE_TITLE_PRE  = "\033]0;";
static const const char* ANSI_CONSOLE_TITLE_POST = "\007";
static const const char* ANSI_ATTRIBUTE_RESET    = "\033[0m";
static const const char* ANSI_CURSOR_HIDE        = "\033[?25l";
static const const char* ANSI_CURSOR_SHOW        = "\033[?25h";
static const const char* ANSI_CURSOR_HOME        = "\033[H";
static const const char* ANSI_BLACK              = "\033[22;30m";
static const const char* ANSI_GREY               = "\033[22;37m";
static const const char* ANSI_DARKGREY           = "\033[01;30m";
static const const char* ANSI_WHITE              = "\033[01;37m";
static const const char* ANSI_BACKGROUND_BLACK   = "\033[40m";
static const const char* ANSI_BACKGROUND_WHITE   = "\033[47m";
/* Remaining colors not supported as background colors */

/**
 * @brief Provides keycodes for special keys
 */
typedef enum key_code {

	KEY_ESCAPE  = 0,
	KEY_ENTER   = 1,
	KEY_SPACE   = 32,

	KEY_INSERT  = 2,
	KEY_HOME    = 3,
	KEY_PGUP    = 4,
	KEY_DELETE  = 5,
	KEY_END     = 6,
	KEY_PGDOWN  = 7,

	KEY_UP      = 14,
	KEY_DOWN    = 15,
	KEY_LEFT    = 16,
	KEY_RIGHT   = 17,

	KEY_F1      = 18,
	KEY_F2      = 19,
	KEY_F3      = 20,
	KEY_F4      = 21,
	KEY_F5      = 22,
	KEY_F6      = 23,
	KEY_F7      = 24,
	KEY_F8      = 25,
	KEY_F9      = 26,
	KEY_F10     = 27,
	KEY_F11     = 28,
	KEY_F12     = 29,

	KEY_NUMDEL  = 30,
	KEY_NUMPAD0 = 31,
	KEY_NUMPAD1 = 127,
	KEY_NUMPAD2 = 128,
	KEY_NUMPAD3 = 129,
	KEY_NUMPAD4 = 130,
	KEY_NUMPAD5 = 131,
	KEY_NUMPAD6 = 132,
	KEY_NUMPAD7 = 133,
	KEY_NUMPAD8 = 134,
	KEY_NUMPAD9 = 135,

} key_code;


/**
 * @brief Reads a key press (blocking)
 * @details At the moment, only Arrows, ESC, Enter and Space are working
 * @return Key code that was read
 */
int getkey(void) {
	int cnt = kbhit(); /* for ANSI escapes processing */
	int k = getch();
	switch(k) {
	case 0: {
		int kk;
		switch (kk = getch()) {
		case 71:
			return KEY_NUMPAD7;
		case 72:
			return KEY_NUMPAD8;
		case 73:
			return KEY_NUMPAD9;
		case 75:
			return KEY_NUMPAD4;
		case 77:
			return KEY_NUMPAD6;
		case 79:
			return KEY_NUMPAD1;
		case 80:
			return KEY_NUMPAD2;
		case 81:
			return KEY_NUMPAD3;
		case 82:
			return KEY_NUMPAD0;
		case 83:
			return KEY_NUMDEL;
		default:
			return kk-59+KEY_F1; /* Function keys */
		}
	}
	case 224: {
		int kk;
		switch (kk = getch()) {
		case 71:
			return KEY_HOME;
		case 72:
			return KEY_UP;
		case 73:
			return KEY_PGUP;
		case 75:
			return KEY_LEFT;
		case 77:
			return KEY_RIGHT;
		case 79:
			return KEY_END;
		case 80:
			return KEY_DOWN;
		case 81:
			return KEY_PGDOWN;
		case 82:
			return KEY_INSERT;
		case 83:
			return KEY_DELETE;
		default:
			return kk-123+KEY_F1; /* Function keys */
		}
	}
	case 13:
		return KEY_ENTER;
	case 155: /* single-character CSI */
	case 27: {
		/* Process ANSI escape sequences */
		if (cnt >= 3 && getch() == '[') {
			switch (k = getch()) {
			case 'A':
				return KEY_UP;
			case 'B':
				return KEY_DOWN;
			case 'C':
				return KEY_RIGHT;
			case 'D':
				return KEY_LEFT;
			default:
				return KEY_ESCAPE;
			}
		} else return KEY_ESCAPE;
	}
	default:
		return k;
	}
}

/**
 * @brief Non-blocking version of getch()
 * @return The character pressed or 0 if no key was pressed.
 * @see getch()
 */
int nb_getch(void) {
	if (kbhit()) return getch();
	else return 0;
}

/**
 * @brief Returns ANSI color escape sequence for specified number
 * @param c Number 0-15 corresponding to the color code
 * @see color_code
 */
const char* getANSIColor(const int c) {
	switch (c) {
	case BLACK       :
		return ANSI_BLACK;
	case GREY        :
		return ANSI_GREY;
	case DARKGREY    :
		return ANSI_DARKGREY;
	case WHITE       :
		return ANSI_WHITE;
	default:
		return "";
	}
}

/**
 * @brief Returns the ANSI background color escape sequence
 * @param c Number 0-15 corresponding to the color code
 * @see color_code
 */
const char* getANSIBgColor(const int c) {
	switch (c) {
	case BLACK  :
		return ANSI_BACKGROUND_BLACK;
	case GREY   :
		return ANSI_BACKGROUND_WHITE;
	default:
		return "";
	}
}

/**
 * @brief Changes color as specified by a number
 * @param c Number 0-15 corresponding to a color code
 * @see color_code
 */
void setColor(int c) {
	printf("%s", getANSIColor(c));
}

/**
 * @brief Changes the background color as specified by a number
 * @param c Number 0-15 corresponding to a color code
 * @see color_code
 */
void setBackgroundColor(int c) {
	printf("%s", getANSIBgColor(c));
}

/**
 * @brief Saves the color to use in resetColor() on Windows
 * @detail Returns -1 if not on Windows or if RUTIL_USE_ANSI is defined
 */
int saveDefaultColor(void) {
	return -1;
}

/**
 * @brief Resets the color to one set by saveDefaultColor()
 * @see color_code
 * @see setColor()
 * @see saveDefaultColor()
 */
void resetColor(void){
	printf("%s", ANSI_ATTRIBUTE_RESET);
}

/**
 * @brief Clears screen, resets all attributes and moves cursor home.
 */
void cls(void) {
	printf("%s", ANSI_CLS);
	printf("%s", ANSI_CURSOR_HOME);
}

/**
 * @brief Sets the cursor position to one defined by x and y.
 */
void locate(int x, int y) {
	char buf[32];
	sprintf(buf, "\033[%d;%df", y, x);
	printf("%s", buf);
}

/**
 * @brief Prints the supplied string without advancing the cursor
 */

void setString(const char* str) {
	unsigned int len = (unsigned int)strlen(str);
	printf("%s", str);
	char buf[3 + 20 + 1]; /* 20 = max length of 64-bit
                                 * unsigned int when printed as dec */
	sprintf(buf, "\033[%uD", len);
	printf("%s", buf);
}

/**
 * @brief Sets the character at the cursor without advancing the cursor
 */
void setChar(char ch) {
	const char buf[] = {ch, 0};
	setString(buf);
}

/**
 * @brief Shows/hides the cursor.
 * @param visible 0 to hide the cursor, anything else to show the cursor
 */
void setCursorVisibility(char visible) {
	printf("%s", (visible ? ANSI_CURSOR_SHOW : ANSI_CURSOR_HIDE));
}

/**
 * @brief Hides the cursor
 * @see setCursorVisibility()
 */
void hidecursor(void) {
	setCursorVisibility(0);
}

/**
 * @brief Shows the cursor
 * @see setCursorVisibility()
 */
void showcursor(void) {
	setCursorVisibility(1);
}

/**
 * @brief Pauses the program for a given number of milliseconds
 */
void msleep(unsigned int ms) {
	struct timespec ts;
	ts.tv_sec = ms / 1000;
	ts.tv_nsec = (ms % 1000) * 1000000L;
	if(nanosleep(&ts, NULL) < 0) {
		perror("sleep failed");
	}
}

/**
 * @brief Returns the number of rows in the terminal window or -1 on error.
 */
int trows(void) {
	struct winsize ts;
	ioctl(STDIN_FILENO, TIOCGWINSZ, &ts);
	return ts.ws_row;
}

/**
 * @brief Returns the number of columns in the terminal or -1 on error.
 */
int tcols(void) {
	struct winsize ts;
	ioctl(STDIN_FILENO, TIOCGWINSZ, &ts);
	return ts.ws_col;
}

/**
 * @brief Waits until a key is pressed.
 * @param msg The message to display or NULL. Optional in C++.
 */

void anykey(const char* msg) {
	if (msg) printf("%s", msg);
	getch();
}

/**
 * @brief Sets the console title given a string.
 */
void title(const char* title) {
	const char * true_title = title;

	printf("%s", ANSI_CONSOLE_TITLE_PRE);
	printf("%s", true_title);
	printf("%s", ANSI_CONSOLE_TITLE_POST);
}

/**
 * @brief Prints a message in a given color.
 * @param fmt printf-style formatted string to print in C or a list of objects in C++
 * @param color Foreground color to be used, use -1 to use the currently set foreground color
 * @param bgcolor Background color to be used, use -1 to use the currently set background color
 * @see color_code
 */

void colorPrint(color_code color, color_code bgcolor, const char *fmt, ...) {
	va_list args;
	va_start(args, fmt);
	if (color >= 0)
        	setColor(color);

	if (bgcolor >= 0)
		setBackgroundColor(bgcolor);
        vprintf(fmt, args);
	va_end(args);
	resetColor();
}


/**
 * @brief Returns the username of the user running the program.
 */
char* getUsername(void) {
	struct passwd *pw = getpwuid(getuid());
	if (pw) {
		return pw->pw_name;
	} else {
		return NULL;
	}
}

/**
 * @brief Print a message at a position given by x and y.
 * @see locate()
 */
void printXY(int x, int y, const char* msg) {
        locate(x, y);
        printf("%s", msg);
}

void drawBox(int x, int y, int width, int height) {

    if (width < 2 || height < 2) {
        printf("Width and height must be at least 2.\n");
        return;
    }

    // Set cursor to top left corner of the box
    locate(x, y);

    // Draw top border
    printf("╭");               // Top left corner
    for (int i = 0; i < width - 2; i++) {
        printf("─");           // Top horizontal line
    }
    printf("╮\n");              // Top right corner

    // Draw side borders
    for (int i = 0; i < height - 2; i++) {
        locate(x, y + 1 + i);  // Move cursor to the next row
        printf("╡");           // Left vertical line
        for (int j = 0; j < width - 2; j++) {
            printf(" ");       // Space inside the box
        }
        printf("╞\n");         // Right vertical line
    }

    // Draw bottom border
    locate(x, y + height - 1);
    printf("╰");               // Bottom left corner
    for (int i = 0; i < width - 2; i++) {
        printf("─");           // Bottom horizontal line
    }
    printf("╯\n");              // Bottom right corner
}

#endif /* RUTIL_H */
