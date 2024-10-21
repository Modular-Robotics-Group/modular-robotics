#include <valarray>
#include <vector>
#include <cstring>

#include <iostream>
#include <cmath>
#include "../utility/debug_util.h"

#ifndef TENSORFINAL_COORDTENSOR_H
#define TENSORFINAL_COORDTENSOR_H

template <typename T>
class CoordTensor {
public:
    // Constructor, creates a tensor of specified order and axis length.
    // Order in this case is the amount of coordinates needed to
    // represent a point in space.
    // Axis size determines the length of each axis, an axis size of 10
    // would mean that only the integers 0-9 would be valid coordinates.
    CoordTensor(int order, int axisSize, const typename std::vector<T>::value_type& value, const std::valarray<int>& originOffset = {});

    // Gets a reference to an ID directly from the internal array, this
    // is always faster than calling IdAtInternal but requires a pre-calculated
    // index in order to work.
    typename std::vector<T>::reference GetElementDirect(int index);

    [[nodiscard]]
    typename std::vector<T>::const_reference GetElementDirect(int index) const;

    // IdAt returns a reference to the module ID stored at the given
    // coordinates. An ID of -1 means no module is present.
    typename std::vector<T>::reference ElementAt(const std::valarray<int>& coords);

    [[nodiscard]]
    typename std::vector<T>::const_reference ElementAt(const std::valarray<int>& coords) const;

    // Identical to IdAt but uses the subscript operator, mostly here to
    // make moving to CoordTensor easier.
    typename std::vector<T>::reference operator[](const std::valarray<int>& coords);

    [[nodiscard]]
    typename std::vector<T>::const_reference operator[](const std::valarray<int>& coords) const;

    // Get a const reference to the internal array
    [[nodiscard]]
    const std::vector<T>& GetArrayInternal() const;

    // Get a copy of order
    [[nodiscard]]
    int Order() const;

    // Get a copy of axisSize
    [[nodiscard]]
    int AxisSize() const;

    // Get a coordinate vector from an index
    [[nodiscard]]
    const std::valarray<int>& CoordsFromIndex(int index) const;

    // Assign a value to every position in the tensor
    void Fill(const typename std::vector<T>::value_type& value);

    void FillFromVector(const std::vector<T>& vec);

    // Comparison Operators
    bool operator==(const CoordTensor<T>& right) const;
    bool operator!=(const CoordTensor<T>& right) const;
private:
    int _order;
    // Axis size, useful for bounds checking
    int _axisSize;
    // Origin offset
    std::valarray<int> _offset;
    // Coordinate multiplier cache for tensors of order > 3
    std::valarray<int> _axisMultipliers;
    // Internal array for rapid conversion from index to coordinate
    std::vector<std::valarray<int>> _coordsInternal;
    // Internal array responsible for holding module IDs
    std::vector<T> _arrayInternal;
    // Internal array responsible for holding slices of _arrayInternal
    std::vector<T*> _arrayInternal2D;
    // Internal array responsible for holding slices of _arrayInternal2D
    std::vector<T**> _arrayInternal3D;
    // Did you know that calling member function pointers looks really weird?
    typename std::vector<T>::reference (CoordTensor::*IdAtInternal)(const std::valarray<int>& coords);
    typename std::vector<T>::const_reference (CoordTensor::*IdAtInternalConst)(const std::valarray<int>& coords) const;
    typename std::vector<T>::reference (CoordTensor::*IdAtInternalOffset)(const std::valarray<int>& coords);
    typename std::vector<T>::const_reference (CoordTensor::*IdAtInternalOffsetConst)(const std::valarray<int>& coords) const;
    // 2nd and 3rd order tensors benefit from specialized IdAt functions
    typename std::vector<T>::reference ElemAt2ndOrder (const std::valarray<int>& coords);
    [[nodiscard]]
    typename std::vector<T>::const_reference ElemAt2ndOrderConst (const std::valarray<int>& coords) const;
    typename std::vector<T>::reference ElemAt3rdOrder (const std::valarray<int>& coords);
    [[nodiscard]]
    typename std::vector<T>::const_reference ElemAt3rdOrderConst (const std::valarray<int>& coords) const;
    // Generalized IdAtInternal function
    typename std::vector<T>::reference ElemAtNthOrder (const std::valarray<int>& coords);
    typename std::vector<T>::const_reference ElemAtNthOrderConst (const std::valarray<int>& coords) const;
    // Offset IdAt
    typename std::vector<T>::reference ElemAtNthOrderOffset (const std::valarray<int>& coords);
    typename std::vector<T>::const_reference ElemAtNthOrderOffsetConst (const std::valarray<int>& coords) const;
};

template<typename T>
bool CoordTensor<T>::operator==(const CoordTensor<T>& right) const {
    return _arrayInternal == right._arrayInternal;
}

template<typename T>
bool CoordTensor<T>::operator!=(const CoordTensor<T>& right) const {
    return _arrayInternal != right._arrayInternal;
}

template<typename T>
int CoordTensor<T>::Order() const {
    return _order;
}

template<typename T>
int CoordTensor<T>::AxisSize() const {
    return _axisSize;
}

template<typename T>
const std::valarray<int>& CoordTensor<T>::CoordsFromIndex(int index) const {
    return _coordsInternal[index];
}

template <typename T>
CoordTensor<T>::CoordTensor(int order, int axisSize, const typename std::vector<T>::value_type& value, const std::valarray<int>& originOffset) {
    _order = order;
    _axisSize = axisSize;
    // Calculate number of elements in tensor
    int internalSize = (int) std::pow(_axisSize, order);
    // Resize internal array to accommodate all elements
    _arrayInternal.resize(internalSize, value);
    // Setup Index -> Coordinate array
    _coordsInternal.resize(internalSize);
    std::valarray<int> coords;
    coords.resize(order, 0);
    for (int i = 0; i < internalSize; i++) {
        _coordsInternal[i] = coords;
        for (int j = 0; j < order; j++) {
            if (++coords[j] == axisSize) {
                coords[j] = 0;
            } else break;
        }
    }
    // Set size of 2nd order array
    internalSize = _axisSize;
    switch (order) {
        case 3:
            // 2nd order array will need to be larger if tensor is 3rd order
            internalSize *= _axisSize;
        case 2:
            // Initialize 2nd order array
            _arrayInternal2D.resize(internalSize);
            for (int i = 0; i < internalSize; i++) {
                _arrayInternal2D[i] = &(_arrayInternal[i * _axisSize]);
            }
            if (internalSize == _axisSize) {
                // If internalSize wasn't modified by case 3, then tensor is 2nd order
                IdAtInternal = &CoordTensor::ElemAt2ndOrder;
                IdAtInternalConst = &CoordTensor::ElemAt2ndOrderConst;
                DEBUG("2nd order tensor created\n");
                break;
            }
            // Otherwise tensor is 3rd order
            // Initialize 3rd order array
            _arrayInternal3D.resize(_axisSize);
            for (int i = 0; i < _axisSize; i++) {
                _arrayInternal3D[i] = &(_arrayInternal2D[i * _axisSize]);
            }
            IdAtInternal = &CoordTensor::ElemAt3rdOrder;
            IdAtInternalConst = &CoordTensor::ElemAt3rdOrderConst;
            DEBUG("3rd order tensor created\n");
            break;
        default:
            // If the tensor is not 2nd or 3rd order then the
            // coordinate multiplier cache needs to be set up
            _axisMultipliers.resize(order);
            int multiplier = 1;
            for (int i = 0; i < order; i++) {
                _axisMultipliers[i] = multiplier;
                multiplier *= _axisSize;
            }
            IdAtInternal = &CoordTensor::ElemAtNthOrder;
            IdAtInternalConst = &CoordTensor::ElemAtNthOrderConst;
            DEBUG("Tensor of order " << order << " created\n");
    }
    // Offset setup
    if (originOffset.size() != 0) {
        _offset = originOffset;
        IdAtInternalOffset = IdAtInternal;
        IdAtInternalOffsetConst = IdAtInternalConst;
        IdAtInternal = &CoordTensor::ElemAtNthOrderOffset;
        IdAtInternalConst = &CoordTensor::ElemAtNthOrderOffsetConst;
    }
#ifndef NDEBUG
#pragma clang diagnostic push
#pragma ide diagnostic ignored "ConstantConditionsOC"
#pragma ide diagnostic ignored "UnreachableCode"
    std::cout << "IdAtInternal Function: " << (
            IdAtInternal == &CoordTensor::ElemAt3rdOrder ? "ElemAt3rdOrder" :
            IdAtInternal == &CoordTensor::ElemAt2ndOrder ? "ElemAt2ndOrder" :
            IdAtInternal == &CoordTensor::ElemAtNthOrder ? "ElemAtNthOrder" :
            IdAtInternal == &CoordTensor::ElemAtNthOrderOffset ? "ElemAtNthOrderOffset" :
            "Invalid Function!") << std::endl;
#pragma clang diagnostic pop
#endif
}

template<>
inline CoordTensor<bool>::CoordTensor(int order, int axisSize, const typename std::vector<bool>::value_type& value, const std::valarray<int>& originOffset) {
    _order = order;
    _axisSize = axisSize;
    // Calculate number of elements in tensor
    int internalSize = (int) std::pow(_axisSize, order);
    // Resize internal array to accommodate all elements
    _arrayInternal.resize(internalSize, value);
    // Setup Index -> Coordinate array
    _coordsInternal.resize(internalSize);
    std::valarray<int> coords;
    coords.resize(order, 0);
    for (int i = 0; i < internalSize; i++) {
        _coordsInternal[i] = coords;
        for (int j = 0; j < order; j++) {
            if (++coords[j] == axisSize) {
                coords[j] = 0;
            } else break;
        }
    }
    // If the tensor is not 2nd or 3rd order then the
    // coordinate multiplier cache needs to be set up
    _axisMultipliers.resize(order);
    int multiplier = 1;
    for (int i = 0; i < order; i++) {
        _axisMultipliers[i] = multiplier;
        multiplier *= _axisSize;
    }
    IdAtInternal = &CoordTensor::ElemAtNthOrder;
    IdAtInternalConst = &CoordTensor::ElemAtNthOrderConst;
    DEBUG("Tensor of order " << order << " created\n");
    // Offset setup
    if (originOffset.size() != 0) {
        _offset = originOffset;
        IdAtInternalOffset = IdAtInternal;
        IdAtInternalOffsetConst = IdAtInternalConst;
        IdAtInternal = &CoordTensor::ElemAtNthOrderOffset;
        IdAtInternalConst = &CoordTensor::ElemAtNthOrderOffsetConst;
    }
#ifndef NDEBUG
#pragma clang diagnostic push
#pragma ide diagnostic ignored "ConstantConditionsOC"
#pragma ide diagnostic ignored "UnreachableCode"
    std::cout << "IdAtInternal Function: " << (
            IdAtInternal == &CoordTensor::ElemAtNthOrder ? "ElemAtNthOrder" :
            IdAtInternal == &CoordTensor::ElemAtNthOrderOffset ? "ElemAtNthOrderOffset" :
            "Invalid Function!") << std::endl;
#pragma clang diagnostic pop
#endif
}

template <typename T>
typename std::vector<T>::reference CoordTensor<T>::GetElementDirect(int index) {
    return _arrayInternal[index];
}

template <typename T>
typename std::vector<T>::const_reference CoordTensor<T>::GetElementDirect(int index) const {
    return _arrayInternal[index];
}

template <typename T>
inline typename std::vector<T>::reference CoordTensor<T>::ElementAt(const std::valarray<int>& coords) {
    // Told you calling member function pointers looks weird
    return (this->*IdAtInternal)(coords);
    // This would look even worse if IdAtInternal were called from outside,
    // it'd look like this: (tensor3D.*(tensor3D.IdAtInternal))({8, 4, 6}) <-- Not Good
}

template <typename T>
inline typename std::vector<T>::const_reference CoordTensor<T>::ElementAt(const std::valarray<int>& coords) const {
    return (this->*IdAtInternalConst)(coords);
}

template <typename T>
typename std::vector<T>::reference CoordTensor<T>::ElemAt2ndOrder (const std::valarray<int>& coords) {
    return _arrayInternal2D[coords[1]][coords[0]];
}

template <typename T>
typename std::vector<T>::const_reference CoordTensor<T>::ElemAt2ndOrderConst (const std::valarray<int>& coords) const {
    return _arrayInternal2D[coords[1]][coords[0]];
}

template <typename T>
typename std::vector<T>::reference CoordTensor<T>::ElemAt3rdOrder (const std::valarray<int>& coords) {
    return _arrayInternal3D[coords[2]][coords[1]][coords[0]];
}

template <typename T>
typename std::vector<T>::const_reference CoordTensor<T>::ElemAt3rdOrderConst (const std::valarray<int>& coords) const {
    return _arrayInternal3D[coords[2]][coords[1]][coords[0]];
}

template <typename T>
typename std::vector<T>::reference CoordTensor<T>::ElemAtNthOrder (const std::valarray<int>& coords) {
    return _arrayInternal[(coords * _axisMultipliers).sum()];
}

template <typename T>
typename std::vector<T>::const_reference CoordTensor<T>::ElemAtNthOrderConst (const std::valarray<int>& coords) const {
    return _arrayInternal[(coords * _axisMultipliers).sum()];
}

template <typename T>
typename std::vector<T>::reference CoordTensor<T>::operator[](const std::valarray<int> &coords) {
    return (this->*IdAtInternal)(coords);
}

template <typename T>
typename std::vector<T>::const_reference CoordTensor<T>::operator[](const std::valarray<int>& coords) const {
    return (this->*IdAtInternalConst)(coords);
}

template <typename T>
const std::vector<T>& CoordTensor<T>::GetArrayInternal() const {
    return _arrayInternal;
}

template <typename T>
inline typename std::vector<T>::reference CoordTensor<T>::ElemAtNthOrderOffset (const std::valarray<int>& coords) {
    return (this->*IdAtInternalOffset)(coords + _offset);
}

template <typename T>
inline typename std::vector<T>::const_reference CoordTensor<T>::ElemAtNthOrderOffsetConst (const std::valarray<int>& coords) const {
    return (this->*IdAtInternalOffsetConst)(coords + _offset);
}

template<typename T>
void CoordTensor<T>::Fill(const typename std::vector<T>::value_type &value) {
    std::memset(_arrayInternal.data(), value, sizeof(_arrayInternal));
}

template<typename T>
void CoordTensor<T>::FillFromVector(const std::vector<T> &vec) {
    _arrayInternal = vec;
}

#endif //TENSORFINAL_COORDTENSOR_H
