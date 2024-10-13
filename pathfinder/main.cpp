#include <chrono>
#include <iostream>
#include <getopt.h>
#include <string>
#include "moves/MoveManager.h"
#include "search/ConfigurationSpace.h"
#include <boost/format.hpp>
#include <nlohmann/json.hpp>
#include "modules/Metamodule.h"
#include "lattice/LatticeSetup.h"
#include "moves/Scenario.h"
#include "search/SearchAnalysis.h"

#define GENERATE_FINAL_STATE false
#define PRINT_PATH false
#if CONFIG_PARALLEL_MOVES && !PRINT_PATH
#warning "Setting print path to true, since parallel move visualization isn't supported"
#undef PRINT_PATH
#define PRINT_PATH true
#endif

int main(int argc, char* argv[]) {
    bool ignoreColors = false;
    std::string initialFile;
    std::string finalFile;
    std::string exportFile;
    std::string analysisFile;
    std::string searchMethod;

    // Define the long options
    static option long_options[] = {
        {"ignore-colors", no_argument, nullptr, 'i'},
        {"initial-file", required_argument, nullptr, 'I'},
        {"final-file", required_argument, nullptr, 'F'},
        {"export-file", required_argument, nullptr, 'e'},
        {"analysis-file", required_argument, nullptr, 'a'},
        {"search-method", required_argument, nullptr, 's'},
        {nullptr, 0, nullptr, 0}
    };

    int option_index = 0;
    int c;
    while ((c = getopt_long(argc, argv, "iI:F:e:a:s:", long_options, &option_index)) != -1) {
        switch (c) {
            case 'i':
                ignoreColors = true;
                break;
            case 'I':
                initialFile = optarg;
                break;
            case 'F':
                finalFile = optarg;
                break;
            case 'e':
                exportFile = optarg;
                break;
            case 'a':
                analysisFile = optarg;
                break;
            case 's':
                searchMethod = optarg;
            case '?':
                break;
            default:
                abort();
        }
    }

    // Prompt user for names for initial and final state files if they are not given as command line arguments
    if (initialFile.empty()) {
        std::cout << "Path to initial state:" << std::endl;
        int numTries = 0;
        bool invalidPath = true;
        while (invalidPath) {
            std::cin >> initialFile;
            if (std::filesystem::exists(initialFile)) {
                invalidPath = false;
            } else {
                numTries++;
                std::cout << "Invalid path!" << std::endl;
                DEBUG(initialFile << std::endl);
                if (numTries >= 5) {
                    exit(1);
                }
            }
        }
    }
#if !GENERATE_FINAL_STATE
    if (finalFile.empty()) {
        std::cout << "Path to final state:" << std::endl;
        int numTries = 0;
        bool invalidPath = true;
        while (invalidPath) {
            std::cin >> finalFile;
            if (std::filesystem::exists(finalFile)) {
                invalidPath = false;
            } else {
                numTries++;
                std::cout << "Invalid path!" << std::endl;
                DEBUG(finalFile << std::endl);
                if (numTries >= 5) {
                    exit(1);
                }
            }
        }
    }
#endif

    // Generate names for export and analysis files if they are not specified
    std::size_t trimPos;
    if (exportFile.empty()) {
        exportFile = std::filesystem::path(initialFile).replace_extension(".scen");
        if ((trimPos = exportFile.find("_initial")) != std::string::npos) {
            exportFile.erase(trimPos, 8);
        }
    }
    if (analysisFile.empty()) {
        auto initialFilePath = std::filesystem::path(initialFile);
        analysisFile = initialFilePath.replace_filename(initialFilePath.stem().string() + "_analysis.json");
        if ((trimPos = analysisFile.find("_initial")) != std::string::npos) {
            analysisFile.erase(trimPos, 8);
        }
    }

    // Dynamically Link Properties
    ModuleProperties::LinkProperties();

    // Set up Lattice
    Lattice::setFlags(ignoreColors);
    LatticeSetup::setupFromJson(initialFile);
    std::cout << Lattice::ToString();
    
    // Set up moves
    MoveManager::InitMoveManager(Lattice::Order(), Lattice::AxisSize());
    MoveManager::RegisterAllMoves("../Moves");
    
    // Pathfinding
    Configuration start(Lattice::GetModuleInfo());
#if GENERATE_FINAL_STATE
    Configuration end = ConfigurationSpace::GenerateRandomFinal();
#else
    Configuration end = LatticeSetup::setupFinalFromJson(finalFile);
#endif
    std::vector<Configuration*> path;
    try {
        const auto timeBegin = std::chrono::high_resolution_clock::now();
        if (searchMethod.empty() || searchMethod == "A*" || searchMethod == "a*") {
            path = ConfigurationSpace::AStar(&start, &end);
        } else if (searchMethod == "BFS" || searchMethod == "bfs") {
            path = ConfigurationSpace::BFS(&start, &end);
        }
        const auto timeEnd = std::chrono::high_resolution_clock::now();
        const auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(timeEnd - timeBegin);
        std::cout << "Search completed in " << duration.count() << " ms" << std::endl;
#if CONFIG_OUTPUT_JSON
        SearchAnalysis::ExportData(analysisFile);
#endif
    } catch(BFSExcept& bfsExcept) {
        std::cerr << bfsExcept.what() << std::endl;
    }

#if PRINT_PATH
    std::cout << "Path:\n";
    for (const auto config : path) {
        Lattice::UpdateFromModuleInfo(config->GetModData());
        std::cout << Lattice::ToString();
    }
#endif

    Scenario::ScenInfo scenInfo;
    scenInfo.exportFile = exportFile;
    scenInfo.scenName = Scenario::TryGetScenName(initialFile);
    scenInfo.scenDesc = Scenario::TryGetScenDesc(initialFile);
    
    Scenario::exportToScen(path, scenInfo);
    Isometry::CleanupTransforms();
    return 0;
}