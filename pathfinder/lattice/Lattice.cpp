#include <stack>
#include <queue>
#include <sstream>
#include <string>
#include <map>
#include "../utility/debug_util.h"
#include "../utility/color_util.h"
#include "Lattice.h"

std::vector<std::vector<int>> Lattice::adjList;
int Lattice::order;
int Lattice::axisSize;
int Lattice::boundarySize;
int Lattice::time = 0;
int Lattice::moduleCount = 0;
bool Lattice::ignoreProperties = false;
std::valarray<int> Lattice::boundaryOffset;
std::vector<Module*> Lattice::movableModules;
CoordTensor<bool> Lattice::stateTensor(1, 1, false);
CoordTensor<int> Lattice::coordTensor(1, 1, -1);

void Lattice::ClearAdjacencies(const int moduleId) {
    for (const int id : adjList[moduleId]) {
        for (int i = 0; i < adjList[id].size(); i++) {
            if (adjList[id][i] == moduleId) {
                adjList[id].erase(adjList[id].begin() + i);
                break;
            }
        }
    }
    adjList[moduleId].clear();
}

void Lattice::InitLattice(const int _order, const int _axisSize, const int _boundarySize) {
    order = _order;
    axisSize = _axisSize + 2 * _boundarySize;
    boundarySize = _boundarySize;
    boundaryOffset = std::valarray<int>(boundarySize, order);
    coordTensor = CoordTensor<int>(order, axisSize, OUT_OF_BOUNDS);
    for (int i = 0; i < coordTensor.GetArrayInternal().size(); i++) {
        if (std::any_of(begin(coordTensor.CoordsFromIndex(i)), end(coordTensor.CoordsFromIndex(i)), [](const int coord) {
            return coord < boundarySize || coord >= (axisSize - boundarySize);
        })) {
            continue;
        }
        coordTensor.GetElementDirect(i) = FREE_SPACE;
    }
}

void Lattice::setFlags(const bool _ignoreColors) {
    ignoreProperties = _ignoreColors;
}

void Lattice::AddModule(const Module& mod) {
    // Update coord tensor
    coordTensor[mod.coords] = mod.id;
    // Adjacency check
#if LATTICE_RD_EDGECHECK
    RDEdgeCheck(mod);
#else
    EdgeCheck(mod);
#endif
    moduleCount++;
    adjList.resize(moduleCount + 1);
}

void Lattice::AddBound(const std::valarray<int>& coords) {
    coordTensor[coords] = OUT_OF_BOUNDS;
}

void Lattice::MoveModule(Module &mod, const std::valarray<int>& offset) {
    ClearAdjacencies(mod.id);
    coordTensor[mod.coords] = FREE_SPACE;
    mod.coords += offset;
    coordTensor[mod.coords] = mod.id;
#if LATTICE_RD_EDGECHECK
    RDEdgeCheck(mod);
#else
    EdgeCheck(mod);
#endif
    if (!ignoreProperties) {
        mod.properties.UpdateProperties(offset);
    }
}

bool Lattice::checkConnected() {
    if (moduleCount == 0) return true;
    std::vector<bool> visited(moduleCount, false);
    std::stack<int> stack;
    int visitedCount = 0;
    stack.push(ModuleIdManager::MinStaticID());
    visited[ModuleIdManager::MinStaticID()] = true;
    while (!stack.empty()) {
        int node = stack.top();
        stack.pop();
        visitedCount++;
        for (int neighbor: adjList[node]) {
            if (!visited[neighbor]) {
                visited[neighbor] = true;
                stack.push(neighbor);
            }
        }
    }
    return visitedCount == moduleCount;
}

void Lattice::EdgeCheck(const Module& mod) {
    // Copy module coordinates to adjCoords
    auto adjCoords = mod.coords;
    for (int i = 0; i < order; i++) {
        // Don't want to check index -1
        if (adjCoords[i] == 0) continue;
        adjCoords[i]--;
        if (coordTensor[adjCoords] >= 0) {
#if (LATTICE_VERBOSE & LAT_LOG_ADJ) == LAT_LOG_ADJ
            DEBUG(mod << " Adjacent to " << ModuleIdManager::Modules()[coordTensor[adjCoords]] << std::endl);
#endif
            AddEdge(mod.id, coordTensor[adjCoords]);
        }
        // Don't want to check both ways if it can be avoided, also don't want to check index beyond max value
        if (adjCoords[i] + 2 == axisSize) {
            adjCoords[i]++;
            continue;
        }
        adjCoords[i] += 2;
        if (coordTensor[adjCoords] >= 0) {
#if (LATTICE_VERBOSE & LAT_LOG_ADJ) == LAT_LOG_ADJ
            DEBUG(mod << " Adjacent to " << ModuleIdManager::Modules()[coordTensor[adjCoords]] << std::endl);
#endif
            AddEdge(mod.id, coordTensor[adjCoords]);
        }
        adjCoords[i]--;
    }
}

void Lattice::RDEdgeCheck(const Module& mod) {
    auto adjCoords = mod.coords;
    if (adjCoords[1] != 0) {
        // offset: 0, -1, 0
        adjCoords[1]--;
        if (adjCoords[0] != 0) {
            // offset: -1, -1, 0
            adjCoords[0]--;
            if (coordTensor[adjCoords] >= 0) {
                AddEdge(mod.id, coordTensor[adjCoords]);
            }
            // offset: 1, -1, 0
            adjCoords[0] += 2;
        } else {
            // offset: 1, -1, 0
            adjCoords[0]++;
        }
        if (adjCoords[0] != axisSize) {
            if (coordTensor[adjCoords] >= 0) {
                AddEdge(mod.id, coordTensor[adjCoords]);
            }
        }
        // offset: 0, -1, 0
        adjCoords[0]--;
        if (adjCoords[2] != 0) {
            // offset: 0, -1, -1
            adjCoords[2]--;
            if (coordTensor[adjCoords] >= 0) {
                AddEdge(mod.id, coordTensor[adjCoords]);
            }
            // offset: 0, -1, 1
            adjCoords[2] += 2;
        } else {
            // offset: 0, -1, 1
            adjCoords[2]++;
        }
        if (adjCoords[2] != axisSize) {
            if (coordTensor[adjCoords] >= 0) {
                AddEdge(mod.id, coordTensor[adjCoords]);
            }
        }
        // offset: 0, 1, 0
        adjCoords[2]--;
        adjCoords[1] += 2;
    } else {
        // offset: 0, 1, 0
        adjCoords[1]++;
    }
    if (adjCoords[1] != axisSize) {
        if (adjCoords[0] != 0) {
            // offset: -1, 1, 0
            adjCoords[0]--;
            if (coordTensor[adjCoords] >= 0) {
                AddEdge(mod.id, coordTensor[adjCoords]);
            }
            // offset: 1, 1, 0
            adjCoords[0] += 2;
        } else {
            // offset: 1, 1, 0
            adjCoords[0]++;
        }
        if (adjCoords[0] != axisSize) {
            if (coordTensor[adjCoords] >= 0) {
                AddEdge(mod.id, coordTensor[adjCoords]);
            }
        }
        // offset: 0, 1, 0
        adjCoords[0]--;
        if (adjCoords[2] != 0) {
            // offset: 0, 1, -1
            adjCoords[2]--;
            if (coordTensor[adjCoords] >= 0) {
                AddEdge(mod.id, coordTensor[adjCoords]);
            }
            // offset: 0, 1, 1
            adjCoords[2] += 2;
        } else {
            // offset: 0, 1, 1
            adjCoords[2]++;
        }
        if (adjCoords[2] != axisSize) {
            if (coordTensor[adjCoords] >= 0) {
                AddEdge(mod.id, coordTensor[adjCoords]);
            }
        }
        // offset: 0, 0, 0
        adjCoords[1]--;
        adjCoords[2]--;
    } else {
        // offset: 0, 0, 0
        adjCoords[1]--;
    }
    if (adjCoords[0] != 0) {
        // offset: -1, 0, 0
        adjCoords[0]--;
        if (adjCoords[2] != 0) {
            // offset: -1, 0, -1
            adjCoords[2]--;
            if (coordTensor[adjCoords] >= 0) {
                AddEdge(mod.id, coordTensor[adjCoords]);
            }
            // offset: -1, 0, 1
            adjCoords[2] += 2;
        } else {
            // offset: -1, 0, 1
            adjCoords[2]++;
        }
        if (adjCoords[2] != axisSize) {
            if (coordTensor[adjCoords] >= 0) {
                AddEdge(mod.id, coordTensor[adjCoords]);
            }
        }
        // offset: 1, 0, 0
        adjCoords[2]--;
        adjCoords[0] += 2;
    } else {
        // offset: 1, 0, 0
        adjCoords[0]++;
    }
    if (adjCoords[0] != axisSize) {
        if (adjCoords[2] != 0) {
            // offset: -1, 0, -1
            adjCoords[2]--;
            if (coordTensor[adjCoords] >= 0) {
                AddEdge(mod.id, coordTensor[adjCoords]);
            }
            // offset: -1, 0, 1
            adjCoords[2] += 2;
        } else {
            // offset: -1, 0, 1
            adjCoords[2]++;
        }
        if (adjCoords[2] != axisSize) {
            if (coordTensor[adjCoords] >= 0) {
                AddEdge(mod.id, coordTensor[adjCoords]);
            }
        }
    }
}

void Lattice::AddEdge(const int modA, const int modB) {
    adjList[modA].push_back(modB);
    adjList[modB].push_back(modA);
}

void Lattice::APUtil(const int u, std::vector<bool> &visited, std::vector<bool> &ap, std::vector<int> &parent,
                     std::vector<int> &low, std::vector<int> &disc) {
    int children = 0;
    visited[u] = true;
    disc[u] = time;
    low[u] = time;
    time++;

    for (const int v : adjList[u]) {
        if (!visited[v]) {
            parent[v] = u;
            children++;
            APUtil(v, visited, ap, parent, low, disc);
            low[u] = std::min(low[u], low[v]);

            if (parent[u] == -1 && children > 1) {
                ap[u] = true;
            }

            if (parent[u] != -1 && low[v] >= disc[u]) {
                ap[u] = true;
            }
        } else if (v != parent[u]) {
            low[u] = std::min(low[u], disc[v]);
        }
    }
}

void Lattice::BuildMovableModules() {
    time = 0;
    std::vector<bool> visited(moduleCount, false);
    std::vector<int> disc(moduleCount, -1);
    std::vector<int> low(moduleCount, -1);
    std::vector<int> parent(moduleCount, -1);
    std::vector<bool> ap(moduleCount, false);
    movableModules.clear();

    for (int id = 0; id < moduleCount; id++) {
        if (!visited[id]) {
            APUtil(id, visited, ap, parent, low, disc);
        }
    }

    for (int id = 0; id < moduleCount; id++) {
        auto& mod = ModuleIdManager::Modules()[id];
        if (ap[id]) {
#if (LATTICE_VERBOSE & LAT_LOG_CUT) == LAT_LOG_CUT
            DEBUG(mod << " is an articulation point" << std::endl);
#endif
        } else if (!mod.moduleStatic) {
            // Non-cut, non-static modules
            movableModules.emplace_back(&mod);
        }
    }
}

void Lattice::BuildMovableModulesNonRec() {
    // Clear movableModules vector
    movableModules.clear();

    // Find articulation points non-recursively
    int t = 0;
    std::vector<bool> ap(moduleCount, false);
    std::vector<bool> visited(moduleCount, false);
    // this outer for loop I'm pretty sure isn't needed since the modules should all be connected
    for (int id = 0; id < moduleCount; id++) {
        if (visited[id]) {
            continue;
        }
        // can probably convert these to vectors
        std::vector<int> discovery(moduleCount, 0);
        std::vector<int> low(moduleCount, 0);
        int root_children = 0;
        visited[id] = true;
        std::stack<std::tuple<int, int, std::vector<int>::const_iterator>> stack;
        stack.emplace(id, id, adjList[id].cbegin());

        while (!stack.empty()) {
            if (auto [grandparent, parent, children] = stack.top(); children != adjList[parent].cend()) {
                int child = *children;
                ++std::get<std::vector<int>::const_iterator>(stack.top());
                //++children;

                if (grandparent == child) {
                    continue;
                }

                if (visited[child]) {
                    if (discovery[child] <= discovery[parent]) {
                        low[parent] = discovery[child] < low[parent] ? discovery[child] : low[parent];
                    }
                } else {
                    t++;
                    low[child] = discovery[child] = t;
                    visited[child] = true;
                    stack.emplace(parent, child, adjList[child].cbegin());
                }
            } else {
                stack.pop();
                if (stack.size() > 1) {
                    if (low[parent] >= discovery[grandparent]) {
                        ap[grandparent] = true;
                    }
                    low[grandparent] = low[parent] < low[grandparent] ? low[parent] : low[grandparent];
                } else if (!stack.empty()) {
                    root_children++;
                }
            }
        }
        if (root_children > 1) {
            ap[id] = true;
        }
    }

    // Rebuild movableModules vector
    for (int id = 0; id < ModuleIdManager::MinStaticID(); id++) {
        if (!ap[id]) {
            movableModules.push_back(&ModuleIdManager::GetModule(id));
        }
    }
}

#define AP_Recursive true
const std::vector<Module*>& Lattice::MovableModules() {
#if AP_Recursive
    BuildMovableModules();
#else
    BuildMovableModulesNonRec();
#endif
    return movableModules;
}

void Lattice::UpdateFromModuleInfo(const std::set<ModuleData>& moduleInfo) {
    std::queue<const ModuleData*> destinations;
    std::unordered_set<int> modsToMove;
    for (int id = 0; id < ModuleIdManager::MinStaticID(); id++) {
        modsToMove.insert(id);
    }
    for (const auto& info : moduleInfo) {
        auto id = coordTensor[info.Coords()];
        if (id >= 0) {
            auto& mod = ModuleIdManager::GetModule(id);
            modsToMove.erase(id);
            if (mod.properties != info.Properties()) {
                mod.properties = info.Properties();
            }
        } else {
            destinations.push(&info);
        }
    }
    if (modsToMove.size() != destinations.size()) {
        std::cerr << "Update partially completed due to state error, program likely non-functional!" << std::endl;
        return;
    }
    for (const auto id : modsToMove) {
        auto& mod = ModuleIdManager::GetModule(id);
        Lattice::coordTensor[mod.coords] = FREE_SPACE;
        mod.coords = destinations.front()->Coords();
        ClearAdjacencies(id);
#if LATTICE_RD_EDGECHECK
        RDEdgeCheck(mod);
#else
        EdgeCheck(mod);
#endif
        Lattice::coordTensor[mod.coords] = mod.id;
        mod.properties = destinations.front()->Properties();
        destinations.pop();
    }
}

std::set<ModuleData> Lattice::GetModuleInfo() {
    std::set<ModuleData> modInfo;
    for (int id = 0; id < ModuleIdManager::MinStaticID(); id++) {
        const auto& mod = ModuleIdManager::GetModule(id);
        modInfo.insert({mod.coords, mod.properties});
    }
    return modInfo;
}

int Lattice::Order() {
    return order;
}

int Lattice::AxisSize() {
    return axisSize;
}

std::string Lattice::ToString() {
    std::stringstream out;
    if (order != 2) {
        DEBUG("Lattice string conversion not permitted for non-2d lattice");
        return "";
    }
    out << "Lattice State:\n";
    for (int i = 0; i < coordTensor.GetArrayInternal().size(); i++) {
        if (const auto id = coordTensor.GetElementDirect(i); id >= 0 && !ignoreProperties) {
            if (ModuleIdManager::GetModule(id).moduleStatic) {
                out << '#';
            } else {
                const auto colorProp = (ModuleIdManager::Modules()[id].properties.Find(COLOR_PROP_NAME));
                out << Colors::intToColor[colorProp->CallFunction<int>("GetColorInt")][0];
            }
        } else if (id >= 0) {
            out << (ModuleIdManager::GetModule(id).moduleStatic ? '#' : '@');
        } else if (id == FREE_SPACE) {
            out << '-';
        } else {
            out << "⋅";
        }
        if ((i + 1) % axisSize == 0) {
            out << '\n';
        }
    }
    return out.str();
}