#include <chrono>
#include <iostream>
#include <getopt.h>
#include <string>
#include "../../pathfinder/moves/MoveManager.h"
#include "../../pathfinder/search/ConfigurationSpace.h"
#include <boost/format.hpp>
#include <nlohmann/json.hpp>
#include "../../pathfinder/lattice/LatticeSetup.h"
#include "../../pathfinder/moves/Scenario.h"
#include "../../pathfinder/search/HeuristicCache.h"
#include <sstream>

#ifndef GENERATE_FINAL_STATE
#define GENERATE_FINAL_STATE false
#endif

#ifndef PRINT_PATH
#define PRINT_PATH false
#endif

const char* EMPTY_SCEN =
    "Empty Scenario"
    "Output produced by an invalid Pathfinder run."
    "CUBE";

std::string scen_str;

extern "C" {
    void exceptionTest() {
        throw std::runtime_error("Exception Test");
    }

    const char* config2Scen(char* config) {
        // Technically, this function does much more work than it needs to; However, there isn't much need to add new
        // functionality for this specific feature when the naive approach using existing functionality works just as
        // well.
        std::string config_str = config;
        std::stringstream config_stream(config_str);
        nlohmann::json config_json;
        std::stringstream(config_str) >> config_json;

        // Dynamically Link Properties
        std::cout << "Linking Properties..." << std::endl;
        ModuleProperties::LinkProperties();
        std::cout << "Properties successfully linked: " << ModuleProperties::PropertyCount() << std::endl;

        // Set up Lattice
        std::cout << "Initializing Lattice..." << std::endl;
        LatticeSetup::SetupFromJson(config_stream);
        std::cout << "Lattice initialized." << std::endl;

        // Get Configuration and create "path" with no moves
        Configuration start(Lattice::GetModuleInfo());
        std::vector<const Configuration*> path = { &start };

        // Send path to scen exporter
        std::ostringstream scen;
        Scenario::ScenInfo scenInfo;
        scenInfo.exportFile = "None";
        scenInfo.scenName = config_json.contains("name") ? config_json["name"] : "scen_out";
        scenInfo.scenDesc = config_json.contains("description") ? config_json["description"] : "config2Scen output";
        scenInfo.scenType = config_json.contains("moduleType") ? config_json["moduleType"] : "CUBE";
        Scenario::ExportToScen(path, scenInfo, scen);
        scen_str = scen.str();
        return scen_str.c_str();
    }

    const char* pathfinder(char* config_initial, char* config_final, char* settings) {
        std::string config_i = config_initial;
        std::string config_f = config_final;
        std::stringstream config_i_stream(config_i);
        std::stringstream config_f_stream(config_f);
        nlohmann::json config_initial_json;
        std::stringstream(config_i) >> config_initial_json;
        nlohmann::json settings_json;
        std::stringstream(settings) >> settings_json;

        // Exit if final or initial state is missing
        if (config_i.empty()) {
            std::cerr << "Attempted to find path with no initial state! Exiting..." << std::endl;
            return EMPTY_SCEN;
        }
        if (config_f.empty()) {
            std::cerr << "Attempted to find path with no final state! Exiting..." << std::endl;
            return EMPTY_SCEN;
        }

        // Dynamically Link Properties
        std::cout << "Linking Properties..." << std::endl;
        ModuleProperties::LinkProperties();
        std::cout << "Properties successfully linked: " << ModuleProperties::PropertyCount() << std::endl;

        // Set up Lattice
        std::cout << "Initializing Lattice..." << std::endl;
        LatticeSetup::SetupFromJson(config_i_stream);
        std::cout << "Lattice initialized." << std::endl;

        // Set up moves
        std::cout << "Initializing Move Manager..." << std::endl;
        MoveManager::InitMoveManager(Lattice::Order(), Lattice::AxisSize());
        std::cout << "Move Manager initialized." << std::endl << "Loading Moves..." << std::endl;
        for (const auto& path : settings_json["movePaths"]) {
            MoveManager::RegisterAllMoves(path);
        }
        std::cout << "Moves loaded." << std::endl;

        // print some stuff
        std::cout << std::endl << "Module Representation: ";
#if CONFIG_MOD_DATA_STORAGE == MM_DATA_FULL
        std::cout << "FULL" << std::endl;
#elif CONFIG_MOD_DATA_STORAGE == MM_DATA_INT64
        std::cout << "INT64" << std::endl;
#else
        std::cout << "INVALID" << std::endl;
#endif
        std::cout << "Final State Generator: ";
#if GENERATE_FINAL_STATE
        std::cout << "ENABLED" << std::endl;
#else
        std::cout << "DISABLED" << std::endl;
#endif
        std::cout << "Edge Check Mode:       ";
#if LATTICE_OLD_EDGECHECK
#if LATTICE_RD_EDGECHECK
        std::cout << "RHOMBIC DODECAHEDRON FACE" << std::endl;
#else
        std::cout << "CUBE FACE" << std::endl;
#endif
#else
        std::cout << "GENERAL" << std::endl;
#endif
        std::cout << "Parallel Pathfinding:  ";
#if CONFIG_PARALLEL_MOVES
        std::cout << "ENABLED" << std::endl;
#else
        std::cout << "DISABLED" << std::endl;
#endif
        std::cout << "Search Method:         ";
        if (settings_json["search"] == "A*") {
            std::cout << "A*" << std::endl;
            std::cout << "└Heuristic:            ";
            std::cout << settings_json["heuristic"] << std::endl;
            if (settings_json["heuristic"] == "MRSH-1") {
                std::cout << " ├Unreachable Cache:   ";
#if CONFIG_HEURISTIC_CACHE_OPTIMIZATION
                std::cout << "ENABLED" << std::endl;
#else
                std::cout << "DISABLED" << std::endl;
#endif
                std::cout << " ├Reach Limits:        ";
#if CONFIG_HEURISTIC_CACHE_DIST_LIMITATIONS
                std::cout << "ENABLED" << std::endl;
#else
                std::cout << "DISABLED" << std::endl;
#endif
                std::cout << " └Help Limits:         ";
#if CONFIG_HEURISTIC_CACHE_HELP_LIMITATIONS
                std::cout << "ENABLED" << std::endl;
#else
                std::cout << "DISABLED" << std::endl;
#endif
            }
        } else {
            std::cout << "BDBFS" << std::endl;
        }
        std::cout << std::endl;

        // Pathfinding
        Configuration start(Lattice::GetModuleInfo());
        BDConfiguration bidirectionalStart(start.GetModData(), START);
        Configuration end = LatticeSetup::SetupFinalFromJson(config_f_stream);
        BDConfiguration bidirectionalEnd(end.GetModData(), END);
        std::vector<const Configuration*> path;
        try {
            std::cout << "Beginning search..." << std::endl;
            const auto timeBegin = std::chrono::high_resolution_clock::now();
            if (settings_json["search"] == "A*") {
                path = ConfigurationSpace::AStar(&start, &end, settings_json["heuristic"]);
            } else {
                path = ConfigurationSpace::BiDirectionalBFS(&bidirectionalStart, &bidirectionalEnd);
            }
            const auto timeEnd = std::chrono::high_resolution_clock::now();
            const auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(timeEnd - timeBegin);
            std::cout << "Search completed in " << duration.count() << " ms." << std::endl;
        } catch(SearchExcept& searchExcept) {
            std::cerr << searchExcept.what() << std::endl;
        } catch(std::exception& exception) {
            std::cerr << exception.what() << std::endl;
            throw exception;
        }

        std::cout << "Exporting results..." << std::endl;
        std::ostringstream scen;
        Scenario::ScenInfo scenInfo;
        scenInfo.exportFile = "None";
        scenInfo.scenName = config_initial_json.contains("name") ? config_initial_json["name"] : "scen_out";
        scenInfo.scenDesc = config_initial_json.contains("description") ? config_initial_json["description"] : "config2Scen output";
        scenInfo.scenType = config_initial_json.contains("moduleType") ? config_initial_json["moduleType"] : "CUBE";

        Scenario::ExportToScen(path, scenInfo, scen);
        std::cout << "Results exported." << std::endl << "Cleaning Modules..." << std::endl;
        ModuleIdManager::CleanupModules();
        std::cout << "Modules cleaned." << std::endl << "Cleaning Moves..." << std::endl;
        Isometry::CleanupTransforms();
        std::cout << "Moves cleaned." << std::endl;
        scen_str = scen.str();
        return scen_str.c_str();
    }
}