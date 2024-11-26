#include "Orientation.h"

// Make sure this properties constructor is in the constructor map
PropertyInitializer OrientationProperty::initializer("orientationProperty", &PropertyInitializer::InitProperty<OrientationProperty>);

bool OrientationProperty::CompareProperty(const IModuleProperty& right) {
    return orientation == dynamic_cast<const OrientationProperty&>(right).orientation;
}

IModuleProperty* OrientationProperty::MakeCopy() const {
  	return new OrientationProperty(*this);
}

std::size_t OrientationProperty::GetHash() {
    constexpr boost::hash<std::vector<int>> hash;
    return hash(orientation);
}

OrientationProperty::OrientationProperty(const nlohmann::basic_json<> &propertyDef) {
    key = "orientationProperty";
    for (int rotation : propertyDef["orientation"]) {
        if (rotation < 0) {
            rotation += 360;
        }
        orientation.push_back(rotation % 360);
    }
}

void OrientationProperty::Rotate(const std::vector<int> &rotation) {
    for (int i = 0; i < rotation.size(); i++) {
        if (ModuleProperties::IsReversing()) {
            orientation[i] -= rotation[i];
        } else {
            orientation[i] += rotation[i];
        }
        orientation[i] %= 360;
        orientation[i] = orientation[i] >= 0 ? orientation[i] : orientation[i] + 360;
    }
}

boost::any Rotate(IModuleProperty* prop, const nlohmann::basic_json<>& rotation) {
    const auto orientationProp = reinterpret_cast<OrientationProperty*>(prop);
    orientationProp->Rotate(rotation[0]);
    return 0;
}

