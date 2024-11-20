#include "LatticeSetup.h"
#include <set>
#include <vector>
#include <fstream>
#include <iostream>
#include <valarray>
#include "Lattice.h"
#include "../search/ConfigurationSpace.h"

#define FLIP_Y_COORD true

namespace LatticeSetup {
    void setupFromJson(const std::string& filename) {
        if (ModuleProperties::PropertyCount() == 0) {
            Lattice::ignoreProperties = true;
        }
        std::ifstream file(filename);
        if (!file) {
            std::cerr << "Unable to open file " << filename << std::endl;
            return;
        }
        nlohmann::json j;
        file >> j;
        std::cout << "\tCreating Lattice...   ";
        if (j.contains("tensorPadding")) {
            Lattice::InitLattice(j["order"], j["axisSize"], j["tensorPadding"]);
        } else {
            Lattice::InitLattice(j["order"], j["axisSize"]);
        }
        std::cout << "Done." << std::endl << "\tConstructing Non-Static Modules...   ";
        for (const auto& module : j["modules"]) {
            std::vector<int> position = module["position"];
            std::transform(position.begin(), position.end(), position.begin(),
                        [](const int coord) { return coord; });
            std::valarray<int> coords(position.data(), position.size());
            coords += Lattice::boundaryOffset;
#if FLIP_Y_COORD
            coords[1] = Lattice::AxisSize() - coords[1] - 1;
#endif
            if (!Lattice::ignoreProperties && module.contains("properties")) {
                ModuleIdManager::RegisterModule(coords, module["static"], module["properties"]);
            } else {
                ModuleIdManager::RegisterModule(coords, module["static"]);
            }
        }
        std::cout << "Done." << std::endl;
        // Register static modules after non-static modules
        std::cout << "\tConstructing Static Modules...   ";
        ModuleIdManager::DeferredRegistration();
        std::cout << "Done." << std::endl;
        std::cout << "\tPalette Check...   ";
        if (!Lattice::ignoreProperties) {
            if (const auto& palette = ModuleProperties::CallFunction<const std::unordered_set<int>&>("Palette"); palette.empty()) {
                Lattice::ignoreProperties = true;
            } else if (palette.size() == 1) {
                std::cout << "Only one color used, recommend rerunning with -i flag to improve performance." << std::endl;
            }
        }
        std::cout << "Done." << std::endl << "\tInserting Modules...   ";
        for (const auto& mod : ModuleIdManager::Modules()) {
            Lattice::AddModule(mod);
        }
        std::cout << "Done." << std::endl << "\tBuilding Movable Module Cache...   ";
        Lattice::BuildMovableModules();
        std::cout << "Done." << std::endl;
        // Additional boundary setup
        std::cout << "\tInserting Boundaries...   ";
        if (j.contains("boundaries")) {
            for (const auto& bound : j["boundaries"]) {
                std::valarray<int> coords = bound;
                coords += Lattice::boundaryOffset;
#if FLIP_Y_COORD
                coords[1] = Lattice::AxisSize() - coords[1] - 1;
#endif
                if (Lattice::coordTensor[coords] < 0) {
                    Lattice::AddBound(coords);
                } else {
                    std::cerr << "Attempted to add a boundary where a module is already present!" << std::endl;
                }
            }
        }
        std::cout << "Done." << std::endl;
    }

    Configuration setupFinalFromJson(const std::string& filename) {
        std::ifstream file(filename);
        if (!file) {
            std::cerr << "Unable to open file " << filename << std::endl;
            throw std::ios_base::failure("Unable to open file " + filename + "\n");
        }
        nlohmann::json j;
        file >> j;
        std::set<ModuleData> desiredState;
        for (const auto& module : j["modules"]) {
            if (module["static"] == true) continue;
            std::vector<int> position = module["position"];
            std::transform(position.begin(), position.end(), position.begin(),
                        [](const int coord) { return coord; });
            std::valarray<int> coords(position.data(), position.size());
            coords += Lattice::boundaryOffset;
#if FLIP_Y_COORD
            coords[1] = Lattice::AxisSize() - coords[1] - 1;
#endif
            ModuleProperties props;
            if (!Lattice::ignoreProperties && module.contains("properties")) {
                props.InitProperties(module["properties"]);
            }
            desiredState.insert({coords, props});
        }
        return Configuration(desiredState);
    }
}