/* Module geometry data */

import * as THREE from 'three';
import { ModuleType } from "./utils.js";

/* Cubes
 * The following vertices are specified for a cube with edge length of 2.
 * HOWEVER, in the final construction of the mesh geometry, the vertices will be normalized,
 *  s.t. the module fits in a 1x1x1 bounding box.
 */
const _boxGeometryVertices = [
    // -, +, +, // A
    // +, +, +, // B
    // -, -, +, // C
    // +, -, +, // D
    // -, +, -, // E
    // +, +, -, // F
    // -, -, -, // G
    // +, -, -, // H
    { pos: [-1.0,  1.0,  1.0], uv: [0.25, 0.75], edge: [1, 0, 0] }, // 0  | A | +z face
    { pos: [-1.0, -1.0,  1.0], uv: [0.25, 0.50], edge: [1, 1, 0] }, // 1  | C
    { pos: [ 1.0,  1.0,  1.0], uv: [0.50, 0.75], edge: [1, 0, 1] }, // 2  | B
    { pos: [ 1.0,  1.0,  1.0], uv: [0.50, 0.75], edge: [1, 0, 1] }, // 3  | B
    { pos: [-1.0, -1.0,  1.0], uv: [0.25, 0.50], edge: [1, 1, 0] }, // 4  | C
    { pos: [ 1.0, -1.0,  1.0], uv: [0.50, 0.50], edge: [1, 0, 0] }, // 5  | D

    { pos: [ 1.0,  1.0,  1.0], uv: [0.50, 0.75], edge: [1, 0, 0] }, // 6  | B | +x face
    { pos: [ 1.0, -1.0,  1.0], uv: [0.50, 0.50], edge: [1, 1, 0] }, // 7  | D
    { pos: [ 1.0,  1.0, -1.0], uv: [0.75, 0.75], edge: [1, 0, 1] }, // 8  | F
    { pos: [ 1.0,  1.0, -1.0], uv: [0.75, 0.75], edge: [1, 0, 1] }, // 9  | F
    { pos: [ 1.0, -1.0,  1.0], uv: [0.50, 0.50], edge: [1, 1, 0] }, // 10 | D
    { pos: [ 1.0, -1.0, -1.0], uv: [0.75, 0.50], edge: [1, 0, 0] }, // 11 | H

    { pos: [-1.0,  1.0, -1.0], uv: [0.25, 1.00], edge: [1, 0, 0] }, // 12 | E / +y face
    { pos: [-1.0,  1.0,  1.0], uv: [0.25, 0.75], edge: [1, 1, 0] }, // 13 | A
    { pos: [ 1.0,  1.0, -1.0], uv: [0.50, 1.00], edge: [1, 0, 1] }, // 14 | F
    { pos: [ 1.0,  1.0, -1.0], uv: [0.50, 1.00], edge: [1, 0, 1] }, // 15 | F
    { pos: [-1.0,  1.0,  1.0], uv: [0.25, 0.75], edge: [1, 1, 0] }, // 16 | A
    { pos: [ 1.0,  1.0,  1.0], uv: [0.50, 0.75], edge: [1, 0, 0] }, // 17 | B

    { pos: [ 1.0,  1.0, -1.0], uv: [0.75, 0.75], edge: [1, 0, 0] }, // 18 | F / -z face
    { pos: [ 1.0, -1.0, -1.0], uv: [0.75, 0.50], edge: [1, 1, 0] }, // 19 | H
    { pos: [-1.0,  1.0, -1.0], uv: [1.00, 0.75], edge: [1, 0, 1] }, // 20 | E
    { pos: [-1.0,  1.0, -1.0], uv: [1.00, 0.75], edge: [1, 0, 1] }, // 21 | E
    { pos: [ 1.0, -1.0, -1.0], uv: [0.75, 0.50], edge: [1, 1, 0] }, // 22 | H
    { pos: [-1.0, -1.0, -1.0], uv: [1.00, 0.50], edge: [1, 0, 0] }, // 23 | G
                                             
    { pos: [-1.0,  1.0, -1.0], uv: [0.00, 0.75], edge: [1, 0, 0] }, // 24 | E / -x face
    { pos: [-1.0, -1.0, -1.0], uv: [0.00, 0.50], edge: [1, 1, 0] }, // 25 | G
    { pos: [-1.0,  1.0,  1.0], uv: [0.25, 0.75], edge: [1, 0, 1] }, // 26 | A
    { pos: [-1.0,  1.0,  1.0], uv: [0.25, 0.75], edge: [1, 0, 1] }, // 27 | A
    { pos: [-1.0, -1.0, -1.0], uv: [0.00, 0.50], edge: [1, 1, 0] }, // 28 | G
    { pos: [-1.0, -1.0,  1.0], uv: [0.25, 0.50], edge: [1, 0, 0] }, // 29 | C
                                             
    { pos: [-1.0, -1.0,  1.0], uv: [0.25, 0.50], edge: [1, 0, 0] }, // 30 | C / -y face
    { pos: [-1.0, -1.0, -1.0], uv: [0.25, 0.25], edge: [1, 1, 0] }, // 31 | G
    { pos: [ 1.0, -1.0,  1.0], uv: [0.50, 0.50], edge: [1, 0, 1] }, // 32 | D
    { pos: [ 1.0, -1.0,  1.0], uv: [0.50, 0.50], edge: [1, 0, 1] }, // 33 | D
    { pos: [-1.0, -1.0, -1.0], uv: [0.25, 0.25], edge: [1, 1, 0] }, // 34 | G
    { pos: [ 1.0, -1.0, -1.0], uv: [0.50, 0.25], edge: [1, 0, 0] }, // 35 | H
];

/* RhombicDodecahedrons
 * The following vertices are specified for a rhombicdodecahedron with edge length of sqrt(3).
 * HOWEVER, in the final construction of the mesh geometry, the vertices will be normalized,
 *  s.t. the module fits in a 1x1x1 bounding box.
 *  Vertices are labeled (in comments) according to diagram at ../resources/doc/RhombicDodecahedronVertices.png
 */
const _rhombicDodecahedronGeometryVertices = [
    // -1.0, -1.0, -1.0, //  0 | A -- Obtuse vertices / Cube
    // -1.0, -1.0,  1.0, //  1 | B
    //  1.0, -1.0,  1.0, //  2 | C
    //  1.0, -1.0, -1.0, //  3 | D
    // -1.0,  1.0, -1.0, //  4 | E
    // -1.0,  1.0,  1.0, //  5 | F
    //  1.0,  1.0,  1.0, //  6 | G
    //  1.0,  1.0, -1.0, //  7 | H

    //  0.0,  0.0,  2.0, //  8 | J -- Acute vertices // pyramid tips
    // -2.0,  0.0,  0.0, //  9 | K
    //  2.0,  0.0,  0.0, // 10 | L
    //  0.0, -2.0,  0.0, // 11 | M

    { pos: [ 0.0,  2.0,  0.0], uv: [0.8750, 1.0000], edge: [1, 0, 0] }, // 0  | N | -x, +y face
    { pos: [-1.0,  1.0, -1.0], uv: [0.8008, 0.8750], edge: [1, 1, 0] }, // 1  | E
    { pos: [-1.0,  1.0,  1.0], uv: [0.9482, 0.8750], edge: [1, 0, 1] }, // 2  | F
    { pos: [-1.0,  1.0,  1.0], uv: [0.9482, 0.8750], edge: [1, 0, 1] }, // 3  | F
    { pos: [-1.0,  1.0, -1.0], uv: [0.8008, 0.8750], edge: [1, 1, 0] }, // 4  | E
    { pos: [-2.0,  0.0,  0.0], uv: [0.8750, 0.7500], edge: [1, 0, 0] }, // 5  | K

    { pos: [ 0.0,  2.0,  0.0], uv: [0.1250, 1.0000], edge: [1, 0, 0] }, // 6  | N | +y, +z face
    { pos: [-1.0,  1.0,  1.0], uv: [0.0508, 0.8750], edge: [1, 1, 0] }, // 7  | F
    { pos: [ 1.0,  1.0,  1.0], uv: [0.1982, 0.8750], edge: [1, 0, 1] }, // 8  | G
    { pos: [ 1.0,  1.0,  1.0], uv: [0.1982, 0.8750], edge: [1, 0, 1] }, // 9  | G
    { pos: [-1.0,  1.0,  1.0], uv: [0.0508, 0.8750], edge: [1, 1, 0] }, // 10 | F
    { pos: [ 0.0,  0.0,  2.0], uv: [0.1250, 0.7500], edge: [1, 0, 0] }, // 11 | J

    { pos: [ 0.0,  2.0,  0.0], uv: [0.3750, 1.0000], edge: [1, 0, 0] }, // 12 | N | +x, +y face
    { pos: [ 1.0,  1.0,  1.0], uv: [0.3008, 0.8750], edge: [1, 1, 0] }, // 13 | G
    { pos: [ 1.0,  1.0, -1.0], uv: [0.4482, 0.8750], edge: [1, 0, 1] }, // 14 | H
    { pos: [ 1.0,  1.0, -1.0], uv: [0.4482, 0.8750], edge: [1, 0, 1] }, // 15 | H
    { pos: [ 1.0,  1.0,  1.0], uv: [0.3008, 0.8750], edge: [1, 1, 0] }, // 16 | G
    { pos: [ 2.0,  0.0,  0.0], uv: [0.3750, 0.7500], edge: [1, 0, 0] }, // 17 | L

    { pos: [ 0.0,  2.0,  0.0], uv: [0.6250, 1.0000], edge: [1, 0, 0] }, // 18 | N | +y, -z face
    { pos: [ 1.0,  1.0, -1.0], uv: [0.5508, 0.8750], edge: [1, 1, 0] }, // 19 | H
    { pos: [-1.0,  1.0, -1.0], uv: [0.6982, 0.8750], edge: [1, 0, 1] }, // 20 | E
    { pos: [-1.0,  1.0, -1.0], uv: [0.6982, 0.8750], edge: [1, 0, 1] }, // 21 | E
    { pos: [ 1.0,  1.0, -1.0], uv: [0.5508, 0.8750], edge: [1, 1, 0] }, // 22 | H
    { pos: [ 0.0,  0.0, -2.0], uv: [0.6250, 0.7500], edge: [1, 0, 0] }, // 23 | O

    { pos: [ 0.0, -2.0,  0.0], uv: [0.8750, 0.2500], edge: [1, 0, 0] }, // 24 | M | -x, -y face
    { pos: [-1.0, -1.0,  1.0], uv: [0.9482, 0.3750], edge: [1, 1, 0] }, // 25 | B
    { pos: [-1.0, -1.0, -1.0], uv: [0.8008, 0.3750], edge: [1, 0, 1] }, // 26 | A
    { pos: [-1.0, -1.0, -1.0], uv: [0.8008, 0.3750], edge: [1, 0, 1] }, // 27 | A
    { pos: [-1.0, -1.0,  1.0], uv: [0.9482, 0.3750], edge: [1, 1, 0] }, // 28 | B
    { pos: [-2.0,  0.0,  0.0], uv: [0.8750, 0.5000], edge: [1, 0, 0] }, // 29 | K

    { pos: [ 0.0, -2.0,  0.0], uv: [0.1250, 0.2500], edge: [1, 0, 0] }, // 30 | M | -y, +z face
    { pos: [ 1.0, -1.0,  1.0], uv: [0.1982, 0.3750], edge: [1, 1, 0] }, // 31 | C
    { pos: [-1.0, -1.0,  1.0], uv: [0.0508, 0.3750], edge: [1, 0, 1] }, // 32 | B
    { pos: [-1.0, -1.0,  1.0], uv: [0.0508, 0.3750], edge: [1, 0, 1] }, // 33 | B
    { pos: [ 1.0, -1.0,  1.0], uv: [0.1982, 0.3750], edge: [1, 1, 0] }, // 34 | C
    { pos: [ 0.0,  0.0,  2.0], uv: [0.1250, 0.5000], edge: [1, 0, 0] }, // 35 | J

    { pos: [ 0.0, -2.0,  0.0], uv: [0.3750, 0.2500], edge: [1, 0, 0] }, // 36 | M | +x, -y face
    { pos: [ 1.0, -1.0, -1.0], uv: [0.4482, 0.3750], edge: [1, 1, 0] }, // 37 | D
    { pos: [ 1.0, -1.0,  1.0], uv: [0.3008, 0.3750], edge: [1, 0, 1] }, // 38 | C
    { pos: [ 1.0, -1.0,  1.0], uv: [0.3008, 0.3750], edge: [1, 0, 1] }, // 39 | C
    { pos: [ 1.0, -1.0, -1.0], uv: [0.4482, 0.3750], edge: [1, 1, 0] }, // 40 | D
    { pos: [ 2.0,  0.0,  0.0], uv: [0.3750, 0.5000], edge: [1, 0, 0] }, // 41 | L

    { pos: [ 0.0, -2.0,  0.0], uv: [0.6250, 0.2500], edge: [1, 0, 0] }, // 42 | M | -y, -z face
    { pos: [-1.0, -1.0, -1.0], uv: [0.6982, 0.3750], edge: [1, 1, 0] }, // 43 | A
    { pos: [ 1.0, -1.0, -1.0], uv: [0.5508, 0.3750], edge: [1, 0, 1] }, // 44 | D
    { pos: [ 1.0, -1.0, -1.0], uv: [0.5508, 0.3750], edge: [1, 0, 1] }, // 45 | D
    { pos: [-1.0, -1.0, -1.0], uv: [0.6982, 0.3750], edge: [1, 1, 0] }, // 46 | A
    { pos: [ 0.0,  0.0, -2.0], uv: [0.6250, 0.5000], edge: [1, 0, 0] }, // 47 | O

    { pos: [-1.0,  1.0,  1.0], uv: [0.8750, 0.6982], edge: [1, 0, 0] }, // 48 | F | -x, +z face
    { pos: [-2.0,  0.0,  0.0], uv: [0.7500, 0.6250], edge: [1, 1, 0] }, // 49 | K
    { pos: [ 0.0,  0.0,  2.0], uv: [1.0000, 0.6250], edge: [1, 0, 1] }, // 50 | J
    { pos: [ 0.0,  0.0,  2.0], uv: [1.0000, 0.6250], edge: [1, 0, 1] }, // 51 | J
    { pos: [-2.0,  0.0,  0.0], uv: [0.7500, 0.6250], edge: [1, 1, 0] }, // 52 | K
    { pos: [-1.0, -1.0,  1.0], uv: [0.8750, 0.5518], edge: [1, 0, 0] }, // 53 | B

    { pos: [ 1.0,  1.0,  1.0], uv: [0.1250, 0.6982], edge: [1, 0, 0] }, // 54 | G | +x, +z face
    { pos: [ 0.0,  0.0,  2.0], uv: [0.0000, 0.6250], edge: [1, 1, 0] }, // 55 | J
    { pos: [ 2.0,  0.0,  0.0], uv: [0.2500, 0.6250], edge: [1, 0, 1] }, // 56 | L
    { pos: [ 2.0,  0.0,  0.0], uv: [0.2500, 0.6250], edge: [1, 0, 1] }, // 57 | L
    { pos: [ 0.0,  0.0,  2.0], uv: [0.0000, 0.6250], edge: [1, 1, 0] }, // 58 | J
    { pos: [ 1.0, -1.0,  1.0], uv: [0.1250, 0.5518], edge: [1, 0, 0] }, // 59 | C

    { pos: [ 1.0,  1.0, -1.0], uv: [0.3750, 0.6982], edge: [1, 0, 0] }, // 60 | H | +x, -z face
    { pos: [ 2.0,  0.0,  0.0], uv: [0.2500, 0.6250], edge: [1, 1, 0] }, // 61 | L
    { pos: [ 0.0,  0.0, -2.0], uv: [0.5000, 0.6250], edge: [1, 0, 1] }, // 62 | O
    { pos: [ 0.0,  0.0, -2.0], uv: [0.5000, 0.6250], edge: [1, 0, 1] }, // 63 | O
    { pos: [ 2.0,  0.0,  0.0], uv: [0.2500, 0.6250], edge: [1, 1, 0] }, // 64 | L
    { pos: [ 1.0, -1.0, -1.0], uv: [0.3750, 0.5518], edge: [1, 0, 0] }, // 65 | D

    { pos: [-1.0,  1.0, -1.0], uv: [0.6250, 0.6982], edge: [1, 0, 0] }, // 66 | E | -x, -z face
    { pos: [ 0.0,  0.0, -2.0], uv: [0.5000, 0.6250], edge: [1, 1, 0] }, // 67 | O
    { pos: [-2.0,  0.0,  0.0], uv: [0.7500, 0.6250], edge: [1, 0, 1] }, // 68 | K
    { pos: [-2.0,  0.0,  0.0], uv: [0.7500, 0.6250], edge: [1, 0, 1] }, // 69 | K
    { pos: [ 0.0,  0.0, -2.0], uv: [0.5000, 0.6250], edge: [1, 1, 0] }, // 70 | O
    { pos: [-1.0, -1.0, -1.0], uv: [0.6250, 0.5518], edge: [1, 0, 0] }, // 71 | A
];

/* Rhombicuboctahedrons, aka Catoms
 * The following vertices are specified for a rhombicuboctahedron with edge length of 2.
 * HOWEVER, in the final construction of the mesh geometry, the vertices will be normalized,
 *  s.t. the module fits in a 1x1x1 bounding box.
 */
const opr = 2.414213; // One plus sqrt2
const _catomGeometryVertices = [
    // -1.0,  1.0,  opr, // A // Front face
    //  1.0,  1.0,  opr, // B
    //  1.0, -1.0,  opr, // C
    // -1.0, -1.0,  opr, // D
    //  1.0,  1.0, -opr, // I // Back face
    // -1.0,  1.0, -opr, // J
    // -1.0, -1.0, -opr, // K
    //  1.0, -1.0, -opr, // L
    //  opr,  1.0,  1.0, // E // Right face
    //  opr,  1.0, -1.0, // F
    //  opr, -1.0, -1.0, // G
    //  opr, -1.0,  1.0, // H
    // -opr,  1.0, -1.0, // M // Left face
    // -opr,  1.0,  1.0, // N
    // -opr, -1.0,  1.0, // O
    // -opr, -1.0, -1.0, // P
    // -1.0,  opr, -1.0, // Q // Top face
    //  1.0,  opr, -1.0, // R
    //  1.0,  opr,  1.0, // S
    // -1.0,  opr,  1.0, // T
    // -1.0, -opr,  1.0, // U // Bottom face
    //  1.0, -opr,  1.0, // V
    //  1.0, -opr, -1.0, // W
    // -1.0, -opr, -1.0, // X
 
    { pos: [ opr,  1.0,  1.0], uv: [0.0, 0.5], edge: [1, 0, 0] }, // E | {+x, 0} square
    { pos: [ opr, -1.0,  1.0], uv: [0.0, 0.0], edge: [1, 1, 0] }, // H
    { pos: [ opr,  1.0, -1.0], uv: [0.5, 0.5], edge: [1, 0, 1] }, // F
    { pos: [ opr, -1.0, -1.0], uv: [0.5, 0.0], edge: [1, 0, 0] }, // G
    { pos: [ opr,  1.0, -1.0], uv: [0.5, 0.5], edge: [1, 0, 1] }, // F
    { pos: [ opr, -1.0,  1.0], uv: [0.0, 0.0], edge: [1, 1, 0] }, // H

    { pos: [-opr,  1.0, -1.0], uv: [0.0, 0.5], edge: [1, 0, 0] }, // M | {-x, 0} square
    { pos: [-opr, -1.0, -1.0], uv: [0.0, 0.0], edge: [1, 1, 0] }, // P
    { pos: [-opr,  1.0,  1.0], uv: [0.5, 0.5], edge: [1, 0, 1] }, // N
    { pos: [-opr, -1.0,  1.0], uv: [0.5, 0.0], edge: [1, 0, 0] }, // O
    { pos: [-opr,  1.0,  1.0], uv: [0.5, 0.5], edge: [1, 0, 1] }, // N
    { pos: [-opr, -1.0, -1.0], uv: [0.0, 0.0], edge: [1, 1, 0] }, // P

    { pos: [-1.0,  opr, -1.0], uv: [0.0, 0.5], edge: [1, 0, 0] }, // Q | {+y, 0} square
    { pos: [-1.0,  opr,  1.0], uv: [0.0, 0.0], edge: [1, 1, 0] }, // T
    { pos: [ 1.0,  opr, -1.0], uv: [0.5, 0.5], edge: [1, 0, 1] }, // R
    { pos: [ 1.0,  opr,  1.0], uv: [0.5, 0.0], edge: [1, 0, 0] }, // S
    { pos: [ 1.0,  opr, -1.0], uv: [0.5, 0.5], edge: [1, 0, 1] }, // R
    { pos: [-1.0,  opr,  1.0], uv: [0.0, 0.0], edge: [1, 1, 0] }, // T

    { pos: [-1.0, -opr,  1.0], uv: [0.0, 0.5], edge: [1, 0, 0] }, // U | {-y, 0} square
    { pos: [-1.0, -opr, -1.0], uv: [0.0, 0.0], edge: [1, 1, 0] }, // X
    { pos: [ 1.0, -opr,  1.0], uv: [0.5, 0.5], edge: [1, 0, 1] }, // V
    { pos: [ 1.0, -opr, -1.0], uv: [0.5, 0.0], edge: [1, 0, 0] }, // W
    { pos: [ 1.0, -opr,  1.0], uv: [0.5, 0.5], edge: [1, 0, 1] }, // V
    { pos: [-1.0, -opr, -1.0], uv: [0.0, 0.0], edge: [1, 1, 0] }, // X

    { pos: [-1.0,  1.0,  opr], uv: [0.0, 0.5], edge: [1, 0, 0] }, // A | {+z, 0} square
    { pos: [-1.0, -1.0,  opr], uv: [0.0, 0.0], edge: [1, 1, 0] }, // D
    { pos: [ 1.0,  1.0,  opr], uv: [0.5, 0.5], edge: [1, 0, 1] }, // B
    { pos: [ 1.0, -1.0,  opr], uv: [0.5, 0.0], edge: [1, 0, 0] }, // C
    { pos: [ 1.0,  1.0,  opr], uv: [0.5, 0.5], edge: [1, 0, 1] }, // B
    { pos: [-1.0, -1.0,  opr], uv: [0.0, 0.0], edge: [1, 1, 0] }, // D

    { pos: [ 1.0,  1.0, -opr], uv: [0.0, 0.5], edge: [1, 0, 0] }, // I | {-z, 0} square
    { pos: [ 1.0, -1.0, -opr], uv: [0.0, 0.0], edge: [1, 1, 0] }, // L
    { pos: [-1.0,  1.0, -opr], uv: [0.5, 0.5], edge: [1, 0, 1] }, // J
    { pos: [-1.0, -1.0, -opr], uv: [0.5, 0.0], edge: [1, 0, 0] }, // K
    { pos: [-1.0,  1.0, -opr], uv: [0.5, 0.5], edge: [1, 0, 1] }, // J
    { pos: [ 1.0, -1.0, -opr], uv: [0.0, 0.0], edge: [1, 1, 0] }, // L

    { pos: [ 1.0,  opr,  1.0], uv: [0.0, 1.0], edge: [1, 0, 0] }, // S | {+x,+y} square
    { pos: [ opr,  1.0,  1.0], uv: [0.0, 0.5], edge: [1, 1, 0] }, // E
    { pos: [ 1.0,  opr, -1.0], uv: [0.5, 1.0], edge: [1, 0, 1] }, // R
    { pos: [ opr,  1.0, -1.0], uv: [0.5, 0.5], edge: [1, 0, 0] }, // F
    { pos: [ 1.0,  opr, -1.0], uv: [0.5, 1.0], edge: [1, 0, 1] }, // R
    { pos: [ opr,  1.0,  1.0], uv: [0.0, 0.5], edge: [1, 1, 0] }, // E

    { pos: [ opr, -1.0,  1.0], uv: [0.0, 1.0], edge: [1, 0, 0] }, // H | {+x,-y} square
    { pos: [ 1.0, -opr,  1.0], uv: [0.0, 0.5], edge: [1, 1, 0] }, // V
    { pos: [ opr, -1.0, -1.0], uv: [0.5, 1.0], edge: [1, 0, 1] }, // G
    { pos: [ 1.0, -opr, -1.0], uv: [0.5, 0.5], edge: [1, 0, 0] }, // W
    { pos: [ opr, -1.0, -1.0], uv: [0.5, 1.0], edge: [1, 0, 1] }, // G
    { pos: [ 1.0, -opr,  1.0], uv: [0.0, 0.5], edge: [1, 1, 0] }, // V

    { pos: [-1.0,  opr, -1.0], uv: [0.0, 1.0], edge: [1, 0, 0] }, // Q | {-x,+y} square
    { pos: [-opr,  1.0, -1.0], uv: [0.0, 0.5], edge: [1, 1, 0] }, // M
    { pos: [-1.0,  opr,  1.0], uv: [0.5, 1.0], edge: [1, 0, 1] }, // T
    { pos: [-opr,  1.0,  1.0], uv: [0.5, 0.5], edge: [1, 0, 0] }, // N
    { pos: [-1.0,  opr,  1.0], uv: [0.5, 1.0], edge: [1, 0, 1] }, // T
    { pos: [-opr,  1.0, -1.0], uv: [0.0, 0.5], edge: [1, 1, 0] }, // M

    { pos: [-opr, -1.0, -1.0], uv: [0.0, 1.0], edge: [1, 0, 0] }, // P | {-x,-y} square
    { pos: [-1.0, -opr, -1.0], uv: [0.0, 0.5], edge: [1, 1, 0] }, // X
    { pos: [-opr, -1.0,  1.0], uv: [0.5, 1.0], edge: [1, 0, 1] }, // O
    { pos: [-1.0, -opr,  1.0], uv: [0.5, 0.5], edge: [1, 0, 0] }, // U
    { pos: [-opr, -1.0,  1.0], uv: [0.5, 1.0], edge: [1, 0, 1] }, // O
    { pos: [-1.0, -opr, -1.0], uv: [0.0, 0.5], edge: [1, 1, 0] }, // X

    { pos: [ 1.0,  1.0,  opr], uv: [0.0, 1.0], edge: [1, 0, 0] }, // B | {+x,+z} square
    { pos: [ 1.0, -1.0,  opr], uv: [0.0, 0.5], edge: [1, 1, 0] }, // C
    { pos: [ opr,  1.0,  1.0], uv: [0.5, 1.0], edge: [1, 0, 1] }, // E
    { pos: [ opr, -1.0,  1.0], uv: [0.5, 0.5], edge: [1, 0, 0] }, // H
    { pos: [ opr,  1.0,  1.0], uv: [0.5, 1.0], edge: [1, 0, 1] }, // E
    { pos: [ 1.0, -1.0,  opr], uv: [0.0, 0.5], edge: [1, 1, 0] }, // C

    { pos: [ opr,  1.0, -1.0], uv: [0.0, 1.0], edge: [1, 0, 0] }, // F | {+x,-z} square
    { pos: [ opr, -1.0, -1.0], uv: [0.0, 0.5], edge: [1, 1, 0] }, // G
    { pos: [ 1.0,  1.0, -opr], uv: [0.5, 1.0], edge: [1, 0, 1] }, // I
    { pos: [ 1.0, -1.0, -opr], uv: [0.5, 0.5], edge: [1, 0, 0] }, // L
    { pos: [ 1.0,  1.0, -opr], uv: [0.5, 1.0], edge: [1, 0, 1] }, // I
    { pos: [ opr, -1.0, -1.0], uv: [0.0, 0.5], edge: [1, 1, 0] }, // G

    { pos: [-opr,  1.0,  1.0], uv: [0.0, 1.0], edge: [1, 0, 0] }, // N | {-x,+z} square
    { pos: [-opr, -1.0,  1.0], uv: [0.0, 0.5], edge: [1, 1, 0] }, // O
    { pos: [-1.0,  1.0,  opr], uv: [0.5, 1.0], edge: [1, 0, 1] }, // A
    { pos: [-1.0, -1.0,  opr], uv: [0.5, 0.5], edge: [1, 0, 0] }, // D
    { pos: [-1.0,  1.0,  opr], uv: [0.5, 1.0], edge: [1, 0, 1] }, // A
    { pos: [-opr, -1.0,  1.0], uv: [0.0, 0.5], edge: [1, 1, 0] }, // O

    { pos: [-1.0,  1.0, -opr], uv: [0.0, 1.0], edge: [1, 0, 0] }, // J | {-x,-z} square
    { pos: [-1.0, -1.0, -opr], uv: [0.0, 0.5], edge: [1, 1, 0] }, // K
    { pos: [-opr,  1.0, -1.0], uv: [0.5, 1.0], edge: [1, 0, 1] }, // M
    { pos: [-opr, -1.0, -1.0], uv: [0.5, 0.5], edge: [1, 0, 0] }, // P
    { pos: [-opr,  1.0, -1.0], uv: [0.5, 1.0], edge: [1, 0, 1] }, // M
    { pos: [-1.0, -1.0, -opr], uv: [0.0, 0.5], edge: [1, 1, 0] }, // K

    { pos: [-1.0,  opr,  1.0], uv: [0.0, 1.0], edge: [1, 0, 0] }, // T | {+y,+z} square
    { pos: [-1.0,  1.0,  opr], uv: [0.0, 0.5], edge: [1, 1, 0] }, // A
    { pos: [ 1.0,  opr,  1.0], uv: [0.5, 1.0], edge: [1, 0, 1] }, // S
    { pos: [ 1.0,  1.0,  opr], uv: [0.5, 0.5], edge: [1, 0, 0] }, // B
    { pos: [ 1.0,  opr,  1.0], uv: [0.5, 1.0], edge: [1, 0, 1] }, // S
    { pos: [-1.0,  1.0,  opr], uv: [0.0, 0.5], edge: [1, 1, 0] }, // A

    { pos: [ 1.0,  opr, -1.0], uv: [0.0, 1.0], edge: [1, 0, 0] }, // R | {+y,-z} square
    { pos: [ 1.0,  1.0, -opr], uv: [0.0, 0.5], edge: [1, 1, 0] }, // I
    { pos: [-1.0,  opr, -1.0], uv: [0.5, 1.0], edge: [1, 0, 1] }, // Q
    { pos: [-1.0,  1.0, -opr], uv: [0.5, 0.5], edge: [1, 0, 0] }, // J
    { pos: [-1.0,  opr, -1.0], uv: [0.5, 1.0], edge: [1, 0, 1] }, // Q
    { pos: [ 1.0,  1.0, -opr], uv: [0.0, 0.5], edge: [1, 1, 0] }, // I

    { pos: [-1.0, -1.0,  opr], uv: [0.0, 1.0], edge: [1, 0, 0] }, // D | {-y,+z} square
    { pos: [-1.0, -opr,  1.0], uv: [0.0, 0.5], edge: [1, 1, 0] }, // U
    { pos: [ 1.0, -1.0,  opr], uv: [0.5, 1.0], edge: [1, 0, 1] }, // C
    { pos: [ 1.0, -opr,  1.0], uv: [0.5, 0.5], edge: [1, 0, 0] }, // V
    { pos: [ 1.0, -1.0,  opr], uv: [0.5, 1.0], edge: [1, 0, 1] }, // C
    { pos: [-1.0, -opr,  1.0], uv: [0.0, 0.5], edge: [1, 1, 0] }, // U

    { pos: [ 1.0, -1.0, -opr], uv: [0.0, 1.0], edge: [1, 0, 0] }, // L | {-y,-z} square
    { pos: [ 1.0, -opr, -1.0], uv: [0.0, 0.5], edge: [1, 1, 0] }, // W
    { pos: [-1.0, -1.0, -opr], uv: [0.5, 1.0], edge: [1, 0, 1] }, // K
    { pos: [-1.0, -opr, -1.0], uv: [0.5, 0.5], edge: [1, 0, 0] }, // X
    { pos: [-1.0, -1.0, -opr], uv: [0.5, 1.0], edge: [1, 0, 1] }, // K
    { pos: [ 1.0, -opr, -1.0], uv: [0.0, 0.5], edge: [1, 1, 0] }, // W

    { pos: [ 1.0,  opr,  1.0], uv: [0.75, 0.5], edge: [1, 0, 0] }, // S | {+x,+y,+z} triangle
    { pos: [ 1.0,  1.0,  opr], uv: [0.5,  0.0], edge: [0, 1, 0] }, // B
    { pos: [ opr,  1.0,  1.0], uv: [1.0,  0.0], edge: [0, 0, 1] }, // E

    { pos: [ 1.0,  opr, -1.0], uv: [0.75, 0.5], edge: [1, 0, 0] }, // R | {+x,+y,-z} triangle
    { pos: [ opr,  1.0, -1.0], uv: [0.5,  0.0], edge: [0, 1, 0] }, // F
    { pos: [ 1.0,  1.0, -opr], uv: [1.0,  0.0], edge: [0, 0, 1] }, // I

    { pos: [-1.0,  opr, -1.0], uv: [0.75, 0.5], edge: [1, 0, 0] }, // Q | {-x,+y,-z} triangle
    { pos: [-1.0,  1.0, -opr], uv: [0.5,  0.0], edge: [0, 1, 0] }, // J
    { pos: [-opr,  1.0, -1.0], uv: [1.0,  0.0], edge: [0, 0, 1] }, // M

    { pos: [-1.0,  opr,  1.0], uv: [0.75, 0.5], edge: [1, 0, 0] }, // T | {-x,+y,+z} triangle
    { pos: [-opr,  1.0,  1.0], uv: [0.5,  0.0], edge: [0, 1, 0] }, // N
    { pos: [-1.0,  1.0,  opr], uv: [1.0,  0.0], edge: [0, 0, 1] }, // A

    { pos: [ 1.0, -opr,  1.0], uv: [0.75, 0.5], edge: [1, 0, 0] }, // V | {+x,-y,+z} triangle
    { pos: [ opr, -1.0,  1.0], uv: [0.5,  0.0], edge: [0, 1, 0] }, // H
    { pos: [ 1.0, -1.0,  opr], uv: [1.0,  0.0], edge: [0, 0, 1] }, // C

    { pos: [ 1.0, -opr, -1.0], uv: [0.75, 0.5], edge: [1, 0, 0] }, // W | {+x,-y,-z} triangle
    { pos: [ 1.0, -1.0, -opr], uv: [0.5,  0.0], edge: [0, 1, 0] }, // L
    { pos: [ opr, -1.0, -1.0], uv: [1.0,  0.0], edge: [0, 0, 1] }, // G

    { pos: [-1.0, -opr, -1.0], uv: [0.75, 0.5], edge: [1, 0, 0] }, // X | {-x,-y,-z} triangle
    { pos: [-opr, -1.0, -1.0], uv: [0.5,  0.0], edge: [0, 1, 0] }, // P
    { pos: [-1.0, -1.0, -opr], uv: [1.0,  0.0], edge: [0, 0, 1] }, // K

    { pos: [-1.0, -opr,  1.0], uv: [0.75, 0.5], edge: [1, 0, 0] }, // U | {-x,-y,+z} triangle
    { pos: [-1.0, -1.0,  opr], uv: [0.5,  0.0], edge: [0, 1, 0] }, // D
    { pos: [-opr, -1.0,  1.0], uv: [1.0,  0.0], edge: [0, 0, 1] }, // O
];

/* -------------------- */

let _boxVertexPositions = [];
let _boxVertexUvs = [];
let _boxVertexEdges = [];
for (const vertex of _boxGeometryVertices) {
    _boxVertexPositions.push(...vertex.pos);
    _boxVertexUvs.push(...vertex.uv);
    _boxVertexEdges.push(...vertex.edge);
}

const _boxGeometry = new THREE.BufferGeometry();
_boxGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(_boxVertexPositions.map((x) => x / 2.0)), 3)); // Normalize vertices s.t. geometry fits within 1x1x1 bounding box centered at origin
_boxGeometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(_boxVertexUvs), 2));
_boxGeometry.setAttribute('edge', new THREE.BufferAttribute(new Float32Array(_boxVertexEdges), 3));
_boxGeometry.computeVertexNormals();

/* -------------------- */

let _rhombicDodecahedronVertexPositions = [];
let _rhombicDodecahedronVertexUvs = [];
let _rhombicDodecahedronVertexEdges = [];
for (const vertex of _rhombicDodecahedronGeometryVertices) {
    _rhombicDodecahedronVertexPositions.push(...vertex.pos);
    _rhombicDodecahedronVertexUvs.push(...vertex.uv);
    _rhombicDodecahedronVertexEdges.push(...vertex.edge);
}

const _rhombicDodecahedronGeometry = new THREE.BufferGeometry();
_rhombicDodecahedronGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(_rhombicDodecahedronVertexPositions.map((x) => x / 2.0)), 3)); // Normalize vertices s.t. geometry fits within 1x1x1 bounding box centered at origin
_rhombicDodecahedronGeometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(_rhombicDodecahedronVertexUvs), 2));
_rhombicDodecahedronGeometry.setAttribute('edge', new THREE.BufferAttribute(new Float32Array(_rhombicDodecahedronVertexEdges), 3));
_rhombicDodecahedronGeometry.computeVertexNormals();

/* -------------------- */

let _catomVertexPositions = [];
let _catomVertexUvs = [];
let _catomVertexEdges = [];
for (const vertex of _catomGeometryVertices) {
    _catomVertexPositions.push(...vertex.pos);
    _catomVertexUvs.push(...vertex.uv);
    _catomVertexEdges.push(...vertex.edge);
}

const _catomGeometry = new THREE.BufferGeometry();
_catomGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(_catomVertexPositions.map((x) => x / (opr + 1))), 3)); // Normalize vertices s.t. geometry fits within 1x1x1 bounding box centered at origin
_catomGeometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(_catomVertexUvs), 2));
_catomGeometry.setAttribute('edge', new THREE.BufferAttribute(new Float32Array(_catomVertexEdges), 3));
_catomGeometry.computeVertexNormals();

// ModuleData: shape properties which are used to help calculate animation parameters
// midsphere            = radius of midsphere
// edgelength           = edge length
// rotationMagnitude    = magnitude of a single step's rotation, in radians
// facedist             = distance from module origin to face centroid
// bumpdist             = distance from face centroid to edge center
export const ModuleData = new Map([
    [ModuleType.CUBE, {
        'midsphere': 0.7071,
        'edgelength': 1.0,
        'rotationMagnitude': THREE.MathUtils.degToRad(90.0),
        'geometry': _boxGeometry
    }],
    [ModuleType.RHOMBIC_DODECAHEDRON, {
        'midsphere': 0.8165,    // sqrt(6)/3 == 2*sqrt(2)/3 * edgelength
        'edgelength': 0.866,    // sqrt(3)/2
        'facedist': 0.7071,     // sqrt(2) == sqrt(6) * edgelength / 3
        'rotationMagnitude': THREE.MathUtils.degToRad(60.0),
        'geometry': _rhombicDodecahedronGeometry
    }],
    [ModuleType.CATOM, {
        'midsphere': 0.76537,   // sqrt(2 - sqrt(2))
        'edgelength': 0.585787, // 2 / (2 + sqrt(2))
        'facedist': 0.7071,     // sqrt(2) / 2
        'bumpdist': 0.29289,    // 1 - sqrt(2) / 2  | (half of edgelength)
        'rotationMagnitude': THREE.MathUtils.degToRad(90.0),
        'geometry': _catomGeometry
    }]
]);
    // Edge length: 2 / (2 + sqrt(2)) ~= 0.585787
    // Midsphere: sqrt(2 - sqrt(2)) ~= 0.76537
    // Distance from polyhedra-center to face-center: sqrt(2) / 2 ~= 0.7071
    // Distance from face-center to edge-center: 1 - sqrt(2) / 2 ~= 0.29289
    // Dihedral angle

