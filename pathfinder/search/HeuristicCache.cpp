#include "HeuristicCache.h"
#include <queue>
#include <execution>
#include "../lattice/Lattice.h"
#include "../moves/MoveManager.h"

constexpr float INVALID_WEIGHT = 999;

IHeuristicCache::IHeuristicCache(): weightCache(Lattice::Order(), Lattice::AxisSize(), INVALID_WEIGHT) {}

float IHeuristicCache::operator[](const std::valarray<int> &coords) const {
    return weightCache[coords];
}

void ChebyshevHeuristicCache::ChebyshevEnqueueAdjacent(std::queue<SearchCoord>& coordQueue, const SearchCoord& coordInfo) {
    std::vector<std::valarray<int>> adjCoords;
    adjCoords.push_back(coordInfo.coords);
    for (int i = 0; i < Lattice::Order(); i++) {
        auto adjCoordsTemp = adjCoords;
        for (auto adj : adjCoordsTemp) {
            adj[i]--;
            adjCoords.push_back(adj);
            adj[i] += 2;
            adjCoords.push_back(adj);
        }
    }
    for (const auto& coord : adjCoords) {
        if (Lattice::coordTensor[coord] == OUT_OF_BOUNDS || Lattice::coordTensor[coord] >=
            ModuleIdManager::MinStaticID()) continue;
        coordQueue.push({coord, coordInfo.depth + 1});
    }
}

ChebyshevHeuristicCache::ChebyshevHeuristicCache(const std::set<ModuleData>& desiredState) {
    for (const auto& desiredModuleData : desiredState) {
        std::queue<SearchCoord> coordQueue;
        coordQueue.push({desiredModuleData.Coords(), 0});
        while (!coordQueue.empty()) {
            std::valarray<int> coords = coordQueue.front().coords;
            const auto depth = coordQueue.front().depth;
            if (const auto weight = weightCache[coords]; depth < weight) {
                weightCache[coords] = depth;
            } else if (depth > weight) {
                coordQueue.pop();
                continue;
            }
            ChebyshevEnqueueAdjacent(coordQueue, coordQueue.front());
            coordQueue.pop();
        }
    }
    std::cout << "Weight Cache:";
    for (int i = 0; i < weightCache.GetArrayInternal().size(); i++) {
        if (i % Lattice::AxisSize() == 0) std::cout << std::endl;
        if (weightCache.GetArrayInternal()[i] < 10) {
            std::cout << weightCache.GetArrayInternal()[i];
        } else if (weightCache.GetArrayInternal()[i] == INVALID_WEIGHT) {
            std::cout << "#";
        } else {
            std::cout << " ";
        }
    }
    std::cout << std::endl;
}

void ManhattanEnqueueAdjacentInternal(std::queue<SearchCoord>& coordQueue, const SearchCoord& coordInfo) {
    std::vector<std::valarray<int>> adjCoords;
    adjCoords.push_back(coordInfo.coords);
    // for (int i = 0; i < Lattice::Order(); i++) {
    //     auto adjCoordsTemp = adjCoords;
    //     for (auto adj : adjCoordsTemp) {
    //         adj[i]--;
    //         adjCoords.push_back(adj);
    //         adj[i] += 2;
    //         adjCoords.push_back(adj);
    //     }
    // }
    auto adjCoordsTemp = adjCoords;
    for (auto adj : adjCoordsTemp) {
        for (int i = 0; i < Lattice::Order(); i++) {
            adj[i]--;
            adjCoords.push_back(adj);
            adj[i] += 2;
            adjCoords.push_back(adj);
            adj[i]--;
        }
    }
    for (const auto& coord : adjCoords) {
        if (Lattice::coordTensor[coord] == OUT_OF_BOUNDS) continue;
        coordQueue.push({coord, coordInfo.depth + 1});
    }
}

void ChebyshevEnqueueAdjacentInternal(std::queue<SearchCoord>& coordQueue, const SearchCoord& coordInfo) {
    std::vector<std::valarray<int>> adjCoords;
    adjCoords.push_back(coordInfo.coords);
    for (int i = 0; i < Lattice::Order(); i++) {
        auto adjCoordsTemp = adjCoords;
        for (auto adj : adjCoordsTemp) {
            adj[i]--;
            adjCoords.push_back(adj);
            adj[i] += 2;
            adjCoords.push_back(adj);
        }
    }
    for (const auto& coord : adjCoords) {
        if (Lattice::coordTensor[coord] == OUT_OF_BOUNDS) continue;
        coordQueue.push({coord, coordInfo.depth + 1});
    }
}

CoordTensor<int> BuildInternalDistanceCache() {
    CoordTensor<int> cache(Lattice::Order(), Lattice::AxisSize(), INVALID_WEIGHT);
    for (const auto& staticModule : ModuleIdManager::StaticModules()) {
        std::queue<SearchCoord> coordQueue;
        coordQueue.push({staticModule.coords, 0});
        while (!coordQueue.empty()) {
            std::valarray<int> coords = coordQueue.front().coords;
            const auto depth = coordQueue.front().depth;
            if (static_cast<int>(depth) > ModuleIdManager::MinStaticID()) {
                while (!coordQueue.empty()) {
                    coordQueue.pop();
                }
                break;
            }
            if (const auto weight = cache[coords]; static_cast<int>(depth) < weight) {
                cache[coords] = static_cast<int>(depth);
            } else if (static_cast<int>(depth) >= weight) {
                coordQueue.pop();
                continue;
            }
#if LATTICE_RD_EDGECHECK
            // 90% sure Chebyshev distance should work for rhombic dodecahedra edge checking
            ChebyshevEnqueueAdjacentInternal(coordQueue, coordQueue.front());
#else
            // Manhattan distance works for regular edge checking
            ManhattanEnqueueAdjacentInternal(coordQueue, coordQueue.front());
#endif
            coordQueue.pop();
        }
    }
    // Print distance tensor
    std::cout << "Distance Cache:";
    for (int i = 0; i < cache.GetArrayInternal().size(); i++) {
        if (i % Lattice::AxisSize() == 0) std::cout << std::endl;
        if (cache.GetArrayInternal()[i] < 10) {
            std::cout << cache.GetArrayInternal()[i];
        } else if (cache.GetArrayInternal()[i] == INVALID_WEIGHT) {
            if (Lattice::coordTensor.GetElementDirect(i) >= ModuleIdManager::MinStaticID()) {
                std::cout << "#";
            } else {
#if CONFIG_HEURISTIC_CACHE_OPTIMIZATION
                Lattice::coordTensor.GetElementDirect(i) = OUT_OF_BOUNDS;
#endif
                std::cout << "⋅";
            }
        } else {
            std::cout << " ";
        }
    }
    std::cout << std::endl;
    return cache;
}

#if CONFIG_HEURISTIC_CACHE_HELP_LIMITATIONS
int MoveOffsetHeuristicCache::currentHelp = 0;
#endif

void MoveOffsetHeuristicCache::MoveOffsetEnqueueAdjacent(std::queue<SearchCoord>& coordQueue, const SearchCoord& coordInfo) {
#if CONFIG_HEURISTIC_CACHE_DIST_LIMITATIONS
    static CoordTensor<int> internalDistanceCache = BuildInternalDistanceCache();
#endif
    std::vector<std::valarray<int>> adjCoords;
    adjCoords.push_back(coordInfo.coords);
    auto adjCoordsTemp = adjCoords;
    for (auto adj : adjCoordsTemp) {
        for (const auto& offset : MoveManager::_offsets) {
#if CONFIG_HEURISTIC_CACHE_DIST_LIMITATIONS
#if CONFIG_HEURISTIC_CACHE_HELP_LIMITATIONS
            if (internalDistanceCache[adj + offset] > currentHelp) continue;
#else
            if (internalDistanceCache[adj + offset] > ModuleIdManager::MinStaticID()) continue;
#endif
#endif
            if (std::any_of(std::execution::par_unseq ,MoveManager::_movesByOffset[offset].begin(), MoveManager::_movesByOffset[offset].end(), [&](MoveBase* move) {
#if CONFIG_HEURISTIC_CACHE_HELP_LIMITATIONS
                return move->FreeSpaceCheckHelpLimit(Lattice::coordTensor, adj, internalDistanceCache, currentHelp);
#else
                return move->FreeSpaceCheck(Lattice::coordTensor, adj);
#endif
            })) {
                adj += offset;
                adjCoords.push_back(adj);
                adj -= offset;
            }
        }
    }
    for (const auto& coord : adjCoords) {
        if (Lattice::coordTensor[coord] == OUT_OF_BOUNDS || Lattice::coordTensor[coord] >=
            ModuleIdManager::MinStaticID()) continue;
        coordQueue.push({coord, coordInfo.depth + 1});
    }
}

MoveOffsetHeuristicCache::MoveOffsetHeuristicCache(const std::set<ModuleData> &desiredState) {
#if CONFIG_HEURISTIC_CACHE_HELP_LIMITATIONS
    currentHelp = ModuleIdManager::MinStaticID();
#endif
    // Temporarily remove non-static modules from lattice
    for (const auto& mod : ModuleIdManager::FreeModules()) {
        Lattice::coordTensor[mod.coords] = FREE_SPACE;
    }
#if CONFIG_HEURISTIC_CACHE_HELP_LIMITATIONS
    constexpr std::hash<ModuleData> moduleHash;
    currentHelp = ModuleIdManager::MinStaticID();
    std::unordered_map<std::size_t, int> helpMap;
    std::vector<std::valarray<int>> desiredPositions;
    // Get desired positions
    for (const auto& desiredModuleData : desiredState) {
        desiredPositions.push_back(desiredModuleData.Coords());
    }
    // Find out which non-static modules can interact
    for (const auto& desiredModuleData : desiredState) {
        CoordTensor<bool> internalVisitTensor(Lattice::Order(), Lattice::AxisSize(), false);
        std::queue<SearchCoord> coordQueue;
        coordQueue.push({desiredModuleData.Coords()});
        // internalVisitTensor[desiredModuleData.Coords()] = true;
        while (!coordQueue.empty()) {
            if (internalVisitTensor[coordQueue.front().coords]) {
                coordQueue.pop();
                continue;
            }
            internalVisitTensor[coordQueue.front().coords] = true;
            //if (desiredPositions.contains(coordQueue.front().coords)) {
            if (std::any_of(std::execution::par_unseq, desiredPositions.begin(), desiredPositions.end(), [&](std::valarray<int>& coord) {
                std::valarray valArrComparison = coord == coordQueue.front().coords;
                for (const auto result : valArrComparison) {
                    if (!result) {
                        return false;
                    }
                }
                return true;
            })) {
                if (!helpMap.contains(moduleHash(desiredModuleData))) {
                    helpMap[moduleHash(desiredModuleData)] = 0;
                } else {
                    helpMap[moduleHash(desiredModuleData)]++;
                }
            }
            MoveOffsetEnqueueAdjacent(coordQueue, coordQueue.front());
            coordQueue.pop();
        }
    }
#endif
    // Populate weight tensor
    for (const auto& desiredModuleData : desiredState) {
#if CONFIG_HEURISTIC_CACHE_HELP_LIMITATIONS
        currentHelp = helpMap[moduleHash(desiredModuleData)];
#endif
        std::queue<SearchCoord> coordQueue;
        coordQueue.push({desiredModuleData.Coords(), 0});
        while (!coordQueue.empty()) {
            std::valarray<int> coords = coordQueue.front().coords;
            const auto depth = coordQueue.front().depth;
            if (const auto weight = weightCache[coords]; depth < weight) {
                weightCache[coords] = depth;
            } else if (depth > weight) {
                coordQueue.pop();
                continue;
            }
            MoveOffsetEnqueueAdjacent(coordQueue, coordQueue.front());
            coordQueue.pop();
        }
    }
    // Restore non-static module to lattice
    for (const auto& mod : ModuleIdManager::FreeModules()) {
        Lattice::coordTensor[mod.coords] = mod.id;
    }
    // Print weight tensor
    std::cout << "Weight Cache:";
    for (int i = 0; i < weightCache.GetArrayInternal().size(); i++) {
        if (i % Lattice::AxisSize() == 0) std::cout << std::endl;
        if (weightCache.GetArrayInternal()[i] < 10) {
            std::cout << weightCache.GetArrayInternal()[i];
        } else if (weightCache.GetArrayInternal()[i] == INVALID_WEIGHT) {
            if (Lattice::coordTensor.GetElementDirect(i) >= ModuleIdManager::MinStaticID()) {
                std::cout << "#";
            } else {
#if CONFIG_HEURISTIC_CACHE_OPTIMIZATION
                Lattice::coordTensor.GetElementDirect(i) = OUT_OF_BOUNDS;
#endif
                std::cout << "⋅";
            }
        } else {
            std::cout << " ";
        }
    }
    std::cout << std::endl;
}

std::unordered_map<std::uint_fast64_t, int> MoveOffsetPropertyHeuristicCache::propConversionMap;

#if CONFIG_HEURISTIC_CACHE_HELP_LIMITATIONS
int MoveOffsetPropertyHeuristicCache::currentHelp = 0;
#endif

void MoveOffsetPropertyHeuristicCache::MoveOffsetPropertyEnqueueAdjacent(std::queue<SearchCoordProp>& coordPropQueue, const SearchCoordProp& coordPropInfo) {
#if CONFIG_HEURISTIC_CACHE_DIST_LIMITATIONS
    static CoordTensor<int> internalDistanceCache = BuildInternalDistanceCache();
#endif
    std::vector<std::valarray<int>> adjCoords;
    adjCoords.push_back(coordPropInfo.coords);
    auto adjCoordsTemp = adjCoords;
    for (auto adj : adjCoordsTemp) {
        for (const auto& offset : MoveManager::_offsets) {
#if CONFIG_HEURISTIC_CACHE_DIST_LIMITATIONS
#if CONFIG_HEURISTIC_CACHE_HELP_LIMITATIONS
            if (internalDistanceCache[adj + offset] > currentHelp) continue;
#else
            if (internalDistanceCache[adj + offset] > ModuleIdManager::MinStaticID()) continue;
#endif
#endif
            if (std::any_of(std::execution::par_unseq,MoveManager::_movesByOffset[offset].begin(), MoveManager::_movesByOffset[offset].end(), [&](MoveBase* move) {
#if CONFIG_HEURISTIC_CACHE_HELP_LIMITATIONS
                return move->FreeSpaceCheckHelpLimit(Lattice::coordTensor, adj, internalDistanceCache, currentHelp);
#else
                return move->FreeSpaceCheck(Lattice::coordTensor, adj);
#endif
            })) {
                adj += offset;
                adjCoords.push_back(adj);
                adj -= offset;
            }
        }
    }
    for (const auto& coord : adjCoords) {
        if (Lattice::coordTensor[coord] == OUT_OF_BOUNDS || Lattice::coordTensor[coord] >=
            ModuleIdManager::MinStaticID()) continue;
        coordPropQueue.push({coord, coordPropInfo.depth + 1, coordPropInfo.propInt});
    }
}

MoveOffsetPropertyHeuristicCache::MoveOffsetPropertyHeuristicCache(const std::set<ModuleData> &desiredState) {
    // Determine # of unique properties and map potentially large int representations to small values
    int propIndex = 0;
    for (const auto& desiredModuleData : desiredState) {
        if (!propConversionMap.contains(desiredModuleData.Properties().AsInt())) {
            propConversionMap[desiredModuleData.Properties().AsInt()] = propIndex;
            propIndex++;
        }
    }
    // Resize weight cache to account for property axis (increase order by 1 and adjust axis size only if necessary)
    if (propIndex > Lattice::AxisSize()) {
        weightCache = CoordTensor<float>(Lattice::Order() + 1, propIndex, INVALID_WEIGHT);
    } else {
        weightCache = CoordTensor<float>(Lattice::Order() + 1, Lattice::AxisSize(), INVALID_WEIGHT);
    }
    // Temporarily remove non-static modules from lattice
    for (const auto& mod : ModuleIdManager::FreeModules()) {
        Lattice::coordTensor[mod.coords] = FREE_SPACE;
    }
#if CONFIG_HEURISTIC_CACHE_HELP_LIMITATIONS
    constexpr std::hash<ModuleData> moduleHash;
    currentHelp = ModuleIdManager::MinStaticID();
    std::unordered_map<std::size_t, int> helpMap;
    std::vector<std::valarray<int>> desiredPositions;
    // Get desired positions
    for (const auto& desiredModuleData : desiredState) {
        desiredPositions.push_back(desiredModuleData.Coords());
    }
    // Find out which non-static modules can interact
    for (const auto& desiredModuleData : desiredState) {
        CoordTensor<bool> internalVisitTensor(Lattice::Order(), Lattice::AxisSize(), false);
        std::queue<SearchCoordProp> coordQueue;
        coordQueue.push({desiredModuleData.Coords()});
        // internalVisitTensor[desiredModuleData.Coords()] = true;
        while (!coordQueue.empty()) {
            if (internalVisitTensor[coordQueue.front().coords]) {
                coordQueue.pop();
                continue;
            }
            internalVisitTensor[coordQueue.front().coords] = true;
            //if (desiredPositions.contains(coordQueue.front().coords)) {
            if (std::any_of(std::execution::par_unseq, desiredPositions.begin(), desiredPositions.end(), [&](std::valarray<int>& coord) {
                std::valarray valArrComparison = coord == coordQueue.front().coords;
                for (const auto result : valArrComparison) {
                    if (!result) {
                        return false;
                    }
                }
                return true;
            })) {
                if (!helpMap.contains(moduleHash(desiredModuleData))) {
                    helpMap[moduleHash(desiredModuleData)] = 1;
                } else {
                    helpMap[moduleHash(desiredModuleData)]++;
                }
            }
            MoveOffsetPropertyEnqueueAdjacent(coordQueue, coordQueue.front());
            coordQueue.pop();
        }
    }
    std::cout << "Acquired Help Values." << std::endl;
#endif
    // Populate weight tensor
    for (const auto& desiredModuleData : desiredState) {
#if CONFIG_HEURISTIC_CACHE_HELP_LIMITATIONS
        currentHelp = helpMap[moduleHash(desiredModuleData)];
#endif
        std::queue<SearchCoordProp> coordQueue;
        coordQueue.push({desiredModuleData.Coords(), 0, (desiredModuleData.Properties().AsInt())});
        while (!coordQueue.empty()) {
            //std::valarray<int> coords = coordQueue.front().coords;
            std::valarray<int> coordProps(Lattice::Order() + 1, 0);
            for (int i = 0; i < Lattice::Order(); i++) {
                coordProps[i] = coordQueue.front().coords[i];
            }
            coordProps[Lattice::Order()] = propConversionMap[coordQueue.front().propInt];
            const auto depth = coordQueue.front().depth;
            if (const auto weight = weightCache[coordProps]; depth < weight) {
                weightCache[coordProps] = depth;
            } else if (depth > weight) {
                coordQueue.pop();
                continue;
            }
            MoveOffsetPropertyEnqueueAdjacent(coordQueue, coordQueue.front());
            coordQueue.pop();
        }
    }
#if CONFIG_HEURISTIC_CACHE_OPTIMIZATION
    // Optimize lattice using cache info
    for (int i = 0; i < Lattice::coordTensor.GetArrayInternal().size(); i++) {
        bool reachable = false;
        for (int prop = 0; prop < propIndex; prop++) {
            if (weightCache.GetArrayInternal()[i + prop * Lattice::coordTensor.GetArrayInternal().size()] != INVALID_WEIGHT) {
                reachable = true;
                break;
            }
        }
        if (!reachable && Lattice::coordTensor.GetArrayInternal()[i] <= FREE_SPACE) {
            Lattice::coordTensor[Lattice::coordTensor.CoordsFromIndex(i)] = OUT_OF_BOUNDS;
        }
    }
#endif
    // Restore non-static module to lattice
    for (const auto& mod : ModuleIdManager::FreeModules()) {
        Lattice::coordTensor[mod.coords] = mod.id;
    }
    // Print weight tensor
    auto maxIndex = propIndex * Lattice::coordTensor.GetArrayInternal().size();
    std::cout << "Weight Cache:";
    for (int i = 0; i < maxIndex; i++) {
        if (i % Lattice::AxisSize() == 0) std::cout << std::endl;
        if (weightCache.GetArrayInternal()[i] < 10) {
            std::cout << weightCache.GetArrayInternal()[i];
        } else if (weightCache.GetArrayInternal()[i] == INVALID_WEIGHT) {
            if (Lattice::coordTensor.GetArrayInternal()[i % Lattice::coordTensor.GetArrayInternal().size()] >= ModuleIdManager::MinStaticID()) {
                std::cout << "#";
            } else if (Lattice::coordTensor.GetArrayInternal()[i % Lattice::coordTensor.GetArrayInternal().size()] == OUT_OF_BOUNDS) {
                std::cout << "⋅";
            } else {
                std::cout << "+";
            }
        } else {
            std::cout << " ";
        }
    }
    std::cout << std::endl;
}

float MoveOffsetPropertyHeuristicCache::operator[](const std::valarray<int> &coords, std::uint_fast64_t propInt) const {
    static std::valarray<int> coordProps(Lattice::Order() + 1, 0);
    for (int i = 0; i < Lattice::Order(); i++) {
        coordProps[i] = coords[i];
    }
    coordProps[Lattice::Order()] = propConversionMap[propInt];
    return weightCache[coordProps];
}
