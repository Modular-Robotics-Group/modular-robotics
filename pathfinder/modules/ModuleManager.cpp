#include <set>
#include "../lattice/Lattice.h"
#include "../utility/debug_util.h"
#include "ModuleManager.h"



ModuleBasic::ModuleBasic(const std::valarray<int>& coords, const ModuleProperties& properties) : coords(coords), properties(properties) {
    constexpr std::hash<ModuleBasic> hasher;
    hasher(*this);
}

const std::valarray<int>& ModuleBasic::Coords() const {
    return coords;
}

const ModuleProperties& ModuleBasic::Properties() const {
    return properties;
}

bool ModuleBasic::operator==(const IModuleBasic& right) const {
    const auto r = reinterpret_cast<const ModuleBasic&>(right);
    if (coords.size() != r.coords.size()) {
        return false;
    }
    for (int i = 0; i < coords.size(); i++) {
        if (coords[i] != r.coords[i]) {
            return false;
        }
    }
    return properties == r.properties;
}

bool ModuleBasic::operator<(const IModuleBasic& right) const {
    const auto r = reinterpret_cast<const ModuleBasic&>(right);
    return hash < r.hash;
}

std::unordered_map<std::uint_fast64_t, ModuleProperties> ModuleInt64::propertyMap;

std::unordered_map<std::uint_fast64_t, std::valarray<int>> ModuleInt64::coordMap;

ModuleInt64::ModuleInt64(const std::valarray<int> &coords, const ModuleProperties &properties) {
    constexpr std::uint_fast64_t propertyMask = 0xFFFFFFFFFF000000;
    modInt = 0;
    for (int i = 0; i < coords.size(); i++) {
        modInt += coords[i] << (i * 8);
    }
    modInt += properties.AsInt() << 24;
    if (propertyMap.count(modInt & propertyMask) == 0) {
        propertyMap[modInt & propertyMask] = properties;
    }
}

const std::valarray<int>& ModuleInt64::Coords() const {
    constexpr std::uint_fast64_t coordMask = 0x0000000000FFFFFF;
    if (!coordMap.contains(modInt & coordMask)) {
        coordMap[modInt & coordMask] = std::valarray<int>(0, Lattice::Order());
        for (int i = 0; i < Lattice::Order(); i++) {
            coordMap[modInt & coordMask][i] = (modInt >> (i * 8)) & 0xFF; // NOLINT(*-narrowing-conversions) (Mask should handle it)
        }
    }
    return coordMap[modInt & coordMask];
}

const ModuleProperties& ModuleInt64::Properties() const {
    constexpr std::uint_fast64_t propertyMask = 0xFFFFFFFFFF000000;
    return propertyMap[modInt & propertyMask];
}

bool ModuleInt64::operator==(const IModuleBasic& right) const {
    const auto r = reinterpret_cast<const ModuleInt64&>(right);
    return modInt == r.modInt;
}

bool ModuleInt64::operator<(const IModuleBasic& right) const {
    const auto r = reinterpret_cast<const ModuleInt64&>(right);
    return modInt < r.modInt;
}

ModuleData::ModuleData(const ModuleData &modData) {
#if CONFIG_MOD_DATA_STORAGE == MM_DATA_FULL
    module = std::make_unique<ModuleBasic>(modData.Coords(), modData.Properties());
#else
    module = std::make_unique<ModuleInt64>(modData.Coords(), modData.Properties());
#endif
}


ModuleData::ModuleData(const std::valarray<int> &coords, const ModuleProperties &properties) {
#if CONFIG_MOD_DATA_STORAGE == MM_DATA_FULL
    module = std::make_unique<ModuleBasic>(coords, properties);
#else
    module = std::make_unique<ModuleInt64>(coords, properties);
#endif
}

const std::valarray<int>& ModuleData::Coords() const {
    return module->Coords();
}

const ModuleProperties& ModuleData::Properties() const {
    return module->Properties();
}

bool ModuleData::operator==(const IModuleBasic& right) const {
    return *module == *reinterpret_cast<const ModuleData&>(right).module;
}

bool ModuleData::operator<(const IModuleBasic& right) const {
    return *module < *reinterpret_cast<const ModuleData&>(right).module;
}

std::size_t std::hash<ModuleData>::operator()(const ModuleData& modData) const noexcept {
#if CONFIG_MOD_DATA_STORAGE == MM_DATA_FULL
    auto m = reinterpret_cast<const ModuleBasic&>(*modData.module);
    constexpr std::hash<ModuleBasic> hasher;
    return hasher(m);
#else
    auto m = reinterpret_cast<const ModuleInt64&>(*modData.module);
    return m.modInt;
#endif
}

std::size_t boost::hash<ModuleData>::operator()(const ModuleData &modData) const noexcept {
    constexpr std::hash<ModuleData> hasher;
    return hasher(modData);
}


std::size_t std::hash<ModuleBasic>::operator()(ModuleBasic& modData) const noexcept {
    if (!modData.hashCacheValid) {
        constexpr boost::hash<ModuleBasic> hasher;
        modData.hash = hasher(modData);
        modData.hashCacheValid = true;
    }
    return modData.hash;
}

std::size_t boost::hash<ModuleBasic>::operator()(const ModuleBasic& modData) const noexcept {
    auto coordHash = boost::hash_range(begin(modData.Coords()), end(modData.Coords()));
    if (!Lattice::ignoreProperties) {
        constexpr boost::hash<ModuleProperties> propertyHasher;
        const auto propertyHash = propertyHasher(modData.Properties());
        boost::hash_combine(coordHash, propertyHash);
    }
    return coordHash;
}

Module::Module(Module&& mod) noexcept {
    coords = mod.coords;
    moduleStatic = mod.moduleStatic;
    properties = mod.properties;
    id = mod.id;
}

Module::Module(const std::valarray<int>& coords, const bool isStatic, const nlohmann::basic_json<>& propertyDefs) : coords(coords), moduleStatic(isStatic), id(ModuleIdManager::GetNextId()) {
    properties.InitProperties(propertyDefs);
}

int ModuleIdManager::_nextId = 0;
std::vector<DeferredModCnstrArgs> ModuleIdManager::_deferredInitMods;
std::vector<Module> ModuleIdManager::_modules;
int ModuleIdManager::_staticStart = 0;

void ModuleIdManager::RegisterModule(const std::valarray<int>& coords, bool isStatic, const nlohmann::basic_json<>& propertyDefs, const bool deferred) {
    if (!deferred && isStatic) {
        DeferredModCnstrArgs args;
        args.coords = coords;
        args.isStatic = isStatic;
        args.propertyDefs = propertyDefs;
        _deferredInitMods.emplace_back(args);
    } else {
        _modules.emplace_back(coords, isStatic, propertyDefs);
        if (!isStatic) {
            _staticStart++;
        }
    }
}

void ModuleIdManager::DeferredRegistration() {
    for (const auto&[coords, isStatic, propertyDefs] : _deferredInitMods) {
        RegisterModule(coords, isStatic, propertyDefs, true);
    }
}

int ModuleIdManager::GetNextId() {
    return _nextId++;
}

std::vector<Module>& ModuleIdManager::Modules() {
    return _modules;
}

std::span<Module>& ModuleIdManager::FreeModules() {
    static std::span<Module> freeModules = std::span(_modules).subspan(0, _staticStart);
    return freeModules;
}

std::span<Module> &ModuleIdManager::StaticModules() {
    static std::span<Module> staticModules = std::span(_modules).subspan(_staticStart, _modules.size() - _staticStart);
    return staticModules;
}

Module& ModuleIdManager::GetModule(const int id) {
    return _modules[id];
}

int ModuleIdManager::MinStaticID() {
    return _staticStart;
}

std::ostream& operator<<(std::ostream& out, const Module& mod) {
    out << "Module with ID " << mod.id << " at ";
    std::string sep = "(";
    for (const auto coord : mod.coords) {
        out << sep << coord;
        sep = ", ";
    }
    out << ")";
    return out;
}