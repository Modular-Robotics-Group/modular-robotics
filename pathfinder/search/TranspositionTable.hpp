#pragma once

#include <chrono>
#include <cstddef>
#include <memory>
#include <optional>
#include <utility>

#include <boost/unordered/unordered_flat_map.hpp>

#include "../moves/MoveManager.h"
#include "ConfigurationSpace.h"
#include "HeuristicCache.h"


 
// Transposition Table Entry
 

struct TTEntry {
    HashedState state;

    double estimate;
    double gCost;

    size_t subtreeSize;
    size_t accessCount;

    std::chrono::steady_clock::time_point lastAccess;

    TTEntry();

    TTEntry(
        const HashedState& s,
        double est,
        double g = 0.0
    );
};


 
// Replacement Policy
 

class ReplacementPolicy {
public:
    virtual ~ReplacementPolicy() = default;

    virtual bool shouldReplace(
        const TTEntry& oldEntry,
        const TTEntry& newEntry
    ) const = 0;

    virtual double getPriority(
        const TTEntry& entry
    ) const = 0;
};


 
// No Replacement
 

class NoReplacement : public ReplacementPolicy {
public:
    bool shouldReplace(
        const TTEntry& oldEntry,
        const TTEntry& newEntry
    ) const override
    {
        return false;
    }

    double getPriority(
        const TTEntry& entry
    ) const override
    {
        return 0.0;
    }
};


 
// Subtree Size Replacement
 

class SubtreeSizeReplacement : public ReplacementPolicy {
public:
    bool shouldReplace(
        const TTEntry& oldEntry,
        const TTEntry& newEntry
    ) const override
    {
        return newEntry.subtreeSize > oldEntry.subtreeSize;
    }

    double getPriority(
        const TTEntry& entry
    ) const override
    {
        return static_cast<double>(entry.subtreeSize);
    }
};


 
// Access Frequency Replacement
 

class AccessFrequencyReplacement : public ReplacementPolicy {
public:
    bool shouldReplace(
        const TTEntry& oldEntry,
        const TTEntry& newEntry
    ) const override
    {
        return newEntry.accessCount > oldEntry.accessCount;
    }

    double getPriority(
        const TTEntry& entry
    ) const override
    {
        return static_cast<double>(entry.accessCount);
    }
};


 
// Estimate Replacement
 

class EstimateReplacement : public ReplacementPolicy {
public:
    bool shouldReplace(
        const TTEntry& oldEntry,
        const TTEntry& newEntry
    ) const override
    {
        return newEntry.estimate > oldEntry.estimate;
    }

    double getPriority(
        const TTEntry& entry
    ) const override
    {
        return entry.estimate;
    }
};


 
// Transposition Table
 

class TranspositionTable {
public:
    virtual ~TranspositionTable() = default;

    virtual TTEntry* lookup(
        const HashedState& state
    ) = 0;

    virtual void store(
        const TTEntry& entry
    ) = 0;

    virtual void clear() = 0;

    virtual size_t size() const = 0;

    virtual size_t capacity() const = 0;

    virtual bool isFull() const = 0;

    // DFSTT3
    virtual std::optional<std::pair<double, double>>
    lookupWithGCost(
        const HashedState& state
    ) = 0;
};


 
// Hash Transposition Table
 

class HashTranspositionTable : public TranspositionTable {
public:
    explicit HashTranspositionTable(
        size_t maxEntries = 1000000,
        std::unique_ptr<ReplacementPolicy> policy = nullptr
    );

    TTEntry* lookup(
        const HashedState& state
    ) override;

    std::optional<std::pair<double, double>>
    lookupWithGCost(
        const HashedState& state
    ) override;

    void store(
        const TTEntry& entry
    ) override;

    void clear() override;

    size_t size() const override;

    size_t capacity() const override;

    bool isFull() const override;

private:
    void evictEntries(
        const TTEntry& newEntry
    );

    boost::unordered_flat_map<HashedState,TTEntry,  std::hash<HashedState>> table_;

    size_t maxEntries_;

    std::unique_ptr<ReplacementPolicy> policy_;
};