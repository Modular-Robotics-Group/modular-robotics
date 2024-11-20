#include <iostream>
#include <set>
#include "ModuleProperties.h"
#include "../utility/debug_util.h"

void IModuleProperty::CallFunction(const std::string &funcKey) {
    if (ModuleProperties::InstFunctions().contains(funcKey)) {
        ModuleProperties::InstFunctions()[funcKey](this);
    }
}

IModuleProperty* PropertyInitializer::GetProperty(const nlohmann::basic_json<> &propertyDef) {
    return ModuleProperties::Constructors()[propertyDef["name"]](propertyDef);
}

std::vector<std::string>& ModuleProperties::PropertyKeys() {
    static std::vector<std::string> _propertyKeys = {};
    return _propertyKeys;
}

std::unordered_map<std::string, IModuleProperty* (*)(const nlohmann::basic_json<>& propertyDef)>& ModuleProperties::Constructors() {
    static std::unordered_map<std::string, IModuleProperty* (*)(const nlohmann::basic_json<>& propertyDef)> _constructors;
    return _constructors;
}

std::unordered_map<std::string, boost::any (*)()>& ModuleProperties::Functions() {
    static std::unordered_map<std::string, boost::any (*)()> _functions;
    return _functions;
}

std::unordered_map<std::string, boost::any (*)(IModuleProperty*)>& ModuleProperties::InstFunctions() {
    static std::unordered_map<std::string, boost::any (*)(IModuleProperty*)> _functions;
    return _functions;
}

std::unordered_map<std::string, boost::any(*)(boost::any...)>& ModuleProperties::ArgFunctions() {
    static std::unordered_map<std::string, boost::any(*)(boost::any...)> _functions;
    return _functions;
}

std::unordered_map<std::string, boost::any(*)(IModuleProperty*, boost::any...)>& ModuleProperties::ArgInstFunctions() {
    static std::unordered_map<std::string, boost::any(*)(IModuleProperty*, boost::any...)> _functions;
    return _functions;
}

int ModuleProperties::_propertiesLinkedCount = 0;

ModuleProperties::ModuleProperties(const ModuleProperties& other) {
    _properties.clear();
    for (const auto& property : other._properties) {
        _properties.insert(property->MakeCopy());
    }
    _dynamicProperties.clear();
    if (other._dynamicProperties.empty()) {
        return;
    }
    for (const auto& dynamicProperty : other._dynamicProperties) {
        _dynamicProperties.insert(dynamicProperty->MakeCopy());
    }
}

void ModuleProperties::LinkProperties() {
    for (const auto& propertyFile : std::filesystem::directory_iterator("Module Properties/")) {
        if (propertyFile.path().extension() != ".json") continue;
        std::ifstream file(propertyFile.path());
        nlohmann::json propertyClassDef = nlohmann::json::parse(file);
        std::string propertyLibPath, propertyLibName = propertyClassDef["filename"];
        std::string propertyName = propertyClassDef["name"];
        std::cout << "\tSearching..." << std::endl;
        for (const auto& libraryFile : std::filesystem::recursive_directory_iterator("Module Properties/")) {
            std::cout << "\t\tFile: " << libraryFile.path() << std::endl << "\t\tStem: " << libraryFile.path().stem() << std::endl;
            if (libraryFile.path().stem().string() == propertyLibName) {
                propertyLibPath = libraryFile.path().string();
            }
        }
        if (propertyLibPath.empty()) {
            std::cout << "\tFailed to link " << propertyLibName << '.' << std::endl;
            continue;
        }
        boost::dll::shared_library propertyLibrary(propertyLibPath);
        std::cout << "\tLinked " << propertyLibName << '.' << std::endl;
        if (propertyClassDef.contains("staticFunctions")) {
            for (const auto& functionName : propertyClassDef["staticFunctions"]) {
                auto ptrName = propertyName + "_" + static_cast<std::string>(functionName);
                auto fptr = boost::dll::import_alias<boost::any(*)()>(propertyLibrary, ptrName);
                Functions()[functionName] = *fptr;
            }
        }
        if (propertyClassDef.contains("instanceFunctions")) {
            for (const auto& functionName : propertyClassDef["instanceFunctions"]) {
                auto ptrName = propertyName + "_" + static_cast<std::string>(functionName);
                auto fptr = boost::dll::import_alias<boost::any(*)(IModuleProperty*)>(propertyLibrary, ptrName);
                InstFunctions()[functionName] = *fptr;
            }
        }
        _propertiesLinkedCount++;
    }
}

int ModuleProperties::PropertyCount() {
    return _propertiesLinkedCount;
}

bool ModuleProperties::_anyDynamicProperties = false;

bool ModuleProperties::AnyDynamicPropertiesLinked() {
    return _anyDynamicProperties;
}

void ModuleProperties::CallFunction(const std::string &funcKey) {
    if (Functions().contains(funcKey)) {
        Functions()[funcKey]();
    }
}

void ModuleProperties::InitProperties(const nlohmann::basic_json<>& propertyDefs) {
    for (const auto& key : PropertyKeys()) {
        if (propertyDefs.contains(key)) {
            std::cout << "\t\t\tLoading property " << key << "..." << std::endl;
            auto property = Constructors()[key](propertyDefs[key]);
            std::cout << "\t\t\tDone." << std::endl;
            _properties.insert(property);
            if (propertyDefs[key].contains("static") && propertyDefs[key]["static"] == false) {
                if (auto dynamicProperty = dynamic_cast<IModuleDynamicProperty*>(property); dynamicProperty == nullptr) {
                    std::cerr << "Property definition for " << key
                    << " is marked as non-static but implementation class does not inherit from IModuleDynamicProperty."
                    << std::endl;
                } else {
                    _anyDynamicProperties = true;
                    _dynamicProperties.insert(dynamicProperty);
                }
            }
        }
    }
}

void ModuleProperties::UpdateProperties(const std::valarray<int>& moveInfo) const {
    for (const auto property : _dynamicProperties) {
        property->UpdateProperty(moveInfo);
    }
}

bool ModuleProperties::operator==(const ModuleProperties& right) const {
    if (_properties.size() != right._properties.size()) {
        return false;
    }

    for (const auto rProp : right._properties) {
        if (const auto lProp = Find(rProp->key); lProp == nullptr || !lProp->CompareProperty(*rProp)) {
            return false;
        }
    }

    return true;
}

bool ModuleProperties::operator!=(const ModuleProperties& right) const {
    if (_properties.size() != right._properties.size()) {
        return true;
    }

    for (const auto rProp : right._properties) {
        if (const auto lProp = Find(rProp->key); lProp == nullptr || !lProp->CompareProperty(*rProp)) {
            return true;
        }
    }

    return false;
}

ModuleProperties& ModuleProperties::operator=(const ModuleProperties& right) {
    _properties.clear();
    for (const auto property : right._properties) {
        _properties.insert(property->MakeCopy());
    }
    _dynamicProperties.clear();
    if (right._dynamicProperties.empty()) {
        return *this;
    }
    for (const auto dynamicProperty : right._dynamicProperties) {
        _dynamicProperties.insert(dynamicProperty->MakeCopy());
    }
    return *this;
}

IModuleProperty* ModuleProperties::Find(const std::string& key) const {
    for (const auto property : _properties) {
        if (property->key == key) {
            return property;
        }
    }
    return nullptr;
}

std::uint_fast64_t ModuleProperties::AsInt() const {
    if (_properties.empty()) {
        return 0;
    }
    if (_properties.size() == 1) {
        return (*_properties.begin())->AsInt();
    }
    std::cerr << "Representing multiple properties as an integer is not supported." << std::endl;
    exit(1);
}

ModuleProperties::~ModuleProperties() {
    for (const auto property : _properties) {
        delete property;
    }
}

PropertyInitializer::PropertyInitializer(const std::string& name, IModuleProperty* (*constructor)(const nlohmann::basic_json<>&)) {
    DEBUG("Adding " << name << " constructor to property constructor map." << std::endl);
    ModuleProperties::PropertyKeys().push_back(name);
    ModuleProperties::Constructors()[name] = constructor;
}

std::size_t boost::hash<ModuleProperties>::operator()(const ModuleProperties& moduleProperties) const noexcept {
    auto cmp = [](const int a, const int b) { return a < b; };
    std::set<std::size_t, decltype(cmp)> hashes(cmp);
    for (const auto property : moduleProperties._properties) {
        hashes.insert(property->GetHash());
    }
    return boost::hash_range(hashes.begin(), hashes.end());
}
