#include "TranspositionTable.hpp"
#include <algorithm>
#include <stdexcept>
#include <utility>


 
// TTEntry
 
TTEntry::TTEntry(const HashedState& s, double est, double g)
    : state(s),
      estimate(est),
      gCost(0),
      subtreeSize(0),
      accessCount(0),
      lastAccess(std::chrono::steady_clock::now())
{
}


 
// Hash Transposition Table
 

HashTranspositionTable::HashTranspositionTable(size_t maxEntries, std::unique_ptr<ReplacementPolicy> policy): maxEntries_(maxEntries), policy_(std::move(policy)){
    if (maxEntries_ == 0) {
        throw std::invalid_argument(
            "Transposition table capacity must be greater than zero"
        );
    }

    // Default to no replacement if no policy is supplied.
    if (!policy_) {
        policy_ = std::make_unique<NoReplacement>();
    }

    table_.reserve(maxEntries_);
}


 
// Lookup
 

TTEntry* HashTranspositionTable::lookup(const HashedState& state){
    auto it = table_.find(state);

    if (it == table_.end()) {
        return nullptr;
    }

    TTEntry& entry = it->second;

    ++entry.accessCount;
    entry.lastAccess = std::chrono::steady_clock::now();

    return &entry;
}


 
// Lookup With G-Cost
 

std::optional<std::pair<double, double>>HashTranspositionTable::lookupWithGCost(const HashedState& state){
    TTEntry* entry = lookup(state);

    if (entry == nullptr) {
        return std::nullopt;
    }

    return std::make_pair(
        entry->estimate,
        entry->gCost
    );
}


 
// Store
 

void HashTranspositionTable::store(const TTEntry& entry){
     
    // Existing entry
     

    auto it = table_.find(entry.state);

    if (it != table_.end()) {
        TTEntry& oldEntry = it->second;

        size_t previousAccessCount =
            oldEntry.accessCount;

        oldEntry = entry;

        oldEntry.accessCount =
            previousAccessCount + 1;

        oldEntry.lastAccess =
            std::chrono::steady_clock::now();

        return;
    }

    // Space available
     

    if (!isFull()) {
        TTEntry newEntry = entry;

        newEntry.accessCount = 1;

        newEntry.lastAccess =
            std::chrono::steady_clock::now();

        table_.emplace(
            newEntry.state,
            std::move(newEntry)
        );

        return;
    }

    evictEntries(entry);

    // If no entry was evicted, the new entry is discarded.
    if (isFull()) {
        return;
    }


     
    // Insert new entry
     

    TTEntry newEntry = entry;

    newEntry.accessCount = 1;

    newEntry.lastAccess =
        std::chrono::steady_clock::now();

    table_.emplace(
        newEntry.state,
        std::move(newEntry)
    );
}


 
// Eviction
 

void HashTranspositionTable::evictEntries(
    const TTEntry& newEntry
)
{
    if (!policy_ || table_.empty()) {
        return;
    }


     
    // Find the lowest-priority existing entry.
     

    auto victim = table_.begin();

    double lowestPriority =
        policy_->getPriority(victim->second);

    for (auto it = std::next(table_.begin());
         it != table_.end();
         ++it) {

        double priority =
            policy_->getPriority(it->second);

        if (priority < lowestPriority) {
            lowestPriority = priority;
            victim = it;
        }
    }


     
    // Ask the replacement policy whether the new entry
    // should replace the selected victim.
     

    if (!policy_->shouldReplace(
            victim->second,
            newEntry)) {

        return;
    }


     
    // Remove victim.
     

    table_.erase(victim);
}


 
// Clear
 

void HashTranspositionTable::clear()
{
    table_.clear();
}


 
// Size
 

size_t HashTranspositionTable::size() const
{
    return table_.size();
}


 
// Capacity
 

size_t HashTranspositionTable::capacity() const
{
    return maxEntries_;
}


 
// Is Full
 

bool HashTranspositionTable::isFull() const
{
    return table_.size() >= maxEntries_;
}