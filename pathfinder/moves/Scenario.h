#ifndef SCENARIO_H
#define SCENARIO_H

#include <string>
#include <vector>
#include "../search/ConfigurationSpace.h"
#include "nlohmann/json.hpp"

namespace Scenario {
    struct ScenInfo {
        std::string exportFile;
        std::string scenName;
        std::string scenDesc;
    };

    std::string TryGetScenName(const std::string& initialFile);

    std::string TryGetScenDesc(const std::string& initialFile);

    void ExportToScen(const std::vector<Configuration*>& path, const ScenInfo& scenInfo);
}

#endif