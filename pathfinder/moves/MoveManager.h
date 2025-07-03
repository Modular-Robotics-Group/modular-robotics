#ifndef MODULAR_ROBOTICS_MOVEMANAGER_H
#define MODULAR_ROBOTICS_MOVEMANAGER_H

#include <vector>
#include <unordered_map>
#include <valarray>
#include <nlohmann/json.hpp>
#include "../lattice/Lattice.h"
#include "Isometry.h"
#include "../search/ConfigurationSpace.h"

// Verbosity Constants (Don't change these)
#define MM_LOG_NONE 0
#define MM_LOG_MOVE_DEFS 1
#define MM_LOG_MOVE_CHECKS 2
/* Verbosity Configuration
 * NONE: No output from MoveManager
 * MOVE_DEFS: Output move def information
 * MOVE_CHECK: Output move def information and move check results
 */
#ifndef MOVEMANAGER_VERBOSE
#define MOVEMANAGER_VERBOSE MM_LOG_MOVE_DEFS
#endif
/* Bounds Checking Configuration
 * true: Moves always check to ensure they won't look out-of-bounds
 * false: Padding around the coordinate tensor is assumed to prevent any out-of-bounds checks from occuring
 */
#ifndef MOVEMANAGER_BOUNDS_CHECKS
#define MOVEMANAGER_BOUNDS_CHECKS false
#endif

namespace Move {
    enum State {
        NOCHECK = ' ',
        EMPTY = 'x',
        INITIAL = '?',
        FINAL = '!',
        STATIC = '#'
    };

    enum AnimType {
        INVALID_ANIM = -4,
        Z_SLIDE = -3,
        Y_SLIDE = -2,
        X_SLIDE = -1,
        GEN_SLIDE = 0,
        PIVOT_PX = 1,
        PIVOT_PY = 2,
        PIVOT_PZ = 3,
        PIVOT_NX = 4,
        PIVOT_NY = 5,
        PIVOT_NZ = 6,
        RD_PXPY = 12,
        RD_PXNY = 15,
        RD_NXPY = 42,
        RD_NXNY = 45,
        RD_PXPZ = 13,
        RD_PXNZ = 16,
        RD_NXPZ = 43,
        RD_NXNZ = 46,
        RD_PYPZ = 23,
        RD_PYNZ = 26,
        RD_NYPZ = 53,
        RD_NYNZ = 56,
        CTM_TRI_PXPY = 1012,
        CTM_TRI_PXNY = 1015,
        CTM_TRI_NXPY = 1042,
        CTM_TRI_NXNY = 1045,
        CTM_TRI_PXPZ = 1013,
        CTM_TRI_PXNZ = 1016,
        CTM_TRI_NXPZ = 1043,
        CTM_TRI_NXNZ = 1046,
        CTM_TRI_PYPZ = 1023,
        CTM_TRI_PYNZ = 1026,
        CTM_TRI_NYPZ = 1053,
        CTM_TRI_NYNZ = 1056
    };

    // For easily converting from string to enum
    const std::unordered_map<std::string, AnimType> StrAnimMap = {
            {"z-slide", Z_SLIDE},
            {"y-slide", Y_SLIDE},
            {"x-slide", X_SLIDE},
            {"slide", GEN_SLIDE},
            {"pivot+x", PIVOT_PX},
            {"pivot+y", PIVOT_PY},
            {"pivot+z", PIVOT_PZ},
            {"pivot-x", PIVOT_NX},
            {"pivot-y", PIVOT_NY},
            {"pivot-z", PIVOT_NZ},
            {"rd+x+y", RD_PXPY},
            {"rd+x-y", RD_PXNY},
            {"rd-x+y", RD_NXPY},
            {"rd-x-y", RD_NXNY},
            {"rd+x+z", RD_PXPZ},
            {"rd+x-z", RD_PXNZ},
            {"rd-x+z", RD_NXPZ},
            {"rd-x-z", RD_NXNZ},
            {"rd+y+z", RD_PYPZ},
            {"rd+y-z", RD_PYNZ},
            {"rd-y+z", RD_NYPZ},
            {"rd-y-z", RD_NYNZ},
            {"ctm-tri+x+y", CTM_TRI_PXPY},
            {"ctm-tri+x-y", CTM_TRI_PXNY},
            {"ctm-tri-x+y", CTM_TRI_NXPY},
            {"ctm-tri-x-y", CTM_TRI_NXNY},
            {"ctm-tri+x+z", CTM_TRI_PXPZ},
            {"ctm-tri+x-z", CTM_TRI_PXNZ},
            {"ctm-tri-x+z", CTM_TRI_NXPZ},
            {"ctm-tri-x-z", CTM_TRI_NXNZ},
            {"ctm-tri+y+z", CTM_TRI_PYPZ},
            {"ctm-tri+y-z", CTM_TRI_PYNZ},
            {"ctm-tri-y+z", CTM_TRI_NYPZ},
            {"ctm-tri-y-z", CTM_TRI_NYNZ}
    };



    void RotateAnim(AnimType& anim, int a, int b);

    // For easily reflecting move types
    const std::unordered_map<AnimType, std::vector<AnimType>> AnimReflectionMap = {
            {Z_SLIDE, {Z_SLIDE, Z_SLIDE, Z_SLIDE}},
            {Y_SLIDE, {Y_SLIDE, Y_SLIDE, Y_SLIDE}},
            {X_SLIDE, {X_SLIDE, X_SLIDE, X_SLIDE}},
            {GEN_SLIDE, {GEN_SLIDE, GEN_SLIDE, GEN_SLIDE}},
            {PIVOT_PX, {PIVOT_NX, PIVOT_PX, PIVOT_PX}},
            {PIVOT_PY, {PIVOT_PY, PIVOT_NY, PIVOT_PY}},
            {PIVOT_PZ, {PIVOT_PZ, PIVOT_PZ, PIVOT_NZ}},
            {PIVOT_NX, {PIVOT_PX, PIVOT_NX, PIVOT_NX}},
            {PIVOT_NY, {PIVOT_NY, PIVOT_PY, PIVOT_NY}},
            {PIVOT_NZ, {PIVOT_NZ, PIVOT_NZ, PIVOT_PZ}},
            {RD_PXPY, {RD_NXPY, RD_PXNY, RD_PXPY}},
            {RD_PXNY, {RD_NXNY, RD_PXPY, RD_PXNY}},
            {RD_NXPY, {RD_PXPY, RD_NXNY, RD_NXPY}},
            {RD_NXNY, {RD_PXNY, RD_NXPY, RD_NXNY}},
            {RD_PXPZ, {RD_NXPZ, RD_PXPZ, RD_PXNZ}},
            {RD_PXNZ, {RD_NXNZ, RD_PXNZ, RD_PXPZ}},
            {RD_NXPZ, {RD_PXPZ, RD_NXPZ, RD_NXNZ}},
            {RD_NXNZ, {RD_PXNZ, RD_NXNZ, RD_NXPZ}},
            {RD_PYPZ, {RD_PYPZ, RD_NYPZ, RD_PYNZ}},
            {RD_PYNZ, {RD_PYNZ, RD_NYNZ, RD_PYPZ}},
            {RD_NYPZ, {RD_NYPZ, RD_PYPZ, RD_NYNZ}},
            {RD_NYNZ, {RD_NYNZ, RD_PYNZ, RD_NYPZ}},
            {CTM_TRI_PXPY, {CTM_TRI_NXPY, CTM_TRI_PXNY, CTM_TRI_PXPY}},
            {CTM_TRI_PXNY, {CTM_TRI_NXNY, CTM_TRI_PXPY, CTM_TRI_PXNY}},
            {CTM_TRI_NXPY, {CTM_TRI_PXPY, CTM_TRI_NXNY, CTM_TRI_NXPY}},
            {CTM_TRI_NXNY, {CTM_TRI_PXNY, CTM_TRI_NXPY, CTM_TRI_NXNY}},
            {CTM_TRI_PXPZ, {CTM_TRI_NXPZ, CTM_TRI_PXPZ, CTM_TRI_PXNZ}},
            {CTM_TRI_PXNZ, {CTM_TRI_NXNZ, CTM_TRI_PXNZ, CTM_TRI_PXPZ}},
            {CTM_TRI_NXPZ, {CTM_TRI_PXPZ, CTM_TRI_NXPZ, CTM_TRI_NXNZ}},
            {CTM_TRI_NXNZ, {CTM_TRI_PXNZ, CTM_TRI_NXNZ, CTM_TRI_NXPZ}},
            {CTM_TRI_PYPZ, {CTM_TRI_PYPZ, CTM_TRI_NYPZ, CTM_TRI_PYNZ}},
            {CTM_TRI_PYNZ, {CTM_TRI_PYNZ, CTM_TRI_NYNZ, CTM_TRI_PYPZ}},
            {CTM_TRI_NYPZ, {CTM_TRI_NYPZ, CTM_TRI_PYPZ, CTM_TRI_NYNZ}},
            {CTM_TRI_NYNZ, {CTM_TRI_NYNZ, CTM_TRI_PYNZ, CTM_TRI_NYPZ}}
    };
}

class MovePropertyCheck : public ITransformable {
private:
    std::valarray<int> modOffset;
    std::string propertyName;
    PropertyFunctionType functionType;
    PropertyFunction propertyFunction;
    nlohmann::basic_json<> args;
    bool allArgsRotate;
    bool allArgsReflect;
    std::vector<int> rotateArgIndices;
    std::vector<int> reflectArgIndices;
    bool invertReflection;
    bool reflectOnNormalRotation;
public:
    MovePropertyCheck(const nlohmann::basic_json<>& propertyCheckDef);

    bool DoCheck(const std::valarray<int>& checkFromPosition) const;

    MovePropertyCheck* MakeCopy() const override;

    void Rotate(int a, int b) override;

    void Reflect(int index) override;
};

class MovePropertyUpdate : public ITransformable {
private:
    std::valarray<int> modOffset;
    std::string propertyName;
    PropertyFunctionType functionType;
    PropertyFunction propertyFunction;
    nlohmann::basic_json<> args;
    bool allArgsRotate;
    bool allArgsReflect;
    std::vector<int> rotateArgIndices;
    std::vector<int> reflectArgIndices;
    bool invertReflection;
    bool reflectOnNormalRotation;
public:
    MovePropertyUpdate(const nlohmann::basic_json<>& propertyUpdateDef);

    void DoUpdate(const std::valarray<int>& updateFromPosition) const;

    MovePropertyUpdate* MakeCopy() const override;

    void Rotate(int a, int b) override;

    void Reflect(int index) override;
};

class MoveBase : public ITransformable {
protected:
    // each pair represents a coordinate offset to check and whether a module should be there or not
    std::vector<std::pair<std::valarray<int>, bool>> moves;
    // any property checks that a move must pass in order to be made are stored here
    std::vector<MovePropertyCheck> propertyChecks;
    // any property updates that a move must make in order to be made are stored here
    std::vector<MovePropertyUpdate> propertyUpdates;
    // bounds ex: {(2, 1), (0, 1)} would mean bounds extend from -2 to 1 on x-axis and 0 to 1 on y-axis
    std::vector<std::pair<int, int>> bounds;
    std::valarray<int> initPos, finalPos;
    std::vector<std::pair<Move::AnimType, std::valarray<int>>> animSequence;
public:
    // Load in move info from a given JSON move definition
    virtual void InitMove(const nlohmann::basic_json<>& moveDef) = 0;
    // Check to see if move is possible for a given module
    virtual bool MoveCheck(const CoordTensor<int>& tensor, const Module& mod) = 0;
    // Check to see if free space requirements are satisfied at a given position
    virtual bool FreeSpaceCheck(const CoordTensor<int>& tensor, const std::valarray<int>& coords);
    // Check to see if move is possible from a given position assuming some non-static modules would help
    virtual bool FreeSpaceCheckHelpLimit(const CoordTensor<int>& tensor, const std::valarray<int>& coords, const CoordTensor<int>& helpTensor, int help);
    // Apply updates to a module's properties based on the move
    void ApplyUpdates(const Module& mod) const;

    [[nodiscard]]
    MoveBase* MakeCopy() const override = 0;

    void Rotate(int a, int b) override;

    void Reflect(int index) override;

    [[nodiscard]]
    const std::valarray<int>& MoveOffset() const;

    [[nodiscard]]
    const std::vector<std::pair<Move::AnimType, std::valarray<int>>>& AnimSequence() const;

    virtual bool operator==(const MoveBase& rhs) const;

    friend class MoveManager;

    friend bool ParallelMoveCheck(CoordTensor<int>& freeSpace, const Module& mod, const MoveBase* move);
};

class Move2d final : public MoveBase {
public:
    Move2d();
    [[nodiscard]]
    MoveBase* MakeCopy() const override;
    void InitMove(const nlohmann::basic_json<>& moveDef) override;
    bool MoveCheck(const CoordTensor<int>& tensor, const Module& mod) override;
};

class Move3d final : public MoveBase {
public:
    Move3d();
    [[nodiscard]]
    MoveBase* MakeCopy() const override;
    void InitMove(const nlohmann::basic_json<>& moveDef) override;
    bool MoveCheck(const CoordTensor<int>& tensor, const Module& mod) override;
};

class MoveManager {
private:
    // Vector containing every move
    static std::vector<MoveBase*> _moves;
    // Map from offset to move
    static CoordTensor<std::vector<MoveBase*>> _movesByOffset;
    // Vector containing only generated moves
    static std::vector<MoveBase*> _movesToFree;
    // Vector containing all move offsets
    static std::vector<std::valarray<int>> _offsets;
    // Int representing maximum (Chebyshev) distance a move can cover
    static int _maxDist;
public:
    // Never instantiate MoveManager
    MoveManager() = delete;
    MoveManager(const MoveManager&) = delete;

    // Preprocess moves
    static void PreprocessMoves(const std::string& movePath = "Moves/");

    // Initialize Move Manager
    static void InitMoveManager(int order, int maxDistance);

    // Move a module
    static void MoveModule(Module& mod, const MoveBase* move);

    // Reverse a move
    static void UnMoveModule(Module& mod, const MoveBase* move);

    // Generate multiple moves from a single move definition
    static void GenerateMovesFrom(MoveBase* origMove);

    // Register a move without generating additional moves
    static void RegisterSingleMove(MoveBase* move);

    static void RegisterAllMoves(const std::string& movePath = "Moves/");

    // Get what moves can be made by a module
    static std::vector<MoveBase*> CheckAllMoves(CoordTensor<int>& tensor, Module& mod);

    static std::vector<std::set<ModuleData>> MakeAllParallelMoves(std::unordered_set<HashedState>& visited);

    static std::vector<MoveBase*> CheckAllMovesAndConnectivity(CoordTensor<int>& tensor, Module& mod);

    // Get a pair containing which module has to make what move in order to reach an adjacent state
    static std::pair<Module*, MoveBase*> FindMoveToState(const std::set<ModuleData>& modData);

    // Get a vector of pairs of modules to move and moves to make in order to reach an adjacent state
    static std::vector<std::pair<Module*, MoveBase*>> FindParallelMovesToState(const std::set<ModuleData>& modData);

    // Get maximum Chebyshev distance a move can cover
    static const int MaxDistance();

    friend class MoveOffsetHeuristicCache;

    friend class MoveOffsetPropertyHeuristicCache;
};

#endif //MODULAR_ROBOTICS_MOVEMANAGER_H
