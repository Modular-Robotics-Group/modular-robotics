#ifndef MODULAR_ROBOTICS_COLORS_H
#define MODULAR_ROBOTICS_COLORS_H

#include "../modules/ModuleProperties.h"

class ColorProperty final : public IModuleProperty {
private:
    // Every (non-abstract) property needs this to ensure constructor is in the constructor map
    static PropertyInitializer initializer;

    int color = -1;

    static std::unordered_set<int> allColors;

protected:
    bool CompareProperty(const IModuleProperty& right) override;

    [[nodiscard]]
    IModuleProperty* MakeCopy() const override;

    [[nodiscard]]
    std::uint_fast64_t AsInt() const override;

public:
    // Need a GetHash function
    std::size_t GetHash() override;

    // Every (non-abstract) property needs a JSON constructor
    explicit ColorProperty(const nlohmann::basic_json<>& propertyDef);

    [[nodiscard]]
    int GetColorInt() const;

    static const std::unordered_set<int>& Palette();
};

#if defined(WIN32) || defined(_WIN32) || defined(__WIN32__) || defined(__NT__)
__declspec(dllexport) boost::any Palette();

__declspec(dllexport) boost::any GetColorInt(IModuleProperty* prop);
#else
boost::any Palette() asm ("Palette");

boost::any GetColorInt(IModuleProperty* prop) asm ("GetColorInt");
#endif

void Dummy();

#endif //MODULAR_ROBOTICS_COLORS_H
