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
#ifndef CONFIG_VERBOSE
#define CONFIG_VERBOSE CS_LOG_EVERY_DEPTH
#endif
/* Parallel Move Configuration
 * This is for permitting multiple moves in one step, not threading the search!
 */
#ifndef CONFIG_PARALLEL_MOVES
#define CONFIG_PARALLEL_MOVES false
#endif
/* Consistent Heuristic Validation Configuration
 * Enabling this will cause an exception to be thrown if a heuristic is observed to be non-consistent.
 * The check is done by testing to ensure that the estimated final depth never decreases.
 */
#ifndef CONFIG_CONSISTENT_HEURISTIC_VALIDATOR
#define CONFIG_CONSISTENT_HEURISTIC_VALIDATOR true
#endif
/* JSON Output Configuration
 * In order to output JSON successfully logging must be enabled for every depth
 */
#ifndef CONFIG_OUTPUT_JSON
#define CONFIG_OUTPUT_JSON false
#endif
#if (CONFIG_VERBOSE != CS_LOG_EVERY_DEPTH || !CONFIG_CONSISTENT_HEURISTIC_VALIDATOR) && CONFIG_OUTPUT_JSON
#warning "JSON output disabled due to insufficient logging!"
#define CONFIG_OUTPUT_JSON false
#endif

class SearchExcept final : std::exception {
public:
    [[nodiscard]]
    const char* what() const noexcept override;
};

class HeuristicExcept final : public std::exception {
    public:
    [[nodiscard]]
    const char* what() const noexcept override;
};

class Configuration;

// For comparing the state of a lattice and a configuration
class HashedState {
private:
    size_t seed;
    std::set<ModuleData> moduleData;
    const Configuration* foundAt;
    int depth;
public:
    HashedState() = delete;

    explicit HashedState(const std::set<ModuleData>& modData, int depth = 0);

    HashedState(const HashedState& other);

    [[nodiscard]]
    size_t GetSeed() const;

    [[nodiscard]]
    const std::set<ModuleData>& GetState() const;

    void SetFounder(const Configuration* founder);

    [[nodiscard]]
    const Configuration* FoundAt() const;

    void SetDepth(int depth);

    [[nodiscard]]
    int GetDepth() const;

    bool operator==(const HashedState& other) const;

    bool operator!=(const HashedState& other) const;
};

template<>
struct std::hash<HashedState> {
    size_t operator()(const HashedState& state) const noexcept;
};

// For tracking the state of a lattice
class Configuration {
protected:
    Configuration* parent = nullptr;
    std::vector<Configuration*> next;
    HashedState hash;
    int cost;
public:
    int depth = 0;

    explicit Configuration(const std::set<ModuleData>& modData);

    virtual ~Configuration();

    [[nodiscard]]
    std::vector<std::set<ModuleData>> MakeAllMoves() const;

    [[nodiscard]]
    std::vector<std::set<ModuleData>> MakeAllMovesForAllVertices() const;

    virtual Configuration* AddEdge(const std::set<ModuleData>& modData);

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

    float SymmetricDifferenceHeuristic(const Configuration* final) const;

    float ChebyshevDistance(const Configuration* final) const;

    float TrueChebyshevDistance(const Configuration* final) const;

    float CacheChebyshevDistance(const Configuration* final) const;

    float CacheMoveOffsetDistance(const Configuration* final) const;

    float CacheMoveOffsetPropertyDistance(const Configuration* final) const;
};

enum Origin {
    START = 0,
    END = 1
};

class BDConfiguration : public Configuration {
private:
    Origin origin = START;
public:
    explicit BDConfiguration(const std::set<ModuleData>& modData, Origin origin);

    Origin GetOrigin() const;

    BDConfiguration* AddEdge(const std::set<ModuleData>& modData) override;

    template <typename Heuristic>
    static auto CompareBDConfiguration(const BDConfiguration* start, const BDConfiguration* final, Heuristic heuristic);

    float BDCacheMoveOffsetDistance(const Configuration* final) const;

    float BDCacheMoveOffsetPropertyDistance(const Configuration* final) const;
};

namespace ConfigurationSpace {
    extern int depth;

    std::vector<const Configuration*> BFS(Configuration* start, const Configuration* final);

    std::vector<const Configuration*> BiDirectionalBFS(BDConfiguration* start, BDConfiguration* final);

    std::vector<const Configuration*> AStar(Configuration* start, const Configuration* final, const std::string& heuristic);

    std::vector<const Configuration*> BDAStar(BDConfiguration* start, BDConfiguration* final, const std::string& heuristic);

    std::vector<const Configuration*> FindPath(const Configuration* start, const Configuration* final, bool shouldReverse = true);

    Configuration GenerateRandomFinal(int targetMoves = 8);
}

#endif //MODULAR_ROBOTICS_CONFIGURATIONSPACE_H
