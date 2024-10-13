#ifndef HEURISTICCACHE_H
#define HEURISTICCACHE_H
#include <queue>
#include <valarray>
#include <set>

#include "../coordtensor/CoordTensor.h"
#include "../modules/ModuleManager.h"

/* Heuristic Cache Optimization Configuration
 * When set to true, allows heuristic cache creation to adjust coordinate tensor in order to increase move check speed
 */
#define CONFIG_HEURISTIC_CACHE_OPTIMIZATION true
/* Heuristic Cache Distance Limitations Configuration
 * When set to true, a second internal cache will be built and utilized to forbid heuristics from considering positions
 * that cannot be reached even if all non-static modules are assisting
 */
#define CONFIG_HEURISTIC_CACHE_DIST_LIMITATIONS true
/* Heuristic Cache Help Limitations Configuration
 * When set to true, additional restrictions are placed on the free space checks used to build move offset caches,
 * taking into account the amount of non-static modules that a module may interact with
 */
#define CONFIG_HEURISTIC_CACHE_HELP_LIMITATIONS true
#if CONFIG_HEURISTIC_CACHE_HELP_LIMITATIONS && !CONFIG_HEURISTIC_CACHE_DIST_LIMITATIONS
#warning "Help limitations disabled due to lack of distance limitations!"
#define CONFIG_HEURISTIC_CACHE_HELP_LIMITATIONS false
#endif

struct SearchCoord {
    std::valarray<int> coords;
    float depth;
};

class IHeuristicCache {
protected:
    CoordTensor<float> weightCache;
public:
    IHeuristicCache();

    virtual float operator[](const std::valarray<int>& coords) const;

    virtual ~IHeuristicCache() = default;
};

class ChebyshevHeuristicCache final : public IHeuristicCache {
private:
    static void ChebyshevEnqueueAdjacent(std::queue<SearchCoord>& coordQueue, const SearchCoord& coordInfo);
public:
    explicit ChebyshevHeuristicCache(const std::set<ModuleData>& desiredState);
};

class MoveOffsetHeuristicCache final : public IHeuristicCache {
private:
#if CONFIG_HEURISTIC_CACHE_HELP_LIMITATIONS
    static int currentHelp;
#endif
    static void MoveOffsetEnqueueAdjacent(std::queue<SearchCoord>& coordQueue, const SearchCoord& coordInfo);
public:
    explicit MoveOffsetHeuristicCache(const std::set<ModuleData>& desiredState);
};

struct SearchCoordProp final : public SearchCoord {
    std::uint_fast64_t propInt{};
};

// This cache ONLY works if all module properties remain the same throughout the search
class MoveOffsetPropertyHeuristicCache final : public IHeuristicCache {
private:
#if CONFIG_HEURISTIC_CACHE_HELP_LIMITATIONS
    static int currentHelp;
#endif
    static std::unordered_map<std::uint_fast64_t, int> propConversionMap;

    static void MoveOffsetPropertyEnqueueAdjacent(std::queue<SearchCoordProp>& coordPropQueue, const SearchCoordProp& coordPropInfo);
public:
    explicit MoveOffsetPropertyHeuristicCache(const std::set<ModuleData>& desiredState);

    float operator[](const std::valarray<int>& coords, std::uint_fast64_t propInt) const;
};

#endif //HEURISTICCACHE_H
