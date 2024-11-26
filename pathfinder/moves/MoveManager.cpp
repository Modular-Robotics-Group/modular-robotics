#include <string>
#include <fstream>
#include <filesystem>
#include <execution>
#include "MoveManager.h"
#include "../search/ConfigurationSpace.h"

void Move::RotateAnim(Move::AnimType& anim, const int a, const int b) {
    // For easily rotating move types
    static std::unordered_map<AnimType, std::vector<int>> AnimToOffset = {
            {Z_SLIDE, {0, 0, 1}},
            {Y_SLIDE, {0, 1, 0}},
            {X_SLIDE, {1, 0, 0}},
            {GEN_SLIDE, {0, 0, 0}},
            {PIVOT_PX, { 1,  0,  0}},
            {PIVOT_PY, { 0,  1,  0}},
            {PIVOT_PZ, { 0,  0,  1}},
            {PIVOT_NX, {-1,  0,  0}},
            {PIVOT_NY, { 0, -1,  0}},
            {PIVOT_NZ, { 0,  0, -1}},
            {RD_PXPY, { 1,  1,  0}},
            {RD_PXNY, { 1, -1,  0}},
            {RD_NXPY, {-1,  1,  0}},
            {RD_NXNY, {-1, -1,  0}},
            {RD_PXPZ, { 1,  0,  1}},
            {RD_PXNZ, { 1,  0, -1}},
            {RD_NXPZ, {-1,  0,  1}},
            {RD_NXNZ, {-1,  0, -1}},
            {RD_PYPZ, { 0,  1,  1}},
            {RD_PYNZ, { 0,  1, -1}},
            {RD_NYPZ, { 0, -1,  1}},
            {RD_NYNZ, { 0, -1, -1}}
    };

    static std::map<std::vector<int>, AnimType> OffsetToSlideAnim = {
            {{0, 0, 1}, Z_SLIDE},
            {{0, 1, 0}, Y_SLIDE},
            {{1, 0, 0}, X_SLIDE},
            {{0, 0, 0}, GEN_SLIDE}
    };

    static std::map<std::vector<int>, AnimType> OffsetToAnim = {
            {{ 1,  0,  0}, PIVOT_PX},
            {{ 0,  1,  0}, PIVOT_PY},
            {{ 0,  0,  1}, PIVOT_PZ},
            {{-1,  0,  0}, PIVOT_NX},
            {{ 0, -1,  0}, PIVOT_NY},
            {{ 0,  0, -1}, PIVOT_NZ},
            {{ 1,  1,  0}, RD_PXPY},
            {{ 1, -1,  0}, RD_PXNY},
            {{-1,  1,  0}, RD_NXPY},
            {{-1, -1,  0}, RD_NXNY},
            {{ 1,  0,  1}, RD_PXPZ},
            {{ 1,  0, -1}, RD_PXNZ},
            {{-1,  0,  1}, RD_NXPZ},
            {{-1,  0, -1}, RD_NXNZ},
            {{ 0,  1,  1}, RD_PYPZ},
            {{ 0,  1, -1}, RD_PYNZ},
            {{ 0, -1,  1}, RD_NYPZ},
            {{ 0, -1, -1}, RD_NYNZ}
    };

    auto offset = AnimToOffset[anim];
    std::swap(offset[a], offset[b]);
    if (anim > GEN_SLIDE) {
        anim = OffsetToAnim[offset];
    } else {
        anim = OffsetToSlideAnim[offset];
    }
}

MovePropertyCheck::MovePropertyCheck(const nlohmann::basic_json<> &propertyCheckDef): propertyFunction() {
    bool isInstance = false, hasArguments = false;
    if (propertyCheckDef.contains("module")) {
        std::vector<int> offsetVec = propertyCheckDef["module"].get<std::vector<int>>();
        if (offsetVec.size() != Lattice::Order()) {
            offsetVec.resize(Lattice::Order(), 0);
        }
        modOffset = std::valarray<int>(offsetVec.data(), offsetVec.size());
        isInstance = true;
    }
    if (propertyCheckDef.contains("property")) {
        propertyName = propertyCheckDef["property"].get<std::string>();
        if (!isInstance) {
            std::cerr << "Property checks should always specify module offset to check! Defaulting to moving module." << std::endl;
            modOffset = std::valarray<int>(0, Lattice::Order());
        }
        isInstance = true;
    }
    if (propertyCheckDef.contains("args")) {
        args = propertyCheckDef["args"];
        hasArguments = true;
    }
    if (propertyCheckDef.contains("rotateArgs")) {
        if (propertyCheckDef["rotateArgs"].is_array()) {
            allArgsRotate = false;
            rotateArgIndices = propertyCheckDef["rotateArgs"].get<std::vector<int>>();
        } else {
            allArgsRotate = propertyCheckDef["rotateArgs"];
        }
    }
    if (propertyCheckDef.contains("reflectArgs")) {
        if (propertyCheckDef["reflectArgs"].is_array()) {
            allArgsReflect = false;
            reflectArgIndices = propertyCheckDef["reflectArgs"].get<std::vector<int>>();
        } else {
            allArgsReflect = propertyCheckDef["reflectArgs"];
        }
    }
    if (isInstance) {
        if (hasArguments) {
            propertyFunction.argInstanceFunction = ModuleProperties::ArgInstFunctions()[propertyCheckDef["function"]];
            functionType = INSTANCE_ARGS;
        } else {
            propertyFunction.instanceFunction = ModuleProperties::InstFunctions()[propertyCheckDef["function"]];
            functionType = INSTANCE_NOARGS;
        }
    } else if (hasArguments) {
        propertyFunction.argStaticFunction = ModuleProperties::ArgFunctions()[propertyCheckDef["function"]];
        functionType = STATIC_ARGS;
    } else {
        propertyFunction.staticFunction = ModuleProperties::Functions()[propertyCheckDef["function"]];
        functionType = STATIC_NOARGS;
    }
}

bool MovePropertyCheck::DoCheck(const std::valarray<int>& checkFromPosition) const {
    switch (functionType) {
        case STATIC_NOARGS:
            return ModuleProperties::CallFunction<bool>(propertyFunction.staticFunction);
        case INSTANCE_NOARGS: {
            const auto modIdToCheck = Lattice::coordTensor[checkFromPosition + modOffset];
            const auto prop = ModuleIdManager::GetModule(modIdToCheck).properties.Find(propertyName);
            return prop->CallFunction<bool>(propertyFunction.instanceFunction);
        }
        case STATIC_ARGS:
            return ModuleProperties::CallFunction<bool>(propertyFunction.argStaticFunction, args);
        case INSTANCE_ARGS: {
            const auto modIdToCheck = Lattice::coordTensor[checkFromPosition + modOffset];
            const auto prop = ModuleIdManager::GetModule(modIdToCheck).properties.Find(propertyName);
            return prop->CallFunction<bool>(propertyFunction.argInstanceFunction, args);
        }
        default:
            return false;
    }
}

MovePropertyCheck *MovePropertyCheck::MakeCopy() const {
    const auto copy = new MovePropertyCheck(*this);
    *copy = *this;
    return copy;
}

void MovePropertyCheck::Rotate(int a, int b) {
    std::swap(modOffset[a], modOffset[b]);
    if (allArgsRotate) {
        for (auto& arg : args) {
            if (arg.is_array()) {
                std::swap(arg[a], arg[b]);
            }
        }
    } else for (const auto i : rotateArgIndices) {
        std::swap(args[i][a], args[i][b]);
    }
}

void MovePropertyCheck::Reflect(int index) {
    modOffset[index] *= -1;
    if (allArgsReflect) {
        for (auto& arg : args) {
            if (arg.is_array()) {
                arg[index] = -static_cast<int>(arg[index]);
            }
        }
    } else for (const auto i : reflectArgIndices) {
        args[i][index] = -static_cast<int>(args[i][index]);
    }
}

MovePropertyUpdate::MovePropertyUpdate(const nlohmann::basic_json<> &propertyUpdateDef): propertyFunction() {
    bool isInstance = false, hasArguments = false;
    if (propertyUpdateDef.contains("module")) {
        std::vector<int> offsetVec = propertyUpdateDef["module"].get<std::vector<int>>();
        if (offsetVec.size() != Lattice::Order()) {
            offsetVec.resize(Lattice::Order(), 0);
        }
        modOffset = std::valarray<int>(offsetVec.data(), offsetVec.size());
        isInstance = true;
    }
    if (propertyUpdateDef.contains("property")) {
        propertyName = propertyUpdateDef["property"].get<std::string>();
        if (!isInstance) {
            std::cerr << "Property updates should always specify module offset to update! Defaulting to moving module." << std::endl;
            modOffset = std::valarray<int>(0, Lattice::Order());
        }
        isInstance = true;
    }
    if (propertyUpdateDef.contains("args")) {
        args = propertyUpdateDef["args"];
        hasArguments = true;
    }
    if (propertyUpdateDef.contains("rotateArgs")) {
        if (propertyUpdateDef["rotateArgs"].is_array()) {
            allArgsRotate = false;
            rotateArgIndices = propertyUpdateDef["rotateArgs"].get<std::vector<int>>();
        } else {
            allArgsRotate = propertyUpdateDef["rotateArgs"];
        }
    }
    if (propertyUpdateDef.contains("reflectArgs")) {
        if (propertyUpdateDef["reflectArgs"].is_array()) {
            allArgsReflect = false;
            reflectArgIndices = propertyUpdateDef["reflectArgs"].get<std::vector<int>>();
        } else {
            allArgsReflect = propertyUpdateDef["reflectArgs"];
        }
    }
    if (isInstance) {
        if (hasArguments) {
            propertyFunction.argInstanceFunction = ModuleProperties::ArgInstFunctions()[propertyUpdateDef["function"]];
            functionType = INSTANCE_ARGS;
        } else {
            propertyFunction.instanceFunction = ModuleProperties::InstFunctions()[propertyUpdateDef["function"]];
            functionType = INSTANCE_NOARGS;
        }
    } else if (hasArguments) {
        propertyFunction.argStaticFunction = ModuleProperties::ArgFunctions()[propertyUpdateDef["function"]];
        functionType = STATIC_ARGS;
    } else {
        propertyFunction.staticFunction = ModuleProperties::Functions()[propertyUpdateDef["function"]];
        functionType = STATIC_NOARGS;
    }
}

void MovePropertyUpdate::DoUpdate(const std::valarray<int>& updateFromPosition) const {
    switch (functionType) {
        case STATIC_NOARGS: {
            ModuleProperties::CallFunction(propertyFunction.staticFunction);
            break;
        }
        case INSTANCE_NOARGS: {
            const auto modIdToCheck = Lattice::coordTensor[updateFromPosition + modOffset];
            const auto prop = ModuleIdManager::GetModule(modIdToCheck).properties.Find(propertyName);
            prop->CallFunction(propertyFunction.instanceFunction);
            break;
        }
        case STATIC_ARGS: {
            ModuleProperties::CallFunction(propertyFunction.argStaticFunction, args);
            break;
        }
        case INSTANCE_ARGS: {
            const auto modIdToCheck = Lattice::coordTensor[updateFromPosition + modOffset];
            const auto prop = ModuleIdManager::GetModule(modIdToCheck).properties.Find(propertyName);
            prop->CallFunction(propertyFunction.argInstanceFunction, args);
            break;
        }
    }
}

MovePropertyUpdate *MovePropertyUpdate::MakeCopy() const {
    const auto copy = new MovePropertyUpdate(*this);
    *copy = *this;
    return copy;
}

void MovePropertyUpdate::Rotate(int a, int b) {
    std::swap(modOffset[a], modOffset[b]);
    if (allArgsRotate) {
        for (auto& arg : args) {
            if (arg.is_array()) {
                std::swap(arg[a], arg[b]);
            }
        }
    } else for (const auto i : rotateArgIndices) {
        std::swap(args[i][a], args[i][b]);
    }
}

void MovePropertyUpdate::Reflect(int index) {
    modOffset[index] *= -1;
    if (allArgsReflect) {
        for (auto& arg : args) {
            if (arg.is_array()) {
                arg[index] = -static_cast<int>(arg[index]);
            }
        }
    } else for (const auto i : reflectArgIndices) {
        args[i][index] = -static_cast<int>(args[i][index]);
    }
}

bool MoveBase::FreeSpaceCheck(const CoordTensor<int>& tensor, const std::valarray<int>& coords) {
    return std::all_of(moves.begin(), moves.end(), [&coords = std::as_const(coords), &tensor = std::as_const(tensor)](auto& move) {
        if (!move.second && (tensor[coords + move.first] > FREE_SPACE)) {
            return false;
        }
        if (move.second && (tensor[coords + move.first] == OUT_OF_BOUNDS)) {
            return false;
        }
        return true;
    });
}

int GetChebyshevDistance(const std::valarray<int>& a, const std::valarray<int>& b) {
    std::valarray<int> dist = a + b;
    return *std::ranges::max_element(dist);
}

int GetManhattanDistance(const std::valarray<int>& a, const std::valarray<int>& b) {
    int result = 0;
    for (auto val : std::valarray<int>(a + b)) {
        result += std::abs(val);
    }
    return result;
}

bool MoveBase::FreeSpaceCheckHelpLimit(const CoordTensor<int>& tensor, const std::valarray<int>& coords, const CoordTensor<int>& helpTensor, int help) {
    int helpUsed = 0;
    int helpersRequested = 0;
    return std::all_of(moves.begin(), moves.end(), [&](auto& move) {
        if (!move.second && (tensor[coords + move.first] > FREE_SPACE)) {
            return false;
        }
        if (move.second && tensor[coords + move.first] <= FREE_SPACE) {
            helpUsed = std::max(helpUsed, helpTensor[coords + move.first]);
            if (!ModuleIdManager::StaticModules().empty()) {
                helpersRequested++;
                helpUsed = std::max(helpUsed, helpersRequested);
            }
            if (tensor[coords + move.first] != OUT_OF_BOUNDS && helpUsed < help) {
                return true;
            }
            return false;
        }
        return true;
    });
}

void MoveBase::ApplyUpdates(const Module& mod) const {
    for (const auto& update : propertyUpdates) {
        update.DoUpdate(mod.coords);
    }
}

void MoveBase::Rotate(const int a, const int b) {
    std::swap(initPos[a], initPos[b]);
    std::swap(finalPos[a], finalPos[b]);
    std::swap(bounds[a], bounds[b]);
    for (auto&[offset, check] : moves) {
        std::swap(offset[a], offset[b]);
    }
    for (auto&[type, offset] : animSequence) {
        std::swap(offset[a], offset[b]);
        Move::RotateAnim(type, a, b);
    }
    for (auto& propertyCheck : propertyChecks) {
        propertyCheck.Rotate(a, b);
    }
}

void MoveBase::Reflect(const int index) {
    initPos[index] *= -1;
    finalPos[index] *= -1;
    std::swap(bounds[index].first, bounds[index].second);
    for (auto&[offset, check] : moves) {
        offset[index] *= -1;
    }
    for (auto&[type, offset] : animSequence) {
        type = Move::AnimReflectionMap.at(type)[index];
        offset[index] *= -1;
    }
    for (auto& propertyCheck : propertyChecks) {
        propertyCheck.Reflect(index);
    }
}

const std::valarray<int>& MoveBase::MoveOffset() const {
    return finalPos;
}

const std::vector<std::pair<Move::AnimType, std::valarray<int>>>& MoveBase::AnimSequence() const {
    return animSequence;
}

bool MoveBase::operator==(const MoveBase& rhs) const {
    std::valarray<bool> valArrComparison = finalPos == rhs.finalPos;
    for (const auto result : valArrComparison) {
        if (!result) {
            return false;
        }
    }
    if (moves.size() != rhs.moves.size()) {
        return false;
    }
    for (auto it = moves.begin(), it2 = rhs.moves.begin(); it != moves.end(); ++it, ++it2) {
        valArrComparison = it->first == it2->first;
        for (const auto result : valArrComparison) {
            if (!result) {
                return false;
            }
        }
        if (it->second != it->second) {
            return false;
        }
    }
    return true;
}


Move2d::Move2d() {
    order = 2;
    bounds.resize(order, {0, 0});
}

MoveBase* Move2d::MakeCopy() const {
    const auto copy = new Move2d();
    *copy = *this;
    return copy;
}

void Move2d::InitMove(const nlohmann::basic_json<>& moveDef) {
    int x = 0, y = 0;
    std::valarray<int> maxBounds = {0, 0};
    for (const std::string line : moveDef["def"][0]) {
        for (const char c : line) {
            switch (c) {
                default:
                    DEBUG("Unrecognized Move: " << c << std::endl);
                case Move::NOCHECK:
                    x++;
                    continue;
                case Move::FINAL:
                    finalPos = {x, y};
                case Move::EMPTY:
                    moves.push_back({{x, y}, false});
                    break;
                case Move::STATIC:
                    moves.push_back({{x, y}, true});
                    break;
                case Move::INITIAL:
                    initPos = {x, y};
                    bounds = {{x, 0}, {y, 0}};
                    if (finalPos.size() == 0) {
                        finalPos = {x, y};
                    }
                    break;
            }
            if (x > maxBounds[0]) {
                maxBounds[0] = x;
            }
            if (y > maxBounds[1]) {
                maxBounds[1] = y;
            }
            x++;
        }
        x = 0;
        y++;
    }
    for (auto&[offset, check] : moves) {
        offset -= initPos;
#if MOVEMANAGER_VERBOSE > MM_LOG_NONE
        DEBUG("Check Offset: " << offset[0] << ", " << offset[1] << (check ? " Static" : " Empty") << std::endl);
#endif
    }
    finalPos -= initPos;
#if MOVEMANAGER_VERBOSE > MM_LOG_NONE
    DEBUG("Move Offset: " << finalPos[0] << ", " << finalPos[1] << std::endl);
#endif
    maxBounds -= initPos;
    bounds[0].second = maxBounds[0];
    bounds[1].second = maxBounds[1];
    // Set up property checks
    if (moveDef.contains("propertyChecks")) {
        for (const auto& check : moveDef["propertyChecks"]) {
            propertyChecks.push_back(check);
        }
    }
    // Set up property updates
    if (moveDef.contains("propertyUpdates")) {
        for (const auto& update : moveDef["propertyUpdates"]) {
            propertyUpdates.push_back(update);
        }
    }
    // Set up animation data
    for (const auto& animDef : moveDef["animSeq"]) {
        Move::AnimType animType = Move::StrAnimMap.at(animDef[0]);
        std::valarray<int> animOffset = animDef[1];
        animSequence.emplace_back(animType, animOffset);
    }
    // Generate move permutations if necessary (it pretty much always is)
    if (moveDef["permGen"] == true) {
        MoveManager::GenerateMovesFrom(this);
    } else {
        MoveManager::RegisterSingleMove(this);
    }
}

bool Move2d::MoveCheck(const CoordTensor<int>& tensor, const Module& mod) {
    // Bounds checking
#if MOVEMANAGER_BOUNDS_CHECKS
    for (int i = 0; i < order; i++) {
        if (mod.coords[i] - bounds[i].first < 0 || mod.coords[i] + bounds[i].second >= Lattice::AxisSize()) {
            return false;
        }
    }
#endif
    // Move Check
    const auto result = std::all_of(moves.begin(), moves.end(), [&mod = std::as_const(mod), &tensor = std::as_const(tensor)](auto& move) {
        if ((tensor[mod.coords + move.first] < 0) == move.second) {
            return false;
        }
        return true;
    });
    if (result && !Lattice::ignoreProperties) for (const auto& check : propertyChecks) {
        if (!check.DoCheck(mod.coords)) {
            return false;
        }
    }
    return result;
}

Move3d::Move3d() {
    order = 3;
    bounds.resize(3, {0, 0});
}

MoveBase* Move3d::MakeCopy() const {
    const auto copy = new Move3d();
    *copy = *this;
    return copy;
}

void Move3d::InitMove(const nlohmann::basic_json<>& moveDef) {
    int x = 0, y = 0, z = 0;
    std::valarray<int> maxBounds = {0, 0, 0};
    for (const std::vector<std::string> slice : moveDef["def"]) {
        for (const auto& line : slice) {
            for (const auto c: line) {
                switch (c) {
                    default:
                        DEBUG("Unrecognized Move: " << c << std::endl);
                    case Move::NOCHECK:
                        x++;
                        continue;
                    case Move::FINAL:
                        finalPos = {x, y, z};
                    case Move::EMPTY:
                        moves.push_back({{x, y, z}, false});
                        break;
                    case Move::STATIC:
                        moves.push_back({{x, y, z}, true});
                        break;
                    case Move::INITIAL:
                        initPos = {x, y, z};
                        bounds = {{x, 0},
                                  {y, 0},
                                  {z, 0}};
                        if (finalPos.size() == 0) {
                            finalPos = {x, y, z};
                        }
                        break;
                }
                if (x > maxBounds[0]) {
                    maxBounds[0] = x;
                }
                if (y > maxBounds[1]) {
                    maxBounds[1] = y;
                }
                if (z > maxBounds[2]) {
                    maxBounds[2] = z;
                }
                x++;
            }
            x = 0;
            y++;
        }
        y = 0;
        z++;
    }
    for (auto&[offset, check] : moves) {
        offset -= initPos;
#if MOVEMANAGER_VERBOSE > MM_LOG_NONE
        DEBUG("Check Offset: " << offset[0] << ", " << offset[1] << ", " << offset[2] << (check ? " Static" : " Empty") << std::endl);
#endif
    }
    finalPos -= initPos;
#if MOVEMANAGER_VERBOSE > MM_LOG_NONE
    DEBUG("Move Offset: " << finalPos[0] << ", " << finalPos[1] << ", " << finalPos[2] << std::endl);
#endif
    maxBounds -= initPos;
    bounds[0].second = maxBounds[0];
    bounds[1].second = maxBounds[1];
    bounds[2].second = maxBounds[2];
    // Set up property checks
    if (moveDef.contains("propertyChecks")) {
        for (const auto& check : moveDef["propertyChecks"]) {
            propertyChecks.push_back(check);
        }
    }
    // Set up property updates
    if (moveDef.contains("propertyUpdates")) {
        for (const auto& update : moveDef["propertyUpdates"]) {
            propertyUpdates.push_back(update);
        }
    }
    // Set up animation data
    if (moveDef.contains("animSeq") == true) {
        for (const auto& animDef : moveDef["animSeq"]) {
            Move::AnimType animType = Move::StrAnimMap.at(animDef[0]);
            std::valarray<int> animOffset = animDef[1];
            animSequence.emplace_back(animType, animOffset);
        }
    }
    // Generate move permutations if necessary (it pretty much always is)
    if (moveDef.contains("PermGen") == false || moveDef["permGen"] == true) {
        MoveManager::GenerateMovesFrom(this);
    } else {
        MoveManager::RegisterSingleMove(this);
    }
}

bool Move3d::MoveCheck(const CoordTensor<int>& tensor, const Module& mod) {
    // Bounds checking
#if MOVEMANAGER_BOUNDS_CHECKS
    for (int i = 0; i < order; i++) {
        if (mod.coords[i] - bounds[i].first < 0 || mod.coords[i] + bounds[i].second >= tensor.AxisSize()) {
            return false;
        }
    }
#endif
    // Move Check
    const auto result = std::all_of(moves.begin(), moves.end(), [&mod = std::as_const(mod), &tensor = std::as_const(tensor)](auto& move) {
        if ((tensor[mod.coords + move.first] < 0) == move.second) {
            return false;
        }
        return true;
    });
    if (result && !Lattice::ignoreProperties) for (const auto& check : propertyChecks) {
        if (!check.DoCheck(mod.coords)) {
            return false;
        }
    }
    return result;
}

std::vector<MoveBase*> MoveManager::_moves;
CoordTensor<std::vector<MoveBase*>> MoveManager::_movesByOffset(1, 1, {});
std::vector<std::valarray<int>> MoveManager::_offsets;

void MoveManager::InitMoveManager(const int order, const int maxDistance) {
    _movesByOffset = std::move(CoordTensor<std::vector<MoveBase*>>(order, 2 * maxDistance,
            {}, std::valarray<int>(maxDistance, order)));
}

void MoveManager::MoveModule(Module& mod, const MoveBase* move) {
    if (!ModuleProperties::IsReversing() && !Lattice::ignoreProperties) {
        move->ApplyUpdates(mod);
    }
    Lattice::ClearAdjacencies(mod.id);
    Lattice::coordTensor[mod.coords] = FREE_SPACE;
    mod.coords += ModuleProperties::IsReversing() ? -move->MoveOffset() : move->MoveOffset();
    Lattice::coordTensor[mod.coords] = mod.id;
#if LATTICE_RD_EDGECHECK
    Lattice::RDEdgeCheck(mod);
#else
    Lattice::EdgeCheck(mod);
#endif
    if (ModuleProperties::IsReversing() && !Lattice::ignoreProperties) {
        move->ApplyUpdates(mod);
    }
}

void MoveManager::UnMoveModule(Module &mod, const MoveBase *move) {
    ModuleProperties::ToggleReverse();
    MoveModule(mod, move);
    ModuleProperties::ToggleReverse();
}

void MoveManager::GenerateMovesFrom(MoveBase* origMove) {
    auto list = Isometry::GenerateTransforms(origMove);
#if MOVEMANAGER_VERBOSE > MM_LOG_NONE
    DEBUG("Generated " << list.size() << " moves from initial definition." << std::endl);
    int dupesAvoided = 0;
#endif
    for (const auto move: list) {
        if (std::none_of(_moves.begin(), _moves.end(), [&move](auto& existingMove) {
            return *existingMove == *dynamic_cast<MoveBase*>(move);
        })) {
            _moves.push_back(dynamic_cast<MoveBase*>(move));
        } else {
#if MOVEMANAGER_VERBOSE > MM_LOG_NONE
            dupesAvoided++;
#endif
        }
    }
#if MOVEMANAGER_VERBOSE > MM_LOG_NONE
    DEBUG("Registered " << list.size() - dupesAvoided << '/' << list.size() << " generated moves." << std::endl);
    DEBUG("Duplicate moves avoided: " << dupesAvoided << std::endl);
#endif
    // Add move to offset map
    for (auto move : _moves) {
        if (_movesByOffset[move->finalPos].empty()) {
            _offsets.push_back(move->finalPos);
        }
        _movesByOffset[move->finalPos].push_back(move);
    }
}

void MoveManager::RegisterSingleMove(MoveBase *move) {
    _moves.push_back(move);
}

void MoveManager::RegisterAllMoves(const std::string& movePath) {
    nlohmann::json moveJson;
    for (const auto& moveFile : std::filesystem::recursive_directory_iterator(movePath)) {
        std::ifstream(moveFile.path()) >> moveJson;
        for (const auto& moveDef : moveJson["moves"]) {
            if (moveDef["order"] == 2) {
#if MOVEMANAGER_VERBOSE > MM_LOG_NONE
                DEBUG("Registering 2d move in " << Lattice::order << "d space: " << moveDef["name"] << std::endl);
#endif
            } else if (moveDef["order"] == 3) {
#if MOVEMANAGER_VERBOSE > MM_LOG_NONE
                DEBUG("Registering 3d move in " << Lattice::order << "d space: " << moveDef["name"] << std::endl);
#endif
            } else {
                // Not currently supported
                std::cout << "Attempted to create move of order != 2 or 3, moveDef at: " << moveFile.path() << std::endl;
            }
            if (Lattice::order < moveDef["order"]) {
                std::cout << "Skipping move registration due to dimension conflict!" << std::endl;
                continue;
            }
            if (Lattice::order == 2) {
                const auto move = new Move2d();
                Isometry::transformsToFree.push_back(move);
                move->InitMove(moveDef);
            } else if (Lattice::order == 3) {
                const auto move = new Move3d();
                Isometry::transformsToFree.push_back(move);
                move->InitMove(moveDef);
            }
        }
    }
}

#define MOVEMANAGER_CHECK_BY_OFFSET true
std::vector<MoveBase*> MoveManager::CheckAllMoves(CoordTensor<int>& tensor, Module& mod) {
    std::vector<MoveBase*> legalMoves = {};
#if MOVEMANAGER_CHECK_BY_OFFSET
    for (const auto& moveOffset : _offsets) {
        if (const auto id = Lattice::coordTensor[mod.coords + moveOffset]; id == OUT_OF_BOUNDS || id >= 0) continue;
        for (auto move : _movesByOffset[moveOffset]) {
            if (move->MoveCheck(tensor, mod)) {
#if MOVEMANAGER_VERBOSE == MM_LOG_MOVE_CHECKS
                DEBUG("passed!\n");
#endif
                legalMoves.push_back(move);
                break;
#if MOVEMANAGER_VERBOSE == MM_LOG_MOVE_CHECKS
            } else {
                DEBUG("failed!\n");
#endif
            }
        }
    }
#else
    for (auto move : _moves) {
        if (move->MoveCheck(tensor, mod)) {
#if MOVEMANAGER_VERBOSE == MM_LOG_MOVE_CHECKS
            DEBUG("passed!\n");
#endif
            legalMoves.push_back(move);
#if MOVEMANAGER_VERBOSE == MM_LOG_MOVE_CHECKS
        } else {
            DEBUG("failed!\n");
#endif
        }
    }
#endif
    return legalMoves;
}

std::vector<std::vector<Module*>> GenerateFreeModulePowerSet() {
    std::vector<std::vector<Module*>> mods(1 << ModuleIdManager::MinStaticID(), std::vector<Module*>());
    for (int i = 0; i < 1 << ModuleIdManager::MinStaticID(); ++i) {
        for (int j = 0; j < sizeof(int) * 8; j++) {
            if (i & 1 << j) {
                mods[i].push_back(&ModuleIdManager::GetModule(j));
            }
        }
    }
    return mods;
}

bool ParallelMoveCheck(CoordTensor<int>& freeSpace, const Module& mod, const MoveBase* move) {
    if (freeSpace[mod.coords + move->MoveOffset()] == OUT_OF_BOUNDS) return false;
    bool result = std::all_of(move->moves.begin(), move->moves.end(), [&move = std::as_const(move), &mod = std::as_const(mod), &freeSpace](auto& moveCheck) {
        if (freeSpace[mod.coords + moveCheck.first] < 0) {
            // Space is not occupied
            if (moveCheck.second) {
                // But we wanted it to be! Invalid move.
                return false;
            }
            // Consider this space to be occupied for other modules
        } else if (!moveCheck.second) {
            // Space is occupied, but we don't want it to be! Invalid move.
            return false;
        } else if (freeSpace[mod.coords + moveCheck.first] == OCCUPIED_NO_ANCHOR) {
            // Space is considered occupied, but not permitted for use as an anchor! Invalid move.
            return false;
        }
        return true;
    });
    if (result) {
        for (const auto& moveCheck : move->moves) {
            if (moveCheck.second == false) {
                freeSpace[mod.coords + moveCheck.first] = OCCUPIED_NO_ANCHOR;
            }
        }
        freeSpace[mod.coords + move->MoveOffset()] = OCCUPIED_NO_ANCHOR;
    }
    return result;
}

std::vector<std::set<ModuleData>> MoveManager::MakeAllParallelMoves(std::unordered_set<HashedState>& visited) {
    static std::vector<std::vector<Module*>> modsToMove = GenerateFreeModulePowerSet();
    static CoordTensor<int> freeSpaceInternal(Lattice::Order(), Lattice::AxisSize(), FREE_SPACE);
    // Might speed things up
    static std::vector<std::unordered_set<MoveBase*>> failedMoves(ModuleIdManager::MinStaticID(), std::unordered_set<MoveBase*>());
    for (auto fails : failedMoves) {
        fails.clear();
    }
    for (const auto& mod : ModuleIdManager::FreeModules()) {
        Lattice::coordTensor[mod.coords] = FREE_SPACE;
    }
    for (const auto& mod : ModuleIdManager::FreeModules()) {
        for (auto move : _moves) {
            if (!move->FreeSpaceCheck(Lattice::coordTensor, mod.coords)) {
                failedMoves[mod.id].insert(move);
            }
        }
    }
    for (const auto& mod : ModuleIdManager::FreeModules()) {
        Lattice::coordTensor[mod.coords] = mod.id;
    }
    std::vector<std::set<ModuleData>> adjStates;
    // Iterate over all combinations of movable modules
    for (const auto& mods : modsToMove) {
        if (mods.empty()) continue;
        for (const auto& mod : mods) {
            Lattice::ClearAdjacencies(mod->id);
            if (!ModuleIdManager::StaticModules().empty()) {
                Lattice::AddEdge(mod->id, ModuleIdManager::MinStaticID());
            }
        }
        bool connected;
        if (!ModuleIdManager::StaticModules().empty()) {
            connected = Lattice::CheckConnected();
        } else {
            connected = Lattice::CheckConnected(mods.size());
        }
        for (const auto& mod : mods) {
            Lattice::ClearAdjacencies(mod->id);
#if LATTICE_RD_EDGECHECK
            Lattice::RDEdgeCheck(*mod);
#else
            Lattice::EdgeCheck(*mod);
#endif
        }
        if (!connected) continue;
        const int modCount = mods.size();
        const int moveCount = _moves.size();
        const int movesToProcess = std::pow(moveCount, modCount);
        int movesProcessed = 0;
        bool skipUpdate = false;
        // Starts at [0, ... , 0], should end at [moveCount - 1, ... , moveCount - 1]
        std::vector<int> modMoveIndex(modCount, 0);
        modMoveIndex.back() = -1;
        while (!std::ranges::all_of(modMoveIndex, [&](int index) {
            return index == moveCount - 1;
        })) {
            for (int i = modCount - 1; i >= 0; i--) {
                if (skipUpdate) break;
                if (modMoveIndex[i] == moveCount - 1) {
                    modMoveIndex[i] = 0;
                } else {
                    modMoveIndex[i]++;
                    break;
                }
            }
            movesProcessed++;
            skipUpdate = false;
            int indexFailed = -1;
            if (indexFailed == -1) {
                for (int i = 0; i < modCount; i++) {
                    if (!_moves[modMoveIndex[i]]->FreeSpaceCheck(Lattice::coordTensor, mods[i]->coords)) {
                        indexFailed = i;
                        break;
                    }
                }
            }
            if (indexFailed != -1) {
                skipUpdate = true;
                if (modMoveIndex[indexFailed] == moveCount - 1) {
                    if (indexFailed == 0) break;
                    modMoveIndex[indexFailed] = 0;
                    bool escape = false;
                    for (int i = indexFailed; i >= 0; i--) {
                        if (i == indexFailed) continue;
                        //modMoveIndex[i] = 0;
                        if (modMoveIndex[i] == moveCount - 1) {
                            if (i == 0) {
                                escape = true;
                                break;
                            }
                            modMoveIndex[i] = 0;
                        } else {
                            modMoveIndex[i]++;
                            break;
                        }
                    }
                    if (escape) break;
                } else {
                    modMoveIndex[indexFailed]++;
                }
                for (int i = indexFailed + 1; i < modCount - 1; i++) {
                    modMoveIndex[i] = 0;
                }
                continue;
            }
            // Check to avoid duplicate state
            for (int i = 0; i < modCount; i++) {
                auto move = _moves[modMoveIndex[i]];
                auto mod = mods[i];
                mod->coords += move->MoveOffset();
            }
            bool duplicate = visited.contains(HashedState(Lattice::GetModuleInfo()));
            for (int i = 0; i < modCount; i++) {
                auto move = _moves[modMoveIndex[i]];
                auto mod = mods[i];
                mod->coords -= move->MoveOffset();
            }
            if (duplicate) continue;
            // Set up local free space tensor to match lattice
            freeSpaceInternal.FillFromVector(Lattice::coordTensor.GetArrayInternal());
            // Initial setup
            bool success = true;
            for (int i = 0; i < modCount; i++) {
                // Forbid current position of all moving modules to be used as anchor
                freeSpaceInternal[mods[i]->coords] = OCCUPIED_NO_ANCHOR;
            }
            // mod[i] checks move[i]
            for (int i = 0; i < modCount; i++) {
                auto move = _moves[modMoveIndex[i]];
                auto mod = mods[i];
                if (!ParallelMoveCheck(freeSpaceInternal, *mod, move)) {
                    success = false;
                    break;
                }
            }
            if (success) {
                for (int i = 0; i < modCount; i++) {
                    auto move = _moves[modMoveIndex[i]];
                    auto mod = mods[i];
                    MoveModule(*mod, move);
                }
                adjStates.push_back(Lattice::GetModuleInfo());
                visited.insert(HashedState(Lattice::GetModuleInfo()));
                for (int i = 0; i < modCount; i++) {
                    auto move = _moves[modMoveIndex[i]];
                    auto mod = mods[i];
                    UnMoveModule(*mod, move);
                }
            }
        }
    }
    return adjStates;
}

std::vector<MoveBase*> MoveManager::CheckAllMovesAndConnectivity(CoordTensor<int>& tensor, Module& mod) {
    std::vector<MoveBase*> legalMoves = {};
#if MOVEMANAGER_CHECK_BY_OFFSET
    for (const auto& moveOffset : _offsets) {
        for (auto move : _movesByOffset[moveOffset]) {
            if (move->MoveCheck(tensor, mod) && Lattice::CheckConnected()) {
#if MOVEMANAGER_VERBOSE == MM_LOG_MOVE_CHECKS
                DEBUG("passed!\n");
#endif
                legalMoves.push_back(move);
                break;
#if MOVEMANAGER_VERBOSE == MM_LOG_MOVE_CHECKS
            } else {
                DEBUG("failed!\n");
#endif
            }
        }
    }
#else
    for (auto move : _moves) {
        if (move->MoveCheck(tensor, mod)) {
#if MOVEMANAGER_VERBOSE == MM_LOG_MOVE_CHECKS
            DEBUG("passed!\n");
#endif
            legalMoves.push_back(move);
#if MOVEMANAGER_VERBOSE == MM_LOG_MOVE_CHECKS
        } else {
            DEBUG("failed!\n");
#endif
        }
    }
#endif
    return legalMoves;
}

std::pair<Module*, MoveBase*> MoveManager::FindMoveToState(const std::set<ModuleData>& modData) {
    Module* modToMove = nullptr;
    std::valarray<int> destination;
    std::unordered_set<int> candidates;
    for (int id = 0; id < ModuleIdManager::MinStaticID(); id++) {
        candidates.insert(id);
    }
    for (const auto& info : modData) {
        if (auto id = Lattice::coordTensor[info.Coords()]; id >= 0) {
            candidates.erase(id);
        } else {
            destination = info.Coords();
        }
    }
    if (candidates.size() != 1) {
        for (const auto& info : modData) {
            for (const auto& mod : ModuleIdManager::FreeModules()) {
                if (mod.properties != info.Properties()) {
                    candidates.insert(mod.id);
                    destination = info.Coords();
                }
            }
        }
        if (candidates.size() != 1) {
            return {nullptr, nullptr};
        }
    }
    modToMove = &ModuleIdManager::GetModule(*candidates.begin());
    if (modToMove == nullptr) {
        return {nullptr, nullptr};
    }
    const auto offset = destination - modToMove->coords;
    for (auto move : _movesByOffset[offset]) {
        if (move->MoveCheck(Lattice::coordTensor, *modToMove)) {
            return {modToMove, move};
        }
    }
    return {modToMove, nullptr};
}

std::vector<std::pair<Module*, MoveBase*>> MoveManager::FindParallelMovesToState(const std::set<ModuleData>& modData) {
    std::vector<Module*> mods;
    std::unordered_set<int> candidates;
    for (int id = 0; id < ModuleIdManager::MinStaticID(); id++) {
        candidates.insert(id);
    }
    for (const auto& info : modData) {
        if (auto id = Lattice::coordTensor[info.Coords()]; id >= 0) {
            candidates.erase(id);
        }
    }
    for (auto id : candidates) {
        mods.push_back(&ModuleIdManager::GetModule(id));
    }
    static CoordTensor<int> freeSpaceInternal(Lattice::Order(), Lattice::AxisSize(), FREE_SPACE);
    std::vector<std::pair<Module*, MoveBase*>> parallelMoves;
    // Might speed things up
    static std::vector<std::unordered_set<MoveBase*>> failedMoves(ModuleIdManager::MinStaticID(), std::unordered_set<MoveBase*>());
    for (auto fails : failedMoves) {
        fails.clear();
    }
    for (const auto& mod : ModuleIdManager::FreeModules()) {
        Lattice::coordTensor[mod.coords] = FREE_SPACE;
    }
    for (const auto& mod : ModuleIdManager::FreeModules()) {
        for (auto move : _moves) {
            if (!move->FreeSpaceCheck(Lattice::coordTensor, mod.coords)) {
                failedMoves[mod.id].insert(move);
            }
        }
    }
    for (const auto& mod : ModuleIdManager::FreeModules()) {
        Lattice::coordTensor[mod.coords] = mod.id;
    }
    const int modCount = mods.size();
    const int moveCount = _moves.size();
    bool skipUpdate = false;
    // Starts at [0, ... , 0], should end at [moveCount - 1, ... , moveCount - 1]
    std::vector<int> modMoveIndex(modCount, 0);
    modMoveIndex.back() = -1;
    while (!std::ranges::all_of(modMoveIndex, [&](int index) {
        return index == moveCount - 1;
    })) {
        for (int i = modCount - 1; i >= 0; i--) {
            if (skipUpdate) break;
            if (modMoveIndex[i] == moveCount - 1) {
                modMoveIndex[i] = 0;
            } else {
                modMoveIndex[i]++;
                break;
            }
        }
        skipUpdate = false;
        int indexFailed = -1;
        if (indexFailed == -1) {
            for (int i = 0; i < modCount; i++) {
                if (!_moves[modMoveIndex[i]]->FreeSpaceCheck(Lattice::coordTensor, mods[i]->coords)) {
                    indexFailed = i;
                    break;
                }
            }
        }
        if (indexFailed != -1) {
            skipUpdate = true;
            if (modMoveIndex[indexFailed] == moveCount - 1) {
                if (indexFailed == 0) break;
                modMoveIndex[indexFailed] = 0;
                bool escape = false;
                for (int i = indexFailed; i >= 0; i--) {
                    if (i == indexFailed) continue;
                    if (modMoveIndex[i] == moveCount - 1) {
                        if (i == 0) {
                            escape = true;
                            break;
                        }
                        modMoveIndex[i] = 0;
                    } else {
                        modMoveIndex[i]++;
                        break;
                    }
                }
                if (escape) break;
            } else {
                modMoveIndex[indexFailed]++;
            }
            for (int i = indexFailed + 1; i < modCount - 1; i++) {
                modMoveIndex[i] = 0;
            }
            continue;
        }
        // Set up local free space tensor to match lattice
        freeSpaceInternal.FillFromVector(Lattice::coordTensor.GetArrayInternal());
        // Initial setup
        bool success = true;
        for (int i = 0; i < modCount; i++) {
            // Forbid current position of all moving modules to be used as anchor
            freeSpaceInternal[mods[i]->coords] = OCCUPIED_NO_ANCHOR;
        }
        // mod[i] checks move[i]
        for (int i = 0; i < modCount; i++) {
            auto move = _moves[modMoveIndex[i]];
            auto mod = mods[i];
            if (!ParallelMoveCheck(freeSpaceInternal, *mod, move)) {
                success = false;
                break;
            }
        }
        if (success) {
            for (int i = 0; i < modCount; i++) {
                auto move = _moves[modMoveIndex[i]];
                auto mod = mods[i];
                MoveModule(*mod, move);
            }
            if (Lattice::GetModuleInfo() == modData) {
                for (int i = 0; i < modCount; i++) {
                    parallelMoves.emplace_back(mods[i], _moves[modMoveIndex[i]]);
                }
                for (int i = 0; i < modCount; i++) {
                    auto move = _moves[modMoveIndex[i]];
                    auto mod = mods[i];
                    UnMoveModule(*mod, move);
                }
                break;
            }
            for (int i = 0; i < modCount; i++) {
                auto move = _moves[modMoveIndex[i]];
                auto mod = mods[i];
                UnMoveModule(*mod, move);
            }
        }
    }
    return parallelMoves;
}