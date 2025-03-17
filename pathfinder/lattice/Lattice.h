#ifndef MODULAR_ROBOTICS_LATTICE_H
#define MODULAR_ROBOTICS_LATTICE_H

#include <set>
#include "../modules/ModuleManager.h"
#include "../coordtensor/CoordTensor.h"

// Verbosity Constants (Don't change these)
#define LAT_LOG_NONE 0
#define LAT_LOG_ADJ 1
#define LAT_LOG_CUT 2
#define LAT_LOG_ALL 3
/* Verbosity Configuration
 * NONE: No output from Lattice
 * ADJ: Output adjacency information
 * CUT: Output cut vertex information
 * ALL: Output both adjacency and cut vertex information
 */
#ifndef LATTICE_VERBOSE
#define LATTICE_VERBOSE LAT_LOG_NONE
#endif

/* Edge Check Configuration
 * OLD_EDGECHECK: Set this to true to use legacy edge checking functions
 * RD_EDGECHECK: Set this to true to check for all edges of a rhombic dodecahedron instead of a cube
 */
#ifndef LATTICE_OLD_EDGECHECK
#define LATTICE_OLD_EDGECHECK false
#endif
#ifndef LATTICE_RD_EDGECHECK
#define LATTICE_RD_EDGECHECK false
#endif

enum TensorContents {
    OUT_OF_BOUNDS = -2,
    FREE_SPACE = -1,
    OCCUPIED_NO_ANCHOR = std::numeric_limits<int>::max()
};

namespace LatticeUtils {
    extern const std::vector<std::valarray<int>> cubeAdjOffsets;

    extern const std::vector<std::valarray<int>> rhomDodAdjOffsets;
}

class Lattice {
private:
    // Vector that holds the IDs of adjacent modules, indexed by ID
    static std::vector<std::vector<int>> adjList;
    // Order of coordinate tensor / # of dimensions
    static int order;
    // Length of every axis
    static int axisSize;
    // Time variable for DFS
    static int time;
    // # of modules
    static int moduleCount;
    // Vector of movable modules
    static std::vector<Module*> movableModules;

    // Clear adjacency list for module ID, and remove module ID from other lists
    static void ClearAdjacencies(int moduleId);

public:
    // State tensor
    static CoordTensor<bool> stateTensor;
    // Module tensor
    static CoordTensor<int> coordTensor;
    // Boundary Offset
    static int boundarySize;
    static std::valarray<int> boundaryOffset;
    // Color flag
    static bool ignoreProperties;

    Lattice() = delete;
    Lattice(Lattice&) = delete;

    //Lattice(int order, int axisSize);
    static void InitLattice(int _order, int _axisSize, int _boundarySize = 5);

    static void SetFlags(bool _ignoreColors);

    // Add a new module
    static void AddModule(const Module& mod);

    // Add a new boundary
    static void AddBound(const std::valarray<int>& coords);

    static bool CheckConnected(int permitMissing = 0);

    // General Adjacency Check + Adjacency index helper function
    static std::vector<int> adjIndices;
    static void EdgeCheck(const Module& mod);
    static void SetAdjIndicesFromOffsets(const std::vector<std::valarray<int>>& offsets);

    // Cube Adjacency Check
    static void CubeEdgeCheck(const Module& mod);

    // Rhombic Dodecahedra Adjacency Check
    static void RDEdgeCheck(const Module& mod);

    // Update adjacency lists for two adjacent modules
    static void AddEdge(int modA, int modB);

    // Find articulation points / cut vertices using DFS
    static void APUtil(int u, std::vector<bool>& visited, std::vector<bool>& ap, std::vector<int>& parent, std::vector<int>& low, std::vector<int>& disc);

    // Build / Rebuild movableModules vector
    static void BuildMovableModules();

    static void BuildMovableModulesNonRec();

    // Get movable modules
    static const std::vector<Module*>& MovableModules();

    // Update lattice using a vector of non-static module information
    static void UpdateFromModuleInfo(const std::set<ModuleData>& moduleInfo);

    // Get non-static module information
    static std::set<ModuleData> GetModuleInfo();

    static int Order();

    static int AxisSize();

    static std::string ToString();

    friend class MoveManager;
};

#endif //MODULAR_ROBOTICS_LATTICE_H
