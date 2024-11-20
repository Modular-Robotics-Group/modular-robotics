#ifndef MODULEPROPERTIES_H
#define MODULEPROPERTIES_H
#include <string>
#include <unordered_set>
#include <boost/container_hash/hash.hpp>
#include <boost/dll.hpp>
#include <boost/any.hpp>
#include <nlohmann/json.hpp>

template<typename T>
concept Value = !std::is_reference_v<T>;

template<typename T>
concept Const = std::is_const_v<T> || std::is_reference_v<T> && std::is_const_v<std::remove_reference_t<T>>;

template<typename T>
concept Ref = std::is_reference_v<T>;

class IModuleProperty;

class IModuleDynamicProperty;

// Class used by modules to track and update their properties (other than coordinate info)
class ModuleProperties {
private:
    // Static data for keeping track of JSON keys
    static std::vector<std::string>& PropertyKeys();

    // Static data for mapping JSON keys to constructors
    static std::unordered_map<std::string, IModuleProperty* (*)(const nlohmann::basic_json<>& propertyDef)>& Constructors();

    // Static data for mapping strings to static property functions
    static std::unordered_map<std::string, boost::any (*)()>& Functions();

    // Static data for mapping strings to dynamic property functions
    static std::unordered_map<std::string, boost::any (*)(IModuleProperty*)>& InstFunctions();

    // Static data for mapping strings to static property functions with arguments
    static std::unordered_map<std::string, boost::any (*)(boost::any...)>& ArgFunctions();

    // Static data for mapping strings to dynamic property functions with arguments
    static std::unordered_map<std::string, boost::any (*)(IModuleProperty*, boost::any...)>& ArgInstFunctions();

    // # of properties linked
    static int _propertiesLinkedCount;

    // True if any linked properties are dynamic
    static bool _anyDynamicProperties;

    // Properties of a module
    std::unordered_set<IModuleProperty*> _properties;

    // Dynamic properties
    std::unordered_set<IModuleDynamicProperty*> _dynamicProperties;
public:
    // TODO: Delete this once finished testing
    static boost::any(*propertyFunctionTest)();

    ModuleProperties() = default;

    ModuleProperties(const ModuleProperties& other);

    static void LinkProperties();

    static int PropertyCount();

    static bool AnyDynamicPropertiesLinked();

    static void CallFunction(const std::string& funcKey);

    template<typename T> requires Value<T>
    static T CallFunction(const std::string& funcKey) {
        return boost::any_cast<T>(Functions()[funcKey]());
    }

    template<typename T> requires (Const<T> && Ref<T>)
    static const T& CallFunction(const std::string& funcKey) {
        return boost::any_cast<std::reference_wrapper<const std::remove_reference_t<T>>>(Functions()[funcKey]());
    }

    template<typename T> requires (!Const<T> && Ref<T>)
    static T& CallFunction(const std::string& funcKey) {
        return boost::any_cast<std::reference_wrapper<std::remove_reference_t<T>>>(Functions()[funcKey]());
    }

    void InitProperties(const nlohmann::basic_json<>& propertyDefs);

    void UpdateProperties(const std::valarray<int>& moveInfo) const;

    bool operator==(const ModuleProperties& right) const;

    bool operator!=(const ModuleProperties& right) const;

    ModuleProperties& operator=(const ModuleProperties& right);

    IModuleProperty* Find(const std::string& key) const;

    [[nodiscard]]
    std::uint_fast64_t AsInt() const;

    ~ModuleProperties();

    friend class IModuleProperty;
    friend struct PropertyInitializer;
    friend class boost::hash<ModuleProperties>;
};

// An interface for properties that a module might have, ex: Color, Direction, etc.
class IModuleProperty {
protected:
    std::string key;

    virtual bool CompareProperty(const IModuleProperty& right) = 0;

    [[nodiscard]]
    virtual IModuleProperty* MakeCopy() const = 0;

    [[nodiscard]]
    virtual std::uint_fast64_t AsInt() const = 0;

public:
    virtual std::size_t GetHash() = 0;

    virtual ~IModuleProperty() = default;

    void CallFunction(const std::string& funcKey);

    template<typename T> requires Value<T>
    T CallFunction(const std::string& funcKey) {
        return boost::any_cast<T>(ModuleProperties::InstFunctions()[funcKey](this));
    }

    template<typename T> requires (Const<T> && Ref<T>)
    const T& CallFunction(const std::string& funcKey) {
        return boost::any_cast<std::reference_wrapper<const std::remove_reference_t<T>>>(ModuleProperties::InstFunctions()[funcKey](this));
    }

    template<typename T> requires (!Const<T> && Ref<T>)
    T& CallFunction(const std::string& funcKey) {
        return boost::any_cast<std::reference_wrapper<std::remove_reference_t<T>>>(ModuleProperties::InstFunctions()[funcKey](this));
    }

    friend class ModuleProperties;
};

// These properties can change as a result of certain events, such as moving, or even having a module move adjacent to
// the affected module.
class IModuleDynamicProperty : public IModuleProperty {
protected:
    virtual void UpdateProperty(const std::valarray<int>& moveInfo) = 0;

    friend class ModuleProperties;

    [[nodiscard]]
    IModuleDynamicProperty* MakeCopy() const override = 0;
};

template<typename T>
T& ResultHolder() {
    static T result;
    return result;
}

// Used by property classes to add their constructor to the constructor map
struct PropertyInitializer {
    template<class Prop>
    static IModuleProperty* InitProperty(const nlohmann::basic_json<>& propertyDef) {
        return new Prop(propertyDef);
    }

    PropertyInitializer(const std::string& name, IModuleProperty* (*constructor)(const nlohmann::basic_json<>& propertyDef));

    static IModuleProperty* GetProperty(const nlohmann::basic_json<>& propertyDef);
};

template<>
struct boost::hash<ModuleProperties> {
    std::size_t operator()(const ModuleProperties& moduleProperties) const noexcept;
};

#endif //MODULEPROPERTIES_H
