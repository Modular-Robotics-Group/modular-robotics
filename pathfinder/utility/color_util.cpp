#include "color_util.h"

namespace Colors {
    ColorsRGB::ColorsRGB(const int r, const int g, const int b) : red(r), green(g), blue(b) {}

    ColorsRGB::ColorsRGB(const int rgbInt) {
        red = (rgbInt & 0xFF0000) >> 16;
        green = (rgbInt & 0x00FF00) >> 8;
        blue = rgbInt & 0x0000FF;
    }

    std::map<std::string, ColorsRGB> colorToRGB = {
            {"red", {255, 0, 0}},
            {"green", {0, 255, 0}},
            {"blue", {0, 0, 255}},
            {"cyan", {0, 255, 255}},
            {"pink", {255, 192, 203}},
            {"orange", {255, 165, 0}},
            {"purple", {128, 0, 128}},
            {"yellow", {255, 255, 0}},
            {"brown", {165, 42, 42}},
            {"black", {0, 0, 0}},
            {"white", {255, 255, 255}},
            {"gray", {128, 128, 128}},
            {"lightgray", {211, 211, 211}},
            {"darkgray", {169, 169, 169}},
            {"magenta", {255, 0, 255}}
    };

    ColorsRGB ConvertColorNameToRGB(const std::string& colorName) {
        if (const auto it = colorToRGB.find(colorName); it != colorToRGB.end()) {
            return it->second;
        }
        return ColorsRGB(0);
    }

    int GetColorFromHex(const std::string &colorHex) {
        int colorInt = 0;
        for (const auto &c : colorHex) {
            colorInt <<= 4;
            if (c >= '0' && c <= '9') {
                colorInt = colorInt + c - '0';
            } else if (c >= 'a' && c <= 'f') {
                colorInt = colorInt + 10 + c - 'a';
            } else if (c >= 'A' && c <= 'F') {
                colorInt = colorInt + 10 + c - 'A';
            }
        }
        return colorInt;
    }

    std::map<std::string, int> colorToInt = {
            {"red", 0xFF0000},
            {"green", 0x00FF00},
            {"blue", 0x0000FF},
            {"cyan", 0x00FFFF},
            {"pink", 0xFFC0CB},
            {"orange", 0xFFA500},
            {"purple", 0x800080},
            {"yellow", 0xFFFF00},
            {"brown", 0xA52A2A},
            {"black", 0x000000},
            {"white", 0xFFFFFF},
            {"gray", 0x808080},
            {"lightgray", 0xD3D3D3},
            {"darkgray", 0xA9A9A9},
            {"magenta", 0xFF00FF}
    };

    std::map<int, std::string> intToColor = {
            {0xFF0000,"red"},
            {0x00FF00,"green"},
            {0x0000FF,"blue"},
            {0x00FFFF,"cyan"},
            {0xFFC0CB,"pink"},
            {0xFFA500,"orange"},
            {0x800080,"purple"},
            {0xFFFF00,"yellow"},
            {0xA52A2A,"brown"},
            {0x000000,"black"},
            {0xFFFFFF,"white"},
            {0x808080,"gray"},
            {0xD3D3D3,"lightgray"},
            {0xA9A9A9,"darkgray"},
            {0xFF00FF,"magenta"}
    };
}