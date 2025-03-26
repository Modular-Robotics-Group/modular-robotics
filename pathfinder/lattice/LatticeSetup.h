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

namespace LatticeSetup {
    extern AdjOverride adjCheckOverride;

    void SetupFromJson(const std::string& filename);

    void SetupFromJson(std::istream& is);

    Configuration SetupFinalFromJson(const std::string& filename);

    Configuration SetupFinalFromJson(std::istream& is);
}

#endif