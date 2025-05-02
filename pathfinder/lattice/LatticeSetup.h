#ifndef LATTICESETUP_H
#define LATTICESETUP_H

#include <string>
#include "../search/ConfigurationSpace.h"
#include <nlohmann/json.hpp>

enum AdjOverride {
    NONE,
    CUBE,
    RHOMDOD
};

struct ConfigPreprocessData {
    bool fullNonStatic;
    std::valarray<int> staticZeroOffset_s;
    std::valarray<int> staticZeroOffset_t;
    int staticConfigSize = 0;
    int nonStaticCount = 0;
};

namespace LatticeSetup {
    extern ConfigPreprocessData preprocessData;

    extern AdjOverride adjCheckOverride;

    void Preprocess(const std::string& filename_s, const std::string& filename_t);

    void Preprocess(std::istream& is_s, std::istream& is_t);

    void SetupFromJson(const std::string& filename);

    void SetupFromJson(std::istream& is);

    Configuration SetupFinalFromJson(const std::string& filename);

    Configuration SetupFinalFromJson(std::istream& is);
}

#endif