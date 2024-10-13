#ifndef MODULAR_ROBOTICS_CONFIGURATIONSPACE_H
#define MODULAR_ROBOTICS_CONFIGURATIONSPACE_H

#include <vector>
#include "../lattice/Lattice.h"

// Verbosity Constants (Don't change these)
#define CS_LOG_NONE 0
#define CS_LOG_FINAL_DEPTH 1
#define CS_LOG_EVERY_DEPTH 2
/* Verbosity Configuration
 * NONE: No output from BFS
 * FINAL_DEPTH: Output final depth and configuration upon BFS completion
 * EVERY_DEPTH: Output current depth and configuration every time BFS depth increases
 */
#define CONFIG_VERBOSE CS_LOG_EVERY_DEPTH
/* Parallel Move Configuration
 * This is for permitting multiple moves in one step, not threading the search!
 */
#define CONFIG_PARALLEL_MOVES false
/* JSON Output Configuration
 * In order to output JSON successfully logging must be enabled for every depth
 */
#define CONFIG_OUTPUT_JSON false
#if CONFIG_VERBOSE != CS_LOG_EVERY_DEPTH && CONFIG_OUTPUT_JSON
#warning "JSON output disabled due to insufficient logging!"
#define CONFIG_OUTPUT_JSON false
#endif

class BFSExcept final : std::exception {
public:
    [[nodiscard]]
    const char * what() const noexcept override;
};

// For comparing the state of a lattice and a configuration
class HashedState {
private:
    size_t seed;
    std::set<ModuleData> moduleData;
public:
    HashedState() = delete;

    explicit HashedState(const std::set<ModuleData>& modData);

    HashedState(const HashedState& other);

    [[nodiscard]]
    size_t GetSeed() const;

    [[nodiscard]]
    const std::set<ModuleData>& GetState() const;

    bool operator==(const HashedState& other) const;

    bool operator!=(const HashedState& other) const;
};

template<>
struct std::hash<HashedState> {
    size_t operator()(const HashedState& state) const noexcept;
};

// For tracking the state of a lattice
class Configuration {
private:
    Configuration* parent = nullptr;
    std::vector<Configuration*> next;
    HashedState hash;
    int cost;
public:
    int depth = 0;

    explicit Configuration(const std::set<ModuleData>& modData);

    ~Configuration();

    [[nodiscard]]
    std::vector<std::set<ModuleData>> MakeAllMoves() const;

    [[nodiscard]]
    std::vector<std::set<ModuleData>> MakeAllMovesForAllVertices() const;

    Configuration* AddEdge(const std::set<ModuleData>& modData);

    [[nodiscard]]
    Configuration* GetParent() const;

    [[nodiscard]]
    std::vector<Configuration*> GetNext() const;

    [[nodiscard]]
    const HashedState& GetHash() const;

    [[nodiscard]]
    const std::set<ModuleData>& GetModData() const;

    void SetParent(Configuration* configuration);

    friend std::ostream& operator<<(std::ostream& out, const Configuration& config);

    int GetCost() const;

    void SetCost(int cost);

    template <typename Heuristic>
    static auto CompareConfiguration(const Configuration* final, Heuristic heuristic);

    struct ValarrayComparator {
        bool operator()(const std::valarray<int>& lhs, const std::valarray<int>& rhs) const;
    };

    float ManhattanDistance(const Configuration* final) const;

    int SymmetricDifferenceHeuristic(const Configuration* final) const;

    int ChebyshevDistance(const Configuration* final) const;

    float TrueChebyshevDistance(const Configuration* final) const;

    float CacheChebyshevDistance(const Configuration* final) const;

    float CacheMoveOffsetDistance(const Configuration* final) const;

    float CacheMoveOffsetPropertyDistance(const Configuration* final) const;
};

namespace ConfigurationSpace {
    extern int depth;

    std::vector<Configuration*> BFS(Configuration* start, const Configuration* final);

    std::vector<Configuration*> AStar(Configuration* start, const Configuration* final);

    std::vector<Configuration*> FindPath(Configuration* start, Configuration* final);

    Configuration GenerateRandomFinal(int targetMoves = 8);
}

#endif //MODULAR_ROBOTICS_CONFIGURATIONSPACE_H
