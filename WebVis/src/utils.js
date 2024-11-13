/* Enums and basic data structures */

export function Vec3(x = 0.0, y = 0.0, z = 0.0) {
    this.x = x;
    this.y = y;
    this.z = z;
}

export const ModuleType = Object.freeze({
    CUBE: 0,
    RHOMBIC_DODECAHEDRON: 1,
    CATOM: 2,
});

export const MoveType = Object.freeze({
    PIVOT: 0,
    SLIDING: 1,
    MONKEY: 2,
});

export const CameraType = Object.freeze({
    PERSPECTIVE: 0,
    ORTHOGRAPHIC: 1,
});
