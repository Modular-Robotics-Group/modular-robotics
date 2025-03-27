#include <iostream>
#include "Colors.h"
#include "../utility/color_util.h"

// Make sure this properties constructor is in the constructor map
PropertyInitializer ColorProperty::initializer(COLOR_PROP_NAME, &PropertyInitializer::InitProperty<ColorProperty>);

std::unordered_set<int> ColorProperty::allColors;

bool ColorProperty::CompareProperty(const IModuleProperty& right) {
    return color == dynamic_cast<const ColorProperty&>(right).color;
}

IModuleProperty* ColorProperty::MakeCopy() const {
    return new ColorProperty(*this);
}

std::uint_fast64_t ColorProperty::AsInt() const {
    return color;
}

std::size_t ColorProperty::GetHash() {
    constexpr boost::hash<int> hash;
    return hash(color);
}

ColorProperty::ColorProperty(const nlohmann::basic_json<>& propertyDef) {
    key = COLOR_PROP_NAME;
    if (propertyDef[COLOR].is_array()) {
        if (std::all_of(propertyDef[COLOR].begin(), propertyDef[COLOR].end(),
                        [](const nlohmann::basic_json<>& i){return i.is_number_integer();})) {
            color = 0;
            for (int channel : propertyDef[COLOR]) {
                color <<= 8;
                color += channel;
            }
        }
    } else if (propertyDef[COLOR].is_string()) {
        if (static_cast<std::string>(propertyDef[COLOR])[0] == '#') {
            color = Colors::GetColorFromHex(propertyDef[COLOR]);
        } else {
            color = Colors::colorToInt[propertyDef[COLOR]];
        }
    } else if (propertyDef[COLOR].is_number_integer()) {
        color = propertyDef[COLOR];
    } else {
        std::cerr << "Color improperly formatted." << std::endl;
        return;
    }
    allColors.insert(color);
}

int ColorProperty::GetColorInt() const {
    return color;
}

const std::unordered_set<int>& ColorProperty::Palette() {
    return allColors;
}

boost::any Palette() {
    return std::cref(ColorProperty::Palette());
}

boost::any GetColorInt(IModuleProperty* prop) {
    const auto colorProp = reinterpret_cast<ColorProperty*>(prop);
    return colorProp->GetColorInt();
}

boost::any IsColor(IModuleProperty* prop, const nlohmann::basic_json<>& args) {
    const auto colorProp = static_cast<ColorProperty*>(prop);
    if (args[0].is_number_integer()) {
        return colorProp->GetColorInt() == args[0];
    }
    int color = 0;
    if (args[0].is_array()) {
        if (std::all_of(args[0].begin(), args[0].end(),
                        [](const nlohmann::basic_json<>& i){return i.is_number_integer();})) {
            for (const int channel : args[0]) {
                color <<= 8;
                color += channel;
            }
        } else {
            return false;
        }
    } else if (args[0].is_string()) {
        if (static_cast<std::string>(args[0])[0] == '#') {
            color = Colors::GetColorFromHex(args[0]);
        } else {
            color = Colors::colorToInt[args[0]];
        }
    }
    return colorProp->GetColorInt() == color;
}
