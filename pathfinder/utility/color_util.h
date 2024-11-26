#ifndef COLOR_UTIL_H
#define COLOR_UTIL_H

#include <map>
#include <string>

// Name of the color property in JSON
#define COLOR_PROP_NAME "colorProperty"
// Name of the actual color value in JSON
#define COLOR "color"

namespace Colors {
    struct ColorsRGB {
        int red;
        int green;
        int blue;

        ColorsRGB(int r, int g, int b);

        explicit ColorsRGB(int rgbInt);
    };

    extern std::map<std::string, ColorsRGB> colorToRGB;

    ColorsRGB ConvertColorNameToRGB(const std::string& colorName);

    int GetColorFromHex(const std::string& colorHex);

    extern std::map<std::string, int> colorToInt;

    extern std::map<int, std::string> intToColor;
}

#endif //COLOR_UTIL_H
