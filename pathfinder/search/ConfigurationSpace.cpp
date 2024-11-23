#include <random>
#include <boost/functional/hash.hpp>
#include <unordered_set>
#include <queue>
#include <set>
#include <utility>
#include "../moves/MoveManager.h"
#include "ConfigurationSpace.h"
#include "HeuristicCache.h"
#include "SearchAnalysis.h"

const char* SearchExcept::what() const noexcept {
    return "Search exhausted without finding a path!";
}

const char *HeuristicExcept::what() const noexcept {
    return "Heuristic exhibited non-consistent behavior!";
}


HashedState::HashedState(const std::set<ModuleData>& modData) {
    seed = boost::hash_range(modData.begin(), modData.end());
    moduleData = modData;
    foundAt = nullptr;
}

HashedState::HashedState(const HashedState& other) : seed(other.GetSeed()), moduleData(other.GetState()), foundAt(other.FoundAt()) {}

size_t HashedState::GetSeed() const {
    return seed;
}

const std::set<ModuleData>& HashedState::GetState() const {
    return moduleData;
}

void HashedState::SetFounder(const Configuration* founder) {
    foundAt = founder;
}

const Configuration *HashedState::FoundAt() const {
    return foundAt;
}


bool HashedState::operator==(const HashedState& other) const {
    return seed == other.GetSeed() && moduleData == other.GetState();
}

bool HashedState::operator!=(const HashedState& other) const {
    return seed != other.GetSeed();
}

size_t std::hash<HashedState>::operator()(const HashedState& state) const noexcept {
    return state.GetSeed();
}

Configuration::Configuration(const std::set<ModuleData>& modData) : hash(modData) {}

Configuration::~Configuration() {
    for (auto i = next.rbegin(); i != next.rend(); ++i) {
        delete *i;
    }
}

std::vector<std::set<ModuleData>> Configuration::MakeAllMoves() const {
    std::vector<std::set<ModuleData>> result;
    Lattice::UpdateFromModuleInfo(GetModData());
    std::vector<Module*> movableModules = Lattice::MovableModules();
    for (const auto module: movableModules) {
        auto legalMoves = MoveManager::CheckAllMoves(Lattice::coordTensor, *module);
        for (const auto move : legalMoves) {
            Lattice::MoveModule(*module, move->MoveOffset());
            result.emplace_back(Lattice::GetModuleInfo());
            Lattice::MoveModule(*module, -move->MoveOffset());
        }
    }
    return result;
}

std::vector<std::set<ModuleData>> Configuration::MakeAllMovesForAllVertices() const {
    std::vector<std::set<ModuleData>> result;
    Lattice::UpdateFromModuleInfo(GetModData());
    std::vector<Module*> movableModules;
    for (int id = 0; id < ModuleIdManager::MinStaticID(); id++) {
        movableModules.push_back(&ModuleIdManager::GetModule(id));
    }
    for (const auto module: movableModules) {
        auto legalMoves = MoveManager::CheckAllMoves(Lattice::coordTensor, *module);
        for (const auto move: legalMoves) {
            Lattice::MoveModule(*module, move->MoveOffset());
            if (Lattice::CheckConnected()) {
                result.emplace_back(Lattice::GetModuleInfo());
            }
            Lattice::MoveModule(*module, -move->MoveOffset());
        }
    }
    return result;
}

Configuration* Configuration::AddEdge(const std::set<ModuleData>& modData) {
    next.push_back(new Configuration(modData));
    return next.back();
}

Configuration* Configuration::GetParent() const {
    return parent;
}

std::vector<Configuration*> Configuration::GetNext() const {
    return next;
}

const HashedState& Configuration::GetHash() const {
    return hash;
}

const std::set<ModuleData>& Configuration::GetModData() const {
    return hash.GetState();
}

void Configuration::SetParent(Configuration* configuration) {
    parent = configuration;
}

std::ostream& operator<<(std::ostream& out, const Configuration& config) {
    out << "Configuration: " << config.hash.GetSeed() << std::endl;
    return out;
}

BDConfiguration::BDConfiguration(const std::set<ModuleData> &modData, Origin origin) : Configuration(modData), origin(origin) {
    hash.SetFounder(this);
}

Origin BDConfiguration::GetOrigin() const {
    return origin;
}

BDConfiguration *BDConfiguration::AddEdge(const std::set<ModuleData> &modData) {
    next.push_back(new BDConfiguration(modData, origin));
    return static_cast<BDConfiguration*>(next.back()); // NOLINT We can use static here it's fine
}

template <typename Heuristic>
auto BDConfiguration::CompareBDConfiguration(const BDConfiguration* start, const BDConfiguration* final, Heuristic heuristic) {
    return [start, final, heuristic](BDConfiguration* c1, BDConfiguration* c2) {
#if CONFIG_PARALLEL_MOVES
        const float cost1 = c1->GetCost() + (c1->GetOrigin() == START ? (c1->*heuristic)(final) : (c1->*heuristic)(start)) / ModuleIdManager::MinStaticID();
        const float cost2 = c2->GetCost() + (c2->GetOrigin() == START ? (c2->*heuristic)(final) : (c2->*heuristic)(start)) / ModuleIdManager::MinStaticID();
#else
        const float cost1 = c1->GetCost() + (c1->GetOrigin() == START ? (c1->*heuristic)(final) : (c1->*heuristic)(start));
        const float cost2 = c2->GetCost() + (c2->GetOrigin() == START ? (c2->*heuristic)(final) : (c2->*heuristic)(start));
#endif
        return (cost1 == cost2) ? c1->GetCost() > c2->GetCost() : cost1 > cost2;
    };
}

int ConfigurationSpace::depth = -1;

std::vector<const Configuration*> ConfigurationSpace::BFS(Configuration* start, const Configuration* final) {
#if CONFIG_OUTPUT_JSON
    SearchAnalysis::EnterGraph("BFSDepthOverTime");
    SearchAnalysis::LabelGraph("BFS Depth over Time");
    SearchAnalysis::LabelAxes("Time (μs)", "Depth");
    SearchAnalysis::SetInterpolationOrder(0);
    SearchAnalysis::EnterGraph("BFSStatesVisitedOverTime");
    SearchAnalysis::LabelGraph("BFS States visited over Time");
    SearchAnalysis::LabelAxes("Time (μs)", "States visited");
    SearchAnalysis::SetInterpolationOrder(1);
    SearchAnalysis::EnterGraph("BFSStatesDiscoveredOverTime");
    SearchAnalysis::LabelGraph("BFS States discovered over Time");
    SearchAnalysis::LabelAxes("Time (μs)", "States discovered");
    SearchAnalysis::SetInterpolationOrder(1);
    SearchAnalysis::StartClock();
#endif
    int dupesAvoided = 0;
    int statesProcessed = 0;
    std::queue<Configuration*> q;
    std::unordered_set<HashedState> visited;
    q.push(start);
    visited.insert(start->GetHash());
    while (!q.empty()) {
        Configuration* current = q.front();
        Lattice::UpdateFromModuleInfo(q.front()->GetModData());
#if CONFIG_VERBOSE > CS_LOG_NONE
#if CONFIG_OUTPUT_JSON
        SearchAnalysis::PauseClock();
#endif
        if (q.front()->depth != depth) {
            depth++;
#if CONFIG_VERBOSE > CS_LOG_FINAL_DEPTH
            std::cout << "BFS Depth: " << q.front()->depth << std::endl
            << "Duplicate states Avoided: " << dupesAvoided << std::endl
            << "States Discovered: " << visited.size() << std::endl
            << "States Processed: " << statesProcessed << std::endl
            << Lattice::ToString() << std::endl;
#if CONFIG_OUTPUT_JSON
            SearchAnalysis::EnterGraph("BFSDepthOverTime");
            SearchAnalysis::InsertTimePoint(depth);
            SearchAnalysis::EnterGraph("BFSStatesVisitedOverTime");
            SearchAnalysis::InsertTimePoint(statesProcessed);
            SearchAnalysis::EnterGraph("BFSStatesDiscoveredOverTime");
            SearchAnalysis::InsertTimePoint(visited.size());
#endif
#endif
        }
#if CONFIG_OUTPUT_JSON
        SearchAnalysis::ResumeClock();
#endif
#endif
        q.pop();
        if (current->GetHash() == final->GetHash()) {
#if CONFIG_VERBOSE > CS_LOG_FINAL_DEPTH
#if CONFIG_OUTPUT_JSON
            SearchAnalysis::PauseClock();
#endif
            std::cout << "BFS Final Depth: " << q.front()->depth << std::endl
            << "Duplicate states Avoided: " << dupesAvoided << std::endl
            << "States Discovered: " << visited.size() << std::endl
            << "States Processed: " << statesProcessed << std::endl
            << Lattice::ToString() << std::endl;
#if CONFIG_OUTPUT_JSON
            SearchAnalysis::EnterGraph("BFSDepthOverTime");
            SearchAnalysis::InsertTimePoint(depth);
            SearchAnalysis::EnterGraph("BFSStatesVisitedOverTime");
            SearchAnalysis::InsertTimePoint(statesProcessed);
            SearchAnalysis::EnterGraph("BFSStatesDiscoveredOverTime");
            SearchAnalysis::InsertTimePoint(visited.size());
#endif
#endif
            return FindPath(start, current);
        }
#if !CONFIG_PARALLEL_MOVES
        auto adjList = current->MakeAllMoves();
#else
        auto adjList = MoveManager::MakeAllParallelMoves(visited);
#endif
        statesProcessed++;
        for (const auto& moduleInfo : adjList) {
#if !CONFIG_PARALLEL_MOVES
            if (visited.find(HashedState(moduleInfo)) == visited.end()) {
#endif
                auto nextConfiguration = current->AddEdge(moduleInfo);
                nextConfiguration->SetParent(current);
                q.push(nextConfiguration);
                nextConfiguration->depth = current->depth + 1;
#if !CONFIG_PARALLEL_MOVES
                visited.insert(HashedState(moduleInfo));
            } else {
                dupesAvoided++;
            }
#endif
        }
    }
    throw SearchExcept();
}

std::vector<const Configuration*> ConfigurationSpace::BiDirectionalBFS(BDConfiguration* start, BDConfiguration* final) {
#if CONFIG_OUTPUT_JSON
    SearchAnalysis::EnterGraph("BDBFSDepthOverTime");
    SearchAnalysis::LabelGraph("BFS Depth over Time (Bi-Directional)");
    SearchAnalysis::LabelAxes("Time (μs)", "Depth");
    SearchAnalysis::SetInterpolationOrder(0);
    SearchAnalysis::EnterGraph("BDBFSStartDepthOverTime");
    SearchAnalysis::LabelGraph("BFS Depth from start over Time (Bi-Directional)");
    SearchAnalysis::LabelAxes("Time (μs)", "Depth");
    SearchAnalysis::SetInterpolationOrder(0);
    SearchAnalysis::EnterGraph("BDBFSFinalDepthOverTime");
    SearchAnalysis::LabelGraph("BFS Depth from end over Time (Bi-Directional)");
    SearchAnalysis::LabelAxes("Time (μs)", "Depth");
    SearchAnalysis::SetInterpolationOrder(0);
    SearchAnalysis::EnterGraph("BDBFSStatesVisitedOverTime");
    SearchAnalysis::LabelGraph("BFS States visited over Time (Bi-Directional)");
    SearchAnalysis::LabelAxes("Time (μs)", "States visited");
    SearchAnalysis::SetInterpolationOrder(1);
    SearchAnalysis::EnterGraph("BDBFSStatesDiscoveredOverTime");
    SearchAnalysis::LabelGraph("BFS States discovered over Time (Bi-Directional)");
    SearchAnalysis::LabelAxes("Time (μs)", "States discovered");
    SearchAnalysis::SetInterpolationOrder(1);
    SearchAnalysis::StartClock();
#endif
    int dupesAvoided = 0;
    int statesProcessed = 0;
    int depthFromStart = 0;
    int depthFromFinal = 0;
    std::queue<BDConfiguration*> q;
    std::unordered_set<HashedState> visited;
    q.push(start);
    final->depth = 1;
    q.push(final);
    visited.insert(start->GetHash());
    visited.insert(final->GetHash());
    while (!q.empty()) {
        BDConfiguration* current = q.front();
        Lattice::UpdateFromModuleInfo(q.front()->GetModData());
#if CONFIG_VERBOSE > CS_LOG_NONE
#if CONFIG_OUTPUT_JSON
        SearchAnalysis::PauseClock();
#endif
        if ((q.front()->GetOrigin() == START && q.front()->depth != depthFromStart) ||
            (q.front()->GetOrigin() == END && q.front()->depth != depthFromFinal)) {
            if (q.front()->GetOrigin() == START) {
                depthFromStart = q.front()->depth;
            } else {
                depthFromFinal = q.front()->depth;
            }
#if CONFIG_VERBOSE > CS_LOG_FINAL_DEPTH
            std::cout << "BDBFS Depth: " << depthFromStart + depthFromFinal << std::endl
            << "Depth from initial configuration: " << depthFromStart << std::endl
            << "Depth from final configuration: " << depthFromFinal << std::endl
            << "Duplicate states Avoided: " << dupesAvoided << std::endl
            << "States Discovered: " << visited.size() << std::endl
            << "States Processed: " << statesProcessed << std::endl
            << Lattice::ToString() << std::endl;
#if CONFIG_OUTPUT_JSON
            SearchAnalysis::EnterGraph("BDBFSDepthOverTime");
            SearchAnalysis::InsertTimePoint(depthFromStart + depthFromFinal);
            SearchAnalysis::EnterGraph("BDBFSStartDepthOverTime");
            SearchAnalysis::InsertTimePoint(depthFromStart);
            SearchAnalysis::EnterGraph("BDBFSFinalDepthOverTime");
            SearchAnalysis::InsertTimePoint(depthFromFinal);
            SearchAnalysis::EnterGraph("BDBFSStatesVisitedOverTime");
            SearchAnalysis::InsertTimePoint(statesProcessed);
            SearchAnalysis::EnterGraph("BDBFSStatesDiscoveredOverTime");
            SearchAnalysis::InsertTimePoint(visited.size());
#endif
#endif
        }
#if CONFIG_OUTPUT_JSON
        SearchAnalysis::ResumeClock();
#endif
#endif
        q.pop();
        if ((current->GetOrigin() == START && current->GetHash() == final->GetHash()) ||
            (current->GetOrigin() == END && current->GetHash() == start->GetHash())) {
#if CONFIG_VERBOSE > CS_LOG_FINAL_DEPTH
#if CONFIG_OUTPUT_JSON
            SearchAnalysis::PauseClock();
#endif
            std::cout << "BDBFS Final Depth: " << depthFromStart + depthFromFinal << std::endl
            << "Depth from initial configuration: " << depthFromStart << std::endl
            << "Depth from final configuration: " << depthFromFinal << std::endl
            << "Duplicate states Avoided: " << dupesAvoided << std::endl
            << "States Discovered: " << visited.size() << std::endl
            << "States Processed: " << statesProcessed << std::endl
            << Lattice::ToString() << std::endl;
#if CONFIG_OUTPUT_JSON
            SearchAnalysis::EnterGraph("BDBFSDepthOverTime");
            SearchAnalysis::InsertTimePoint(depthFromStart + depthFromFinal);
            SearchAnalysis::EnterGraph("BDBFSStartDepthOverTime");
            SearchAnalysis::InsertTimePoint(depthFromStart);
            SearchAnalysis::EnterGraph("BDBFSFinalDepthOverTime");
            SearchAnalysis::InsertTimePoint(depthFromFinal);
            SearchAnalysis::EnterGraph("BDBFSStatesVisitedOverTime");
            SearchAnalysis::InsertTimePoint(statesProcessed);
            SearchAnalysis::EnterGraph("BDBFSStatesDiscoveredOverTime");
            SearchAnalysis::InsertTimePoint(visited.size());
#endif
#endif
            if (current->GetOrigin() == START) {
                return FindPath(start, current);
            }
            return FindPath(final, current, false);
        }
#if !CONFIG_PARALLEL_MOVES
        auto adjList = current->MakeAllMoves();
#else
        auto adjList = MoveManager::MakeAllParallelMoves(visited);
#endif
        statesProcessed++;
        for (const auto& moduleInfo : adjList) {
#if !CONFIG_PARALLEL_MOVES
            if (visited.find(HashedState(moduleInfo)) == visited.end()) {
#endif
                auto nextConfiguration = current->AddEdge(moduleInfo);
                nextConfiguration->SetParent(current);
                q.push(nextConfiguration);
                nextConfiguration->depth = current->depth + 1;
#if !CONFIG_PARALLEL_MOVES
                visited.insert(nextConfiguration->GetHash());
            } else if (static_cast<const BDConfiguration *>(visited.find(HashedState(moduleInfo))->FoundAt())-> // NOLINT Trust me, it will be BDConfiguration
                       GetOrigin() != current->GetOrigin()) {
                if (current->GetOrigin() == START) {
                    depthFromStart++;
                } else {
                    depthFromFinal++;
                }
#if CONFIG_VERBOSE > CS_LOG_FINAL_DEPTH
#if CONFIG_OUTPUT_JSON
                SearchAnalysis::PauseClock();
#endif
                std::cout << "BDBFS found path via collision!" << std::endl;
                std::cout << "BDBFS Final Depth: " << depthFromStart + depthFromFinal << std::endl
                << "Depth from initial configuration: " << depthFromStart << std::endl
                << "Depth from final configuration: " << depthFromFinal << std::endl
                << "Duplicate states Avoided: " << dupesAvoided << std::endl
                << "States Discovered: " << visited.size() << std::endl
                << "States Processed: " << statesProcessed << std::endl
                << Lattice::ToString() << std::endl;
#if CONFIG_OUTPUT_JSON
                SearchAnalysis::EnterGraph("BDBFSDepthOverTime");
                SearchAnalysis::InsertTimePoint(depthFromStart + depthFromFinal);
                SearchAnalysis::EnterGraph("BDBFSStartDepthOverTime");
                SearchAnalysis::InsertTimePoint(depthFromStart);
                SearchAnalysis::EnterGraph("BDBFSFinalDepthOverTime");
                SearchAnalysis::InsertTimePoint(depthFromFinal);
                SearchAnalysis::EnterGraph("BDBFSStatesVisitedOverTime");
                SearchAnalysis::InsertTimePoint(statesProcessed);
                SearchAnalysis::EnterGraph("BDBFSStatesDiscoveredOverTime");
                SearchAnalysis::InsertTimePoint(visited.size());
#endif
#endif
                std::vector<const Configuration*> path, pathRemainder;
                if (current->GetOrigin() == START) {
                    path = FindPath(start, current);
                    pathRemainder = FindPath(final, visited.find(HashedState(moduleInfo))->FoundAt(), false);
                } else {
                    path = FindPath(start, visited.find(HashedState(moduleInfo))->FoundAt());
                    pathRemainder = FindPath(final, current, false);
                }
                path.insert(path.end(), pathRemainder.begin(), pathRemainder.end());
                return path;
            } else {
                dupesAvoided++;
            }
#endif
        }
    }
    throw SearchExcept();
}

int Configuration::GetCost() const {
    return cost;
}

void Configuration::SetCost(const int cost) {
    this->cost = cost;
}

template <typename Heuristic>
auto Configuration::CompareConfiguration(const Configuration* final, Heuristic heuristic) {
    return [final, heuristic](Configuration* c1, Configuration* c2) {
#if CONFIG_PARALLEL_MOVES
        const float cost1 = c1->GetCost() + (c1->*heuristic)(final) / ModuleIdManager::MinStaticID();
        const float cost2 = c2->GetCost() + (c2->*heuristic)(final) / ModuleIdManager::MinStaticID();
#else
        const float cost1 = c1->GetCost() + (c1->*heuristic)(final);
        const float cost2 = c2->GetCost() + (c2->*heuristic)(final);
#endif
        return (cost1 == cost2) ? c1->GetCost() > c2->GetCost() : cost1 > cost2;
    };
}

bool Configuration::ValarrayComparator::operator()(const std::valarray<int>& lhs, const std::valarray<int>& rhs) const {
    for (size_t i = 0; i < std::min(lhs.size(), rhs.size()); ++i) {
        if (lhs[i] < rhs[i]) return true;
        if (lhs[i] > rhs[i]) return false;
    }
    return lhs.size() < rhs.size();
}

float Configuration::ManhattanDistance(const Configuration* final) const {
    auto& currentData = this->GetModData();
    auto& finalData = final->GetModData();
    auto currentIt = currentData.begin();
    auto finalIt = finalData.begin();
    float h = 0;
    std::valarray<int> diff(0, Lattice::Order());
    while (currentIt != currentData.end() && finalIt != finalData.end()) {
        const auto& currentModule = *currentIt;
        const auto& finalModule = *finalIt;
        diff += currentModule.Coords() - finalModule.Coords();
        ++currentIt;
        ++finalIt;
    }
    for (auto& val : diff) {
        h += std::abs(val);
    }
    //TODO: find out what the right number is (from testing it must be > 4) (testing was wrong)
    return h / 2;
}

float Configuration::SymmetricDifferenceHeuristic(const Configuration* final) const {
    auto& currentData = this->GetModData();
    auto& finalData = final->GetModData();
    auto currentIt = currentData.begin();
    auto finalIt = finalData.begin();
    std::set<std::valarray<int>, ValarrayComparator> unionCoords;
    while (currentIt != currentData.end() && finalIt != finalData.end()) {
        const auto& currentModule = *currentIt;
        const auto& finalModule = *finalIt;
        unionCoords.insert(currentModule.Coords());
        unionCoords.insert(finalModule.Coords());
        ++currentIt;
        ++finalIt;
    }
    const int symDifference = 2 * unionCoords.size() - (currentData.size() + finalData.size());
    return symDifference / 2;
}

float Configuration::ChebyshevDistance(const Configuration* final) const {
    auto& currentData = this->GetModData();
    auto& finalData = final->GetModData();
    auto currentIt = currentData.begin();
    auto finalIt = finalData.begin();
    int h = 0;
    while (currentIt != currentData.end() && finalIt != finalData.end()) {
        const auto& currentModule = *currentIt;
        const auto& finalModule = *finalIt;
        std::valarray<int> diff = currentModule.Coords() - finalModule.Coords();
        int maxDiff = 0;
        for (auto& val : diff) {
            maxDiff = std::max(maxDiff, std::abs(val));
        }
        h += maxDiff;
        ++currentIt;
        ++finalIt;
    }
    return h;
}

float Configuration::TrueChebyshevDistance(const Configuration *final) const {
    auto& currentData = this->GetModData();
    auto& finalData = final->GetModData();
    auto currentIt = currentData.begin();
    auto finalIt = finalData.begin();
    std::valarray<int> dist(0, Lattice::Order());
    float h = 0;
    std::valarray<int> diff(0, Lattice::Order());
    while (currentIt != currentData.end() && finalIt != finalData.end()) {
        const auto& currentModule = *currentIt;
        const auto& finalModule = *finalIt;
        diff += currentModule.Coords() - finalModule.Coords();
        ++currentIt;
        ++finalIt;
    }
    for (int i = 0; i <= Lattice::Order(); ++i) {
        dist[i] += std::abs(diff[i]);
    }
    //TODO: find out what the right number is (from testing it must be > 2) (testing was wrong)
    return static_cast<float>(*std::max_element(begin(dist), end(dist))) / 2;
}

float Configuration::CacheChebyshevDistance(const Configuration *final) const {
    constexpr int MAX_MOVE_DISTANCE = 2;
    static ChebyshevHeuristicCache cache(final->GetModData());
    float h = 0;
    for (const auto& modData : hash.GetState()) {
        h += cache[modData.Coords()];
    }
    return h / MAX_MOVE_DISTANCE;
}

float Configuration::CacheMoveOffsetDistance(const Configuration *final) const {
    static MoveOffsetHeuristicCache cache(final->GetModData());
    float h = 0;
    for (const auto& modData : hash.GetState()) {
        h += cache[modData.Coords()];
    }
    return h;
}

float Configuration::CacheMoveOffsetPropertyDistance(const Configuration *final) const {
    static MoveOffsetPropertyHeuristicCache cache(final->GetModData());
    float h = 0;
    for (const auto& modData : hash.GetState()) {
        h += cache(modData.Coords(), modData.Properties().AsInt());
    }
    return h;
}

std::vector<const Configuration*> ConfigurationSpace::AStar(Configuration* start, const Configuration* final, const std::string& heuristic) {
#if CONFIG_OUTPUT_JSON
    SearchAnalysis::EnterGraph("AStarDepthOverTime_" + heuristic);
    SearchAnalysis::LabelGraph("A* Depth over Time (" + heuristic + ")");
    SearchAnalysis::LabelAxes("Time (μs)", "Depth");
    SearchAnalysis::SetInterpolationOrder(0);
    SearchAnalysis::EnterGraph("AStarEstimatedDepthOverTime_" + heuristic);
    SearchAnalysis::LabelGraph("A* Estimated Final Depth over Time (" + heuristic + ")");
    SearchAnalysis::LabelAxes("Time (μs)", "Estimated Final Depth");
    SearchAnalysis::SetInterpolationOrder(0);
    SearchAnalysis::EnterGraph("AStarEstimatedProgressOverTime_" + heuristic);
    SearchAnalysis::LabelGraph("A* Estimated Progress over Time (" + heuristic + ")");
    SearchAnalysis::LabelAxes("Time (μs)", "Estimated Search Progress (%)");
    SearchAnalysis::SetInterpolationOrder(0);
    SearchAnalysis::EnterGraph("AStarStatesVisitedOverTime_" + heuristic);
    SearchAnalysis::LabelGraph("A* States visited over Time (" + heuristic + ")");
    SearchAnalysis::LabelAxes("Time (μs)", "States visited");
    SearchAnalysis::SetInterpolationOrder(1);
    SearchAnalysis::EnterGraph("AStarStatesDiscoveredOverTime_" + heuristic);
    SearchAnalysis::LabelGraph("A* States discovered over Time (" + heuristic + ")");
    SearchAnalysis::LabelAxes("Time (μs)", "States discovered");
    SearchAnalysis::SetInterpolationOrder(1);
    SearchAnalysis::StartClock();
#endif
    int dupesAvoided = 0;
    int statesProcessed = 0;
    int estimatedFinalDepth = 0;
#if CONFIG_CONSISTENT_HEURISTIC_VALIDATOR
    int previousEstimate = 0;
#endif
    float (Configuration::*hFunc)(const Configuration *final) const;
    if (heuristic == "Symmetric Difference" || heuristic == "symmetric difference" || heuristic == "SymDiff" || heuristic == "symdiff") {
        hFunc = &Configuration::SymmetricDifferenceHeuristic;
    } else if (heuristic == "Manhattan" || heuristic == "manhattan") {
        hFunc = &Configuration::ManhattanDistance;
    } else if (heuristic == "Chebyshev" || heuristic == "chebyshev") {
        hFunc = &Configuration::TrueChebyshevDistance;
    } else if (heuristic == "Nearest Chebyshev" || heuristic == "nearest chebyshev") {
        hFunc = &Configuration::CacheChebyshevDistance;
    } else if (Lattice::ignoreProperties || ModuleProperties::AnyDynamicPropertiesLinked()) {
        // If properties are ignored it doesn't make sense to use the property-based cache
        // The property-based cache also doesn't work with dynamic properties
        hFunc = &Configuration::CacheMoveOffsetDistance;
    } else {
        hFunc = &Configuration::CacheMoveOffsetPropertyDistance;
    }
    auto compare = Configuration::CompareConfiguration(final, hFunc);
    using CompareType = decltype(compare);
    std::priority_queue<Configuration*, std::vector<Configuration*>, CompareType> pq(compare);
    std::unordered_set<HashedState> visited;
    start->SetCost(0);
    pq.push(start);
    visited.insert(start->GetHash());

    while (!pq.empty()) {
        Configuration* current = pq.top();
        Lattice::UpdateFromModuleInfo(current->GetModData());
#if CONFIG_VERBOSE > CS_LOG_NONE
#if CONFIG_OUTPUT_JSON
        SearchAnalysis::PauseClock();
#endif
#if CONFIG_CONSISTENT_HEURISTIC_VALIDATOR
#if CONFIG_PARALLEL_MOVES
        estimatedFinalDepth = current->depth + static_cast<int>((current->*hFunc)(final)) / ModuleIdManager::MinStaticID();
#else
        estimatedFinalDepth = current->depth + static_cast<int>((current->*hFunc)(final));
#endif
        if (estimatedFinalDepth < previousEstimate) {
            throw HeuristicExcept();
        }
        if (estimatedFinalDepth > previousEstimate) {
            previousEstimate = estimatedFinalDepth;
        }
#endif
        if (current->depth != depth) {
            depth = current->depth;
#if !CONFIG_CONSISTENT_HEURISTIC_VALIDATOR
#if CONFIG_PARALLEL_MOVES
            estimatedFinalDepth = current->depth + static_cast<int>((current->*hFunc)(final)) / ModuleIdManager::MinStaticID();
#else
            estimatedFinalDepth = current->depth + static_cast<int>((current->*hFunc)(final));
#endif
#endif
#if CONFIG_VERBOSE > CS_LOG_FINAL_DEPTH
            std::cout << "A* Depth: " << current->depth << std::endl
                    << "Estimated Final Depth: " << estimatedFinalDepth << std::endl
                    << "Duplicate states Avoided: " << dupesAvoided << std::endl
                    << "States Discovered: " << visited.size() << std::endl
                    << "States Processed: " << statesProcessed << std::endl
                    << Lattice::ToString() << std::endl;
#if CONFIG_OUTPUT_JSON
            SearchAnalysis::EnterGraph("AStarDepthOverTime_" + heuristic);
            SearchAnalysis::InsertTimePoint(depth);
            SearchAnalysis::EnterGraph("AStarEstimatedDepthOverTime_" + heuristic);
            SearchAnalysis::InsertTimePoint(estimatedFinalDepth);
            SearchAnalysis::EnterGraph("AStarEstimatedProgressOverTime_" + heuristic);
            SearchAnalysis::InsertTimePoint(static_cast<float>(depth) / static_cast<float>(estimatedFinalDepth) * 100);
            SearchAnalysis::EnterGraph("AStarStatesVisitedOverTime_" + heuristic);
            SearchAnalysis::InsertTimePoint(statesProcessed);
            SearchAnalysis::EnterGraph("AStarStatesDiscoveredOverTime_" + heuristic);
            SearchAnalysis::InsertTimePoint(visited.size());
#endif
#endif
        }
#if CONFIG_OUTPUT_JSON
        SearchAnalysis::ResumeClock();
#endif
#endif
        pq.pop();
        if (current->GetHash() == final->GetHash()) {
#if CONFIG_VERBOSE > CS_LOG_FINAL_DEPTH
#if CONFIG_OUTPUT_JSON
            SearchAnalysis::PauseClock();
#endif
#if CONFIG_PARALLEL_MOVES
            estimatedFinalDepth = current->depth + static_cast<int>((current->*hFunc)(final)) / ModuleIdManager::MinStaticID();
#else
            estimatedFinalDepth = current->depth + static_cast<int>((current->*hFunc)(final));
#endif
            std::cout << "A* Final Depth: " << current->depth << std::endl
                    << "Estimated Final Depth: " << estimatedFinalDepth << std::endl
                    << "Duplicate states Avoided: " << dupesAvoided << std::endl
                    << "States Discovered: " << visited.size() << std::endl
                    << "States Processed: " << statesProcessed << std::endl
                    << Lattice::ToString() << std::endl;
#if CONFIG_OUTPUT_JSON
            SearchAnalysis::EnterGraph("AStarDepthOverTime_" + heuristic);
            SearchAnalysis::InsertTimePoint(depth);
            SearchAnalysis::EnterGraph("AStarEstimatedDepthOverTime_" + heuristic);
            SearchAnalysis::InsertTimePoint(estimatedFinalDepth);
            SearchAnalysis::EnterGraph("AStarEstimatedProgressOverTime_" + heuristic);
            SearchAnalysis::InsertTimePoint(static_cast<float>(depth) / static_cast<float>(estimatedFinalDepth) * 100);
            SearchAnalysis::EnterGraph("AStarStatesVisitedOverTime_" + heuristic);
            SearchAnalysis::InsertTimePoint(statesProcessed);
            SearchAnalysis::EnterGraph("AStarStatesDiscoveredOverTime_" + heuristic);
            SearchAnalysis::InsertTimePoint(visited.size());
#endif
#endif
            return FindPath(start, current);
        }
#if !CONFIG_PARALLEL_MOVES
        auto adjList = current->MakeAllMoves();
#else
        auto adjList = MoveManager::MakeAllParallelMoves(visited);
#endif
        statesProcessed++;
        for (const auto& moduleInfo : adjList) {
#if !CONFIG_PARALLEL_MOVES
            if (HashedState hashedState(moduleInfo); visited.find(hashedState) == visited.end()) {
#endif
                auto nextConfiguration = current->AddEdge(moduleInfo);
                nextConfiguration->SetParent(current);
                nextConfiguration->SetCost(current->GetCost() + 1);
                pq.push(nextConfiguration);
                nextConfiguration->depth = current->depth + 1;
#if !CONFIG_PARALLEL_MOVES
                visited.insert(hashedState);
            } else {
                dupesAvoided++;
            }
#endif
        }
    }
    throw SearchExcept();
}

std::vector<const Configuration*> ConfigurationSpace::FindPath(const Configuration* start, const Configuration* final, const bool shouldReverse) {
    std::vector<const Configuration*> path;
    const Configuration* current = final;
    while (current->GetHash() != start->GetHash()) {
        path.push_back(current);
        current = current->GetParent();
    }
    path.push_back(start);
    if (shouldReverse) {
        std::reverse(path.begin(), path.end());
    }
    return path;
}

Configuration ConfigurationSpace::GenerateRandomFinal(const int targetMoves) {
    std::unordered_set<HashedState> visited;
    const std::set<ModuleData> initialState = Lattice::GetModuleInfo();
    std::set<ModuleData> nextState;

    for (int i = 0; i < targetMoves; i++) {
        // Get current configuration
        Configuration current(Lattice::GetModuleInfo());
        // Get adjacent configurations
#if CONFIG_PARALLEL_MOVES
        auto adjList = MoveManager::MakeAllParallelMoves(visited);
#else
        auto adjList = current.MakeAllMoves();
#endif
        // Shuffle the adjacent configurations
        std::shuffle(adjList.begin(), adjList.end(), std::mt19937{std::random_device{}()});
        // Search through shuffled configurations until an unvisited one is found
        nextState = {};
#if CONFIG_PARALLEL_MOVES
        if (!adjList.empty()) {
            nextState = adjList.front();
        }
#else
        for (const auto& state: adjList) {
            if (visited.find(HashedState(state)) == visited.end()) {
                nextState = state;
                break;
            }
        }
#endif
        // Check to see if a valid adjacent state was found
        if (nextState.empty()) {
            // If no adjacent state was found, return early
            std::cerr << "GenerateRandomFinal returning early (" << i << "/" << targetMoves << " moves) due to lack of new moves" << std::endl;
            Lattice::UpdateFromModuleInfo(initialState);
            return current;
        }
        // Otherwise, update lattice with new state and resume loop
        visited.insert(HashedState(nextState));
        Lattice::UpdateFromModuleInfo(nextState);
    }

    // Reset lattice to original state and return
    Lattice::UpdateFromModuleInfo(initialState);
    return Configuration(nextState);
}