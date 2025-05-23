#include "Scenario.h"
#include <iostream>
#include <fstream>
#include <queue>
#include <boost/format.hpp>
#include "../modules/ModuleManager.h"
#include "MoveManager.h"
#include "../coordtensor/CoordTensor.h"
#include "../lattice/Lattice.h"
#include "../lattice/LatticeSetup.h"
#include "../utility/color_util.h"

std::string Scenario::TryGetScenName(const std::string& initialFile) {
    std::ifstream stateFile(initialFile);
    nlohmann::json stateJson = nlohmann::json::parse(stateFile);
    if (stateJson.contains("name")) {
        return stateJson["name"];
    }
    std::string name = std::filesystem::path(initialFile).filename().stem().string();
    if (std::size_t trimPos = name.find("_initial"); trimPos != std::string::npos) {
        name.erase(trimPos, 8);
    }
    return name;
}

std::string Scenario::TryGetScenDesc(const std::string& initialFile) {
    std::ifstream stateFile(initialFile);
    nlohmann::json stateJson = nlohmann::json::parse(stateFile);
    if (stateJson.contains("description")) {
        return stateJson["description"];
    }
    return "Scenario file generated by pathfinder.";
}

std::string Scenario::TryGetScenType(const std::string &initialFile) {
    std::ifstream stateFile(initialFile);
    nlohmann::json stateJson = nlohmann::json::parse(stateFile);
    if (stateJson.contains("moduleType")) {
        return stateJson["moduleType"];
    }
    return "CUBE";
}

void Scenario::ExportToScenFile(const std::vector<const Configuration*>& path, const ScenInfo& scenInfo) {
    std::ofstream file;
    file.open(scenInfo.exportFile);
    if (!file.is_open()) {
        std::cerr << "Unable to open file " << scenInfo.exportFile << std::endl;
        throw std::ios_base::failure("Unable to open file " + scenInfo.exportFile + "\n");
    }
    ExportToScen(path, scenInfo, file);
    file.close();
}

void Scenario::ExportToScen(const std::vector<const Configuration*>& path, const ScenInfo& scenInfo, std::ostream& os) {
    if (path.empty()) {
        std::cerr << "Tried to export empty path, no good!" << std::endl;
        return;
    }
    os << scenInfo.scenName << std::endl << scenInfo.scenDesc << std::endl;
#if LATTICE_OLD_EDGECHECK
#if LATTICE_RD_EDGECHECK
    os << "RHOMBIC_DODECAHEDRON\n\n";
#else
    os << "CUBE\n\n";
#endif
#else
    os << scenInfo.scenType << std::endl << std::endl;
#endif
    if (Lattice::ignoreProperties) {
        os << "0, 255, 255, 255, 90\n";
        os << "1, 255, 255, 255, 90\n\n";
    } else {
        std::cout << "\tBuilding color palette...   ";
        for (auto color: ModuleProperties::CallFunction<const std::unordered_set<int>&>("Palette")) {
            Colors::ColorsRGB rgb(color);
            os << color << ", " << rgb.red << ", " << rgb.green << ", " << rgb.blue << ", 90\n";
        }
        os << "\n";
        std::cout << "Done." << std::endl;
    }
    std::cout << "\tSetting up formatting...   ";
    auto idLen = std::to_string(ModuleIdManager::Modules().size()).size();
    boost::format padding("%s%%0%dd, %s");
    boost::format modDef((padding % "%s" % idLen % "%d, %d, %d, %d").str());
    std::cout << "Done." << std::endl << "\tResetting lattice to initial state...   ";
    Lattice::UpdateFromModuleInfo(path[0]->GetModData());
    std::cout << "Done." << std::endl << "\tExporting initial state...   ";
    for (size_t id = 0; id < ModuleIdManager::Modules().size(); id++) {
        auto& mod = ModuleIdManager::Modules()[id];
        auto coords = mod.coords - LatticeSetup::preInitData.fullOffset;
        if (Lattice::ignoreProperties) {
            modDef % "" % id % (mod.moduleStatic ? 1 : 0) % coords[0] % coords[1] % (coords.size() > 2
                    ? coords[2]
                    : 0);
        } else {
            modDef % "" % id % (mod.properties.Find(COLOR_PROP_NAME))->CallFunction<int>("GetColorInt") % coords[0] %
                    coords[1] % (coords.size() > 2 ? coords[2] : 0);
        }
        os << modDef.str() << std::endl;
    }
    os << std::endl;
    std::cout << "Done." << std::endl << "\tExporting moves...   ";
#if CONFIG_PARALLEL_MOVES
    std::vector<std::queue<std::pair<Move::AnimType, std::valarray<int>>>> parallelAnimQueues(ModuleIdManager::MinStaticID());
#endif
    for (size_t i = 1; i < path.size(); i++) {
        bool checkpoint = true;
#if CONFIG_PARALLEL_MOVES
        auto parallelMoves = MoveManager::FindParallelMovesToState(path[i]->GetModData());
        // Enqueue move animations
        int animsToExport = 0;
        for (auto [mod, move] : parallelMoves) {
            for (const auto& anim : move->AnimSequence()) {
                parallelAnimQueues[mod->id].push(anim);
                animsToExport++;
            }
        }
        // Export animations to scenario file
        while (animsToExport != 0) {
            for (int id = 0; id < ModuleIdManager::MinStaticID(); id++) {
                if (parallelAnimQueues[id].empty()) continue;
                auto [type, offset] = parallelAnimQueues[id].front();
                modDef % (checkpoint ? '*' : ' ') % id % type % offset[0] % offset[1] % offset[2];
                os << modDef.str() << std::endl;
                checkpoint = false;
                parallelAnimQueues[id].pop();
                animsToExport--;
            }
            os << std::endl;
        }
        // Make moves
        for (auto [mod, move] : parallelMoves) {
            MoveManager::MoveModule(*mod, move);
        }
#else
        auto [movingModule, move] = MoveManager::FindMoveToState(path[i]->GetModData());
        if (move == nullptr) {
            std::cout << "Failed to generate scenario file, no move to next state found.\n";
            return;
        }
        auto modToMove = movingModule;
        for (const auto& [type, offset]: move->AnimSequence()) {
            modDef % (checkpoint ? '*' : ' ') % modToMove->id % type % offset[0] % offset[1] % offset[2];
            os << modDef.str() << std::endl << std::endl;
            checkpoint = false;
        }
        MoveManager::MoveModule(*modToMove, move);
#endif
    }
    std::cout << "Done." << std::endl;
}
