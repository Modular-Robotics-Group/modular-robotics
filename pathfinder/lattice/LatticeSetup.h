#ifndef LATTICESETUP_H
#define LATTICESETUP_H

#include <string>
#include "../search/ConfigurationSpace.h"
#include <nlohmann/json.hpp>

namespace LatticeSetup {
    void setupFromJson(const std::string& filename);

    Configuration setupFinalFromJson(const std::string& filename);
}

#endif