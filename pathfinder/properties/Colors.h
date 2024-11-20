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

boost::any Palette();
inline boost::any(*Palette_Ptr)() = &Palette;
BOOST_DLL_ALIAS(Palette_Ptr, colorProperty_Palette)

boost::any GetColorInt(IModuleProperty* prop);
inline boost::any(*GetColorInt_Ptr)(IModuleProperty*) = &GetColorInt;
BOOST_DLL_ALIAS(GetColorInt_Ptr, colorProperty_GetColorInt)

boost::any PropertyFuncTest();
inline boost::any(*PropertyFuncTest_Ptr)() = &PropertyFuncTest;
BOOST_DLL_ALIAS(PropertyFuncTest_Ptr, colorProperty_PropertyFuncTest)

void Dummy();

#endif //MODULAR_ROBOTICS_COLORS_H
