#include "LatticeSetup.h"
#include <set>
#include <vector>
#include <fstream>
#include <iostream>
#include <valarray>
#include "Lattice.h"
#include "../search/ConfigurationSpace.h"
#include "../modules/Metamodule.h"

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
        if (j.contains("tensorPadding")) {
            Lattice::InitLattice(j["order"], j["axisSize"], j["tensorPadding"]);
        } else {
            Lattice::InitLattice(j["order"], j["axisSize"]);
        }
        std::set<int> colors;
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
                //colors.insert(Colors::colorToInt[module["color"]]);
            } else {
                ModuleIdManager::RegisterModule(coords, module["static"]);
            }
        }
        // Register static modules after non-static modules
        ModuleIdManager::DeferredRegistration();
        ModuleProperties::CallFunction("Palette");
        if (!Lattice::ignoreProperties) {
            if (const auto& palette = ModuleProperties::CallFunction<const std::unordered_set<int>&>("Palette"); palette.empty()) {
                Lattice::ignoreProperties = true;
            } else if (palette.size() == 1) {
                std::cout << "Only one color used, recommend rerunning with -i flag to improve performance." << std::endl;
            }
        }
        for (const auto& mod : ModuleIdManager::Modules()) {
            Lattice::AddModule(mod);
        }
        Lattice::BuildMovableModules();
        // Additional boundary setup
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
    }

    Configuration setupFinalFromJson(const std::string& filename) {
        std::ifstream file(filename);
        if (!file) {
            std::cerr << "Unable to open file " << filename << std::endl;
            throw std::ios_base::failure("Unable to open file " + filename + "\n");
        }
        nlohmann::json j;
        file >> j;
        //CoordTensor<bool> desiredState(Lattice::Order(), Lattice::AxisSize(), false);
        //CoordTensor<int> desiredColors(Lattice::Order(), Lattice::AxisSize(), -1);
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
            //desiredState[coords] = true;
            ModuleProperties props;
            if (!Lattice::ignoreProperties && module.contains("properties")) {
                props.InitProperties(module["properties"]);
                //desiredColors[coords] = Colors::colorToInt[module["color"]];
            }
            desiredState.insert({coords, props});
        }
        //return {desiredState, desiredColors};
        //TODO: add property stuff here
        return Configuration(desiredState);
    }

    [[deprecated("Should use setupFromJson instead")]]
    void setupInitial(const std::string& filename, int order, int axisSize) {
        Lattice::InitLattice(order, axisSize);
        std::vector<std::vector<char>> image;
        int x = 0;
        int y = 0;
        std::ifstream file(filename);
        if (!file) {
            std::cerr << "Unable to open file " << filename << std::endl;
            return;
        }
        std::string line;
        while (std::getline(file, line)) {
            for (char c : line) {
                if (c == '1') {
                    std::valarray<int> coords = {x, y};
                    ModuleIdManager::RegisterModule(coords, false);
                } else if (c == '@') {
                    std::valarray<int> coords = {x, y};
                    ModuleIdManager::RegisterModule(coords, true);
                }
                x++;
            }
            x = 0;
            y++;
        }
        ModuleIdManager::DeferredRegistration();
        for (const auto& mod : ModuleIdManager::Modules()) {
            Lattice::AddModule(mod);
        }
        Lattice::BuildMovableModules();
    }

    [[deprecated("Should use setupFinalFromJson instead")]]
    Configuration setupFinal(const std::string& filename) {
        int x = 0;
        int y = 0;
        std::ifstream file(filename);
        if (!file) {
            std::cerr << "Unable to open file " << filename << std::endl;
            throw std::ios_base::failure("Unable to open file " + filename + "\n");
        }
        CoordTensor<bool> desiredState(Lattice::Order(), Lattice::AxisSize(), false);
        CoordTensor<int> colors(Lattice::Order(), Lattice::AxisSize(), -1);
        std::string line;
        while (std::getline(file, line)) {
            for (char c : line) {
                if (c == '1') {
                    std::valarray<int> coords = {x, y};
                    desiredState[coords] = true;
                }
                x++;
            }
            x = 0;
            y++;
        }
        return Configuration({});
    }

    void setUpMetamodule(MetaModule* metamodule) {
        Lattice::InitLattice(metamodule->order, metamodule->size);
        for (const auto &[first, second]: metamodule->coords) {
            ModuleIdManager::RegisterModule(second, first);
        }
        ModuleIdManager::DeferredRegistration();
        for (const auto& mod : ModuleIdManager::Modules()) {
            Lattice::AddModule(mod);
        }
    }

    void setUpTiling() {
        Lattice::InitLattice(MetaModuleManager::order, MetaModuleManager::axisSize);
        for (int i = 0; i < MetaModuleManager::axisSize / MetaModuleManager::metamodules[0]->size; i++) {
            for (int j = 0; j < MetaModuleManager::axisSize / MetaModuleManager::metamodules[0]->size; j++) {
                if ((i%2==0 && j&1) || (i&1 && j%2 == 0)) {
                    for (const auto &[first, second]: MetaModuleManager::metamodules[5]->coords) {
                        std::valarray<int> newCoord = {MetaModuleManager::metamodules[5]->size * i, MetaModuleManager::metamodules[5]->size * j};
                        ModuleIdManager::RegisterModule(second + newCoord, first);
                    }
                } else {
                    for (const auto &[first, second]: MetaModuleManager::metamodules[0]->coords) {
                        std::valarray<int> newCoord = {MetaModuleManager::metamodules[0]->size * i, MetaModuleManager::metamodules[0]->size * j};
                        ModuleIdManager::RegisterModule(second + newCoord, first);
                    }
                }
            }
        }
        ModuleIdManager::DeferredRegistration();
        for (const auto& mod : ModuleIdManager::Modules()) {
            Lattice::AddModule(mod);
        }
        // for (const auto &coord: MetaModuleManager::metamodules[0]->coords) {
        //     Lattice::AddModule(coord);
        // }
        // for (const auto &coord: MetaModuleManager::metamodules[5]->coords) {
        //     std::valarray<int> newCoord = {3, 0};
        //     Lattice::AddModule(coord + newCoord);
        // }
        // for (const auto &coord: MetaModuleManager::metamodules[0]->coords) {
        //     std::valarray<int> newCoord = {3, 3};
        //     Lattice::AddModule(coord + newCoord);
        // }
        // for (const auto &coord: MetaModuleManager::metamodules[5]->coords) {
        //     std::valarray<int> newCoord = {0, 3};
        //     Lattice::AddModule(coord + newCoord);
        // }
    }

    void setUpTilingFromJson(const std::string& metamoduleFile, const std::string& config) {
        // TODO Replace hard-coded values
        int metamoduleOrder = 2;
        int metamoduleSize = 3;
        int latticeOrder = metamoduleOrder;
        int latticeSize = 10;
        MetaModule metamodule(metamoduleFile, metamoduleOrder, metamoduleSize);
        std::ifstream file(config);
        if (!file) {
            std::cerr << "Unable to open file " << config << std::endl;
            return;
        }
        nlohmann::json j;
        file >> j;
        // Potentially move this to main function because it is static
        MetaModuleManager::InitMetaModuleManager(metamoduleOrder, metamoduleSize);
        MetaModuleManager::GenerateFrom(&metamodule);
        for (const auto& metamodule : j["metamodules"]) {
            std::valarray<int> position = metamodule["position"];
            std::string config = metamodule["config"];
            // TODO 
            // Pick the correct metamodule
            // Replace coord.first with something more descriptive
            MetaModule* currentMetamodule = MetaModuleManager::metamodules[0];
            for (const auto &[first, second]: currentMetamodule->coords) {
                std::valarray<int> newCoord = second + position * currentMetamodule->size;
                ModuleIdManager::RegisterModule(second + newCoord, first);
            }
        }
        Lattice::InitLattice(MetaModuleManager::order, MetaModuleManager::axisSize);
        ModuleIdManager::DeferredRegistration();
        for (const auto& mod : ModuleIdManager::Modules()) {
            Lattice::AddModule(mod);
        }
    }
}