#include "LatticeSetup.h"
#include <set>
#include <vector>
#include <fstream>
#include <iostream>
#include <valarray>
#include "Lattice.h"
#include "../moves/MoveManager.h"
#include "../search/ConfigurationSpace.h"

#ifndef FLIP_Y_COORD
#define FLIP_Y_COORD false
#endif

ConfigPreprocessData LatticeSetup::preInitData;

AdjOverride LatticeSetup::adjCheckOverride = NONE;

void LatticeSetup::Preprocess(const std::string& filename_s, const std::string& filename_t) {
    std::ifstream file_s(filename_s);
    if (!file_s.is_open()) {
        std::cerr << "Unable to open file " << filename_s << std::endl;
        return;
    }
    std::ifstream file_t(filename_t);
    if (!file_t.is_open()) {
        std::cerr << "Unable to open file " << filename_t << std::endl;
        return;
    }
    Preprocess(file_s, file_t);
    file_s.close();
    file_t.close();
}

void LatticeSetup::Preprocess(std::istream& is_s, std::istream& is_t) {
    // Preprocess initial state
    nlohmann::json j_s;
    is_s >> j_s;
    int order = j_s["order"];
    std::vector<int> minStaticCoords(order);
    std::vector<int> maxStaticCoords(order);
    std::vector<int> minNonStaticCoords(order);
    std::vector<int> maxNonStaticCoords(order);
    bool staticCoordsInitialized = false;
    bool nonStaticCoordsInitialized = false;
    DEBUG("Preprocessing initial state..." << std::endl);
    for (const auto& module : j_s["modules"]) {
        std::vector<int> position = module["position"];
        if (module["static"]) {
            if (!staticCoordsInitialized) {
                minStaticCoords = position;
                maxStaticCoords = position;
                staticCoordsInitialized = true;
            } else for (int i = 0; i < order; i++) {
                if (position[i] < minStaticCoords[i]) {
                    minStaticCoords[i] = position[i];
                } else if (position[i] > maxStaticCoords[i]) {
                    maxStaticCoords[i] = position[i];
                }
            }
        } else {
            if (!nonStaticCoordsInitialized) {
                minNonStaticCoords = position;
                maxNonStaticCoords = position;
                nonStaticCoordsInitialized = true;
            } else for (int i = 0; i < order; i++) {
                if (position[i] < minNonStaticCoords[i]) {
                    minNonStaticCoords[i] = position[i];
                } else if (position[i] > maxNonStaticCoords[i]) {
                    maxNonStaticCoords[i] = position[i];
                }
            }
            preInitData.nonStaticCount++;
        }
    }
    if (!staticCoordsInitialized) {
        preInitData.fullNonStatic = true;
    } else {
        preInitData.fullNonStatic = false;
        int staticSize = 0;
        for (int i = 0; i < order; i++) {
            if (const int staticAxisSize = maxStaticCoords[i] - minStaticCoords[i]; staticAxisSize > staticSize) {
                staticSize = staticAxisSize;
            }
        }
        preInitData.staticConfigSize = staticSize + 1;
        std::ranges::transform(minStaticCoords, minStaticCoords.begin(), [](const int coord) { return -coord; });
        const std::valarray<int> zero_offset(minStaticCoords.data(), minStaticCoords.size());
        preInitData.staticZeroOffset_s = zero_offset;
    }
    if (j_s.contains("adjacencyOffsets")) {
        int maxConnectDist = 0;
        for (const auto& offset : j_s["adjacencyOffsets"]) {
            for (int i = 0; i < order && i < offset.size(); i++) {
                if (offset[i] > maxConnectDist) {
                    maxConnectDist = offset[i];
                }
            }
        }
        preInitData.maxConnectionDistance = maxConnectDist;
    } else {
        preInitData.maxConnectionDistance = 1;
    }
    // Preprocess final state
    nlohmann::json j_t;
    is_t >> j_t;
    staticCoordsInitialized = false;
    DEBUG("Preprocessing final state..." << std::endl);
    for (const auto& module : j_t["modules"]) {
        std::vector<int> position = module["position"];
        if (module["static"]) {
            if (!staticCoordsInitialized) {
                minStaticCoords = position;
                maxStaticCoords = position;
                staticCoordsInitialized = true;
            } else for (int i = 0; i < order; i++) {
                if (position[i] < minStaticCoords[i]) {
                    minStaticCoords[i] = position[i];
                } else if (position[i] > maxStaticCoords[i]) {
                    maxStaticCoords[i] = position[i];
                }
            }
        } else for (int i = 0; i < order; i++) {
            if (position[i] < minNonStaticCoords[i]) {
                minNonStaticCoords[i] = position[i];
            } else if (position[i] > maxNonStaticCoords[i]) {
                maxNonStaticCoords[i] = position[i];
            }
        }
    }
    if (!preInitData.fullNonStatic) {
        if (!staticCoordsInitialized) {
            // No static modules given in final state, have to assume offset is same
            preInitData.staticZeroOffset_t = preInitData.staticZeroOffset_s;
        } else {
            std::ranges::transform(minStaticCoords, minStaticCoords.begin(),
                                   [](const int coord) { return -coord; });
            const std::valarray<int> zero_offset(minStaticCoords.data(), minStaticCoords.size());
            preInitData.staticZeroOffset_t = zero_offset;
        }
    }
    int nonStaticSize = 0;
    for (int i = 0; i < order; i++) {
        if (const int nonStaticAxisSize = maxNonStaticCoords[i] - minNonStaticCoords[i]; nonStaticAxisSize > nonStaticSize) {
            nonStaticSize = nonStaticAxisSize;
        }
    }
    preInitData.nonStaticConfigSize = nonStaticSize + 1;
    DEBUG("Preprocessing complete." << std::endl);
}

void LatticeSetup::SetupFromJson(const std::string& filename) {
    std::ifstream file(filename);
    if (!file.is_open()) {
        std::cerr << "Unable to open file " << filename << std::endl;
        return;
    }
    SetupFromJson(file);
    file.close();
}

void LatticeSetup::SetupFromJson(std::istream& is) {
    if (ModuleProperties::PropertyCount() == 0) {
        Lattice::ignoreProperties = true;
    }
    nlohmann::json j;
    is >> j;
    std::cout << "\tCreating Lattice...   ";
    const int paddingSize = MoveManager::MaxDistance();
    if (preInitData.fullNonStatic) {
        if (j.contains("tensorPadding")) {
            Lattice::InitLattice(j["order"], preInitData.nonStaticConfigSize + 2 * preInitData.maxConnectionDistance * preInitData.nonStaticCount, std::max(static_cast<int>(j["tensorPadding"]), paddingSize));
        } else {
            Lattice::InitLattice(j["order"], preInitData.nonStaticConfigSize + 2 * preInitData.maxConnectionDistance * preInitData.nonStaticCount, paddingSize);
        }
        preInitData.fullOffset = Lattice::boundaryOffset + preInitData.maxConnectionDistance * preInitData.nonStaticCount;
    } else {
        const int axisSize = preInitData.staticConfigSize + 2 * preInitData.maxConnectionDistance * preInitData.nonStaticCount;
        Lattice::InitLattice(j["order"], axisSize, paddingSize);
        preInitData.fullOffset = Lattice::boundaryOffset + preInitData.staticZeroOffset_s + preInitData.maxConnectionDistance * preInitData.nonStaticCount;
    };
    std::cout << "Done." << std::endl << "\tConfiguring Adjacency Checks...   ";
    if (adjCheckOverride == NONE) {
        if (j.contains("adjacencyMode")) {
            if (j["adjacencyMode"] == "Cube Face") {
                // Adjacency when two modules have a common face
                Lattice::SetAdjIndicesFromOffsets(LatticeUtils::cubeAdjOffsets);
            } else if (j["adjacencyMode"] == "Cube Edge") {
                // Adjacency when two modules have a common edge
                Lattice::SetAdjIndicesFromOffsets(LatticeUtils::rhomDodAdjOffsets);
            } else {
                std::cerr << "Read invalid adjacency check option: " << j["adjacencyMode"] <<
                        R"(, valid options are "Cube Face" or "Cube Edge".)" << std::endl;
            }
        }
        if (Lattice::adjIndices.empty()) {
            if (j.contains("adjacencyOffsets")) {
                std::vector<std::valarray<int>> offsets;
                for (const auto& offset_in : j["adjacencyOffsets"]) {
                    std::valarray<int> offset(0, Lattice::Order());
                    for (int i = 0; i < Lattice::Order() && i < offset_in.size(); i++) {
                        offset[i] = offset_in[i];
                    }
                    offsets.push_back(offset);
                }
                Lattice::SetAdjIndicesFromOffsets(offsets);
            } else {
                // Cube adjacency as fallback, might be worth looking into some way to auto-choose between cube and rd
                Lattice::SetAdjIndicesFromOffsets(LatticeUtils::cubeAdjOffsets);
            }
        }
    } else if (adjCheckOverride == CUBE) {
        Lattice::SetAdjIndicesFromOffsets(LatticeUtils::cubeAdjOffsets);
    } else {
        Lattice::SetAdjIndicesFromOffsets(LatticeUtils::rhomDodAdjOffsets);
    }
    std::cout << "Done." << std::endl << "\tConstructing Non-Static Modules...   ";
    for (const auto& module : j["modules"]) {
        std::vector<int> position = module["position"];
        std::valarray<int> coords(position.data(), position.size());
        coords += preInitData.fullOffset;
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
            std::cout << "Only one color used, recommend rerunning with -i flag to improve performance. ";
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
            coords += preInitData.fullOffset;
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

Configuration LatticeSetup::SetupFinalFromJson(const std::string& filename) {
    std::ifstream file(filename);
    if (!file.is_open()) {
        std::cerr << "Unable to open file " << filename << std::endl;
        throw std::ios_base::failure("Unable to open file " + filename + "\n");
    }
    auto final = SetupFinalFromJson(file);
    file.close();
    return final;
}

Configuration LatticeSetup::SetupFinalFromJson(std::istream& is) {
    nlohmann::json j;
    is >> j;
    std::set<ModuleData> desiredState;
    std::valarray<int> placementOffset = preInitData.fullNonStatic
                                             ? preInitData.fullOffset
                                             : Lattice::boundaryOffset + preInitData.staticZeroOffset_t + preInitData.maxConnectionDistance * preInitData.nonStaticCount;
    for (const auto& module : j["modules"]) {
        if (module["static"] == true) continue;
        std::vector<int> position = module["position"];
        std::valarray<int> coords(position.data(), position.size());
        coords += placementOffset;
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