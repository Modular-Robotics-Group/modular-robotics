#ifndef LATTICESETUP_H
#define LATTICESETUP_H

#include <string>
#include "../search/ConfigurationSpace.h"
#include <nlohmann/json.hpp>

namespace LatticeSetup {
    void SetupFromJson(const std::string& filename);

    Configuration SetupFinalFromJson(const std::string& filename);
}

#endif