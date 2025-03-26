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
    const char* pathfinder(char* config_initial, char* config_final) {
        std::string config_i = config_initial;
        std::string config_f = config_final;
        std::stringstream config_i_stream(config_i);
        std::stringstream config_f_stream(config_f);
        // I had both of this constructed with config_i at first and it took me way longer than it should've to
        // figure out why the pathfinder wasn't working

        // Prompt user for names for initial and final state files if they are not given as command line arguments
        if (config_i.empty()) {
            std::cerr << "Attempted to find path with no initial state! Exiting..." << std::endl;
            return EMPTY_SCEN;
        }
        std::size_t trimPos;
        if (config_f.empty()) {
            std::cerr << "Attempted to find path with no final state! Exiting..." << std::endl;
            return EMPTY_SCEN;
        }

        // Dynamically Link Properties (probably not a thing in web but we will find out)
        //std::cout << "Linking Properties..." << std::endl;
        //ModuleProperties::LinkProperties();
        //std::cout << "Properties successfully linked: " << ModuleProperties::PropertyCount() << std::endl;

        // Set up Lattice
        std::cout << "Initializing Lattice..." << std::endl;
        Lattice::SetFlags(true);
        LatticeSetup::SetupFromJson(config_i_stream);
        std::cout << "Lattice initialized." << std::endl;

        // Set up moves
        std::cout << "Initializing Move Manager..." << std::endl;
        MoveManager::InitMoveManager(Lattice::Order(), Lattice::AxisSize());
        std::cout << "Move Manager initialized." << std::endl << "Loading Moves..." << std::endl;
        MoveManager::RegisterAllMoves();
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
        std::cout << "A*" << std::endl;
        std::cout << "└Heuristic:            ";
        std::cout << "MRSH-1" << std::endl;
        std::cout << " ├L1 Distance Limits:  ";
#if CONFIG_HEURISTIC_CACHE_OPTIMIZATION
        std::cout << "ENABLED" << std::endl;
#else
        std::cout << "DISABLED" << std::endl;
#endif
        std::cout << " ├L2 Distance Limits:  ";
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
            path = ConfigurationSpace::AStar(&start, &end, "MRSH-1");
            const auto timeEnd = std::chrono::high_resolution_clock::now();
            const auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(timeEnd - timeBegin);
            std::cout << "Search completed in " << duration.count() << " ms." << std::endl;
        } catch(SearchExcept& searchExcept) {
            std::cerr << searchExcept.what() << std::endl;
        }

        std::cout << "Exporting results..." << std::endl;
        std::ostringstream scen;
        Scenario::ScenInfo scenInfo;
        scenInfo.exportFile = "None";
        scenInfo.scenName = "WebPathfinder-Out";
        scenInfo.scenDesc = "Output produced by a valid Pathfinder run.";

        Scenario::ExportToScen(path, scenInfo, scen);
        std::cout << "Results exported." << std::endl << "Cleaning Modules..." << std::endl;
        ModuleIdManager::CleanupModules();
        std::cout << "Modules cleaned." << std::endl << "Cleaning Moves..." << std::endl;
        Isometry::CleanupTransforms();
        std::cout << "Moves cleaned." << std::endl;
        std::cout << "Output: " << scen.str() << std::endl;
        scen_str = scen.str();
        return scen_str.c_str();
    }
}