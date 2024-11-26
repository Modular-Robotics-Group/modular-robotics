#ifndef ORIENTATION_H
#define ORIENTATION_H

#include "../modules/ModuleProperties.h"

class OrientationProperty : public IModuleProperty {
private:
    // Every (non-abstract) property needs this to ensure constructor is in the constructor map
    static PropertyInitializer initializer;

    std::vector<int> orientation;

protected:
    bool CompareProperty(const IModuleProperty& right) override;

    [[nodiscard]]
    IModuleProperty* MakeCopy() const override;

public:
    // Need a GetHash function
    std::size_t GetHash() override;

    // Every (non-abstract) property needs a JSON constructor
    explicit OrientationProperty(const nlohmann::basic_json<>& propertyDef);

    void Rotate(const std::vector<int>& rotation);
};

boost::any Rotate(IModuleProperty* prop, const nlohmann::basic_json<>& rotation);
inline boost::any(*Rotate_Ptr)(IModuleProperty*, const nlohmann::basic_json<>&) = &Rotate;
BOOST_DLL_ALIAS(Rotate_Ptr, orientationProperty_Rotate)

#endif //ORIENTATION_H
