/* Module geometry data */

import * as THREE from 'three';
import { ModuleType } from "./utils.js";

const _cubeGeometry = new THREE.BoxGeometry( 1, 1, 1 );

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

    // Edge length: sqrt(3)/2
    // Midsphere: sqrt(6)/3 (2*sqrt(2)/3 * edge_length)
    // Distance from polyhedra-center to face-center: sqrt(2)/2 (sqrt(6) * edge_length / 3)
    // Distance from face-center to edge-center: sqrt(3)/2 (edge_length)
    // Dihedral angle: 120 degrees

    { pos: [ 0.0,  2.0,  0.0], uv: [0.0, 0.0] }, // 0  | N
    { pos: [-1.0,  1.0, -1.0], uv: [0.0, 1.0] }, // 1  | E
    { pos: [-1.0,  1.0,  1.0], uv: [1.0, 0.0] }, // 2  | F
    { pos: [-1.0,  1.0,  1.0], uv: [1.0, 0.0] }, // 3  | F
    { pos: [-1.0,  1.0, -1.0], uv: [0.0, 1.0] }, // 4  | E
    { pos: [-2.0,  0.0,  0.0], uv: [1.0, 1.0] }, // 5  | K

    { pos: [ 0.0,  2.0,  0.0], uv: [0.0, 0.0] }, // 6  | N
    { pos: [-1.0,  1.0,  1.0], uv: [0.0, 1.0] }, // 7  | F
    { pos: [ 1.0,  1.0,  1.0], uv: [1.0, 0.0] }, // 8  | G
    { pos: [ 1.0,  1.0,  1.0], uv: [1.0, 0.0] }, // 9  | G
    { pos: [-1.0,  1.0,  1.0], uv: [0.0, 1.0] }, // 10 | F
    { pos: [ 0.0,  0.0,  2.0], uv: [1.0, 1.0] }, // 11 | J

    { pos: [ 0.0,  2.0,  0.0], uv: [0.0, 0.0] }, // 12 | N
    { pos: [ 1.0,  1.0,  1.0], uv: [0.0, 1.0] }, // 13 | G
    { pos: [ 1.0,  1.0, -1.0], uv: [1.0, 0.0] }, // 14 | H
    { pos: [ 1.0,  1.0, -1.0], uv: [1.0, 0.0] }, // 15 | H
    { pos: [ 1.0,  1.0,  1.0], uv: [0.0, 1.0] }, // 16 | G
    { pos: [ 2.0,  0.0,  0.0], uv: [1.0, 1.0] }, // 17 | L

    { pos: [ 0.0,  2.0,  0.0], uv: [0.0, 0.0] }, // 18 | N
    { pos: [ 1.0,  1.0, -1.0], uv: [0.0, 1.0] }, // 19 | H
    { pos: [-1.0,  1.0, -1.0], uv: [1.0, 0.0] }, // 20 | E
    { pos: [-1.0,  1.0, -1.0], uv: [1.0, 0.0] }, // 21 | E
    { pos: [ 1.0,  1.0, -1.0], uv: [0.0, 1.0] }, // 22 | H
    { pos: [ 0.0,  0.0, -2.0], uv: [1.0, 1.0] }, // 23 | O

    { pos: [ 0.0, -2.0,  0.0], uv: [0.0, 0.0] }, // 24 | M
    { pos: [-1.0, -1.0,  1.0], uv: [0.0, 1.0] }, // 25 | B
    { pos: [-1.0, -1.0, -1.0], uv: [1.0, 0.0] }, // 26 | A
    { pos: [-1.0, -1.0, -1.0], uv: [1.0, 0.0] }, // 27 | A
    { pos: [-1.0, -1.0,  1.0], uv: [0.0, 1.0] }, // 28 | B
    { pos: [-2.0,  0.0,  0.0], uv: [1.0, 1.0] }, // 29 | K

    { pos: [ 0.0, -2.0,  0.0], uv: [0.0, 0.0] }, // 30 | M
    { pos: [ 1.0, -1.0,  1.0], uv: [0.0, 1.0] }, // 31 | C
    { pos: [-1.0, -1.0,  1.0], uv: [1.0, 0.0] }, // 32 | B
    { pos: [-1.0, -1.0,  1.0], uv: [1.0, 0.0] }, // 33 | B
    { pos: [ 1.0, -1.0,  1.0], uv: [0.0, 1.0] }, // 34 | C
    { pos: [ 0.0,  0.0,  2.0], uv: [1.0, 1.0] }, // 35 | J

    { pos: [ 0.0, -2.0,  0.0], uv: [0.0, 0.0] }, // 36 | M
    { pos: [ 1.0, -1.0, -1.0], uv: [0.0, 1.0] }, // 37 | D
    { pos: [ 1.0, -1.0,  1.0], uv: [1.0, 0.0] }, // 38 | C
    { pos: [ 1.0, -1.0,  1.0], uv: [1.0, 0.0] }, // 39 | C
    { pos: [ 1.0, -1.0, -1.0], uv: [0.0, 1.0] }, // 40 | D
    { pos: [ 2.0,  0.0,  0.0], uv: [1.0, 1.0] }, // 41 | L

    { pos: [ 0.0, -2.0,  0.0], uv: [0.0, 0.0] }, // 42 | M
    { pos: [-1.0, -1.0, -1.0], uv: [0.0, 1.0] }, // 43 | A
    { pos: [ 1.0, -1.0, -1.0], uv: [1.0, 0.0] }, // 44 | D
    { pos: [ 1.0, -1.0, -1.0], uv: [1.0, 0.0] }, // 45 | D
    { pos: [-1.0, -1.0, -1.0], uv: [0.0, 1.0] }, // 46 | A
    { pos: [ 0.0,  0.0, -2.0], uv: [1.0, 1.0] }, // 47 | O

    { pos: [-1.0,  1.0,  1.0], uv: [0.0, 0.0] }, // 48 | F
    { pos: [-2.0,  0.0,  0.0], uv: [0.0, 1.0] }, // 49 | K
    { pos: [ 0.0,  0.0,  2.0], uv: [1.0, 0.0] }, // 50 | J
    { pos: [ 0.0,  0.0,  2.0], uv: [1.0, 0.0] }, // 51 | J
    { pos: [-2.0,  0.0,  0.0], uv: [0.0, 1.0] }, // 52 | K
    { pos: [-1.0, -1.0,  1.0], uv: [1.0, 1.0] }, // 53 | B

    { pos: [ 1.0,  1.0,  1.0], uv: [0.0, 0.0] }, // 54 | G
    { pos: [ 0.0,  0.0,  2.0], uv: [0.0, 1.0] }, // 55 | J
    { pos: [ 2.0,  0.0,  0.0], uv: [1.0, 0.0] }, // 56 | L
    { pos: [ 2.0,  0.0,  0.0], uv: [1.0, 0.0] }, // 57 | L
    { pos: [ 0.0,  0.0,  2.0], uv: [0.0, 1.0] }, // 58 | J
    { pos: [ 1.0, -1.0,  1.0], uv: [1.0, 1.0] }, // 59 | C

    { pos: [ 1.0,  1.0, -1.0], uv: [0.0, 0.0] }, // 60 | H
    { pos: [ 2.0,  0.0,  0.0], uv: [0.0, 1.0] }, // 61 | L
    { pos: [ 0.0,  0.0, -2.0], uv: [1.0, 0.0] }, // 62 | O
    { pos: [ 0.0,  0.0, -2.0], uv: [1.0, 0.0] }, // 63 | O
    { pos: [ 2.0,  0.0,  0.0], uv: [0.0, 1.0] }, // 64 | L
    { pos: [ 1.0, -1.0, -1.0], uv: [1.0, 1.0] }, // 65 | D

    { pos: [-1.0,  1.0, -1.0], uv: [0.0, 0.0] }, // 66 | E
    { pos: [ 0.0,  0.0, -2.0], uv: [0.0, 1.0] }, // 67 | O
    { pos: [-2.0,  0.0,  0.0], uv: [1.0, 0.0] }, // 68 | K
    { pos: [-2.0,  0.0,  0.0], uv: [1.0, 0.0] }, // 69 | K
    { pos: [ 0.0,  0.0, -2.0], uv: [0.0, 1.0] }, // 70 | O
    { pos: [-1.0, -1.0, -1.0], uv: [1.0, 1.0] }, // 71 | A
];

const opr = 2.414213; // One plus sqrt2
const _catomGeometryVertices = [
    // Edge length
    // Midsphere
    // Distance from polyhedra-center to face-center
    // Distance from face-center to edge-center
    // Dihedral angle

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
 
    { pos: [ opr,  1.0,  1.0], uv: [0.0, 1.0] }, // E | {+x, 0} square
    { pos: [ opr, -1.0,  1.0], uv: [0.0, 0.0] }, // H
    { pos: [ opr,  1.0, -1.0], uv: [1.0, 1.0] }, // F
    { pos: [ opr, -1.0, -1.0], uv: [1.0, 0.0] }, // G
    { pos: [ opr,  1.0, -1.0], uv: [1.0, 1.0] }, // F
    { pos: [ opr, -1.0,  1.0], uv: [0.0, 0.0] }, // H

    { pos: [-opr,  1.0, -1.0], uv: [0.0, 1.0] }, // M | {-x, 0} square
    { pos: [-opr, -1.0, -1.0], uv: [0.7650, 0.0] }, // P
    { pos: [-opr,  1.0,  1.0], uv: [1.0, 1.0] }, // N
    { pos: [-opr, -1.0,  1.0], uv: [1.0, 0.0] }, // O
    { pos: [-opr,  1.0,  1.0], uv: [1.0, 1.0] }, // N
    { pos: [-opr, -1.0, -1.0], uv: [0.0, 0.0] }, // P

    { pos: [-1.0,  opr, -1.0], uv: [0.0, 1.0] }, // Q | {+y, 0} square
    { pos: [-1.0,  opr,  1.0], uv: [0.0, 0.0] }, // T
    { pos: [ 1.0,  opr, -1.0], uv: [1.0, 1.0] }, // R
    { pos: [ 1.0,  opr,  1.0], uv: [1.0, 0.0] }, // S
    { pos: [ 1.0,  opr, -1.0], uv: [1.0, 1.0] }, // R
    { pos: [-1.0,  opr,  1.0], uv: [0.0, 0.0] }, // T

    { pos: [-1.0, -opr,  1.0], uv: [0.0, 1.0] }, // U | {-y, 0} square
    { pos: [-1.0, -opr, -1.0], uv: [0.0, 0.0] }, // X
    { pos: [ 1.0, -opr,  1.0], uv: [1.0, 1.0] }, // V
    { pos: [ 1.0, -opr, -1.0], uv: [1.0, 0.0] }, // W
    { pos: [ 1.0, -opr,  1.0], uv: [1.0, 1.0] }, // V
    { pos: [-1.0, -opr, -1.0], uv: [0.0, 0.0] }, // X

    { pos: [-1.0,  1.0,  opr], uv: [0.0, 1.0] }, // A | {+z, 0} square
    { pos: [-1.0, -1.0,  opr], uv: [0.0, 0.0] }, // D
    { pos: [ 1.0,  1.0,  opr], uv: [1.0, 1.0] }, // B
    { pos: [ 1.0, -1.0,  opr], uv: [1.0, 0.0] }, // C
    { pos: [ 1.0,  1.0,  opr], uv: [1.0, 1.0] }, // B
    { pos: [-1.0, -1.0,  opr], uv: [0.0, 0.0] }, // D

    { pos: [ 1.0,  1.0, -opr], uv: [0.0, 1.0] }, // I | {-z, 0} square
    { pos: [ 1.0, -1.0, -opr], uv: [0.0, 0.0] }, // L
    { pos: [-1.0,  1.0, -opr], uv: [1.0, 1.0] }, // J
    { pos: [-1.0, -1.0, -opr], uv: [1.0, 0.0] }, // K
    { pos: [-1.0,  1.0, -opr], uv: [1.0, 1.0] }, // J
    { pos: [ 1.0, -1.0, -opr], uv: [0.0, 0.0] }, // L

    { pos: [ 1.0,  opr,  1.0], uv: [0.0, 1.0] }, // S | {+x,+y} square
    { pos: [ opr,  1.0,  1.0], uv: [0.0, 0.0] }, // E
    { pos: [ 1.0,  opr, -1.0], uv: [1.0, 1.0] }, // R
    { pos: [ opr,  1.0, -1.0], uv: [1.0, 0.0] }, // F
    { pos: [ 1.0,  opr, -1.0], uv: [1.0, 1.0] }, // R
    { pos: [ opr,  1.0,  1.0], uv: [0.0, 0.0] }, // E

    { pos: [ opr, -1.0,  1.0], uv: [0.0, 1.0] }, // H | {+x,-y} square
    { pos: [ 1.0, -opr,  1.0], uv: [0.0, 0.0] }, // V
    { pos: [ opr, -1.0, -1.0], uv: [1.0, 1.0] }, // G
    { pos: [ 1.0, -opr, -1.0], uv: [1.0, 0.0] }, // W
    { pos: [ opr, -1.0, -1.0], uv: [1.0, 1.0] }, // G
    { pos: [ 1.0, -opr,  1.0], uv: [0.0, 0.0] }, // V

    { pos: [-1.0,  opr, -1.0], uv: [0.0, 1.0] }, // Q | {-x,+y} square
    { pos: [-opr,  1.0, -1.0], uv: [0.0, 0.0] }, // M
    { pos: [-1.0,  opr,  1.0], uv: [1.0, 1.0] }, // T
    { pos: [-opr,  1.0,  1.0], uv: [1.0, 0.0] }, // N
    { pos: [-1.0,  opr,  1.0], uv: [1.0, 1.0] }, // T
    { pos: [-opr,  1.0, -1.0], uv: [0.0, 0.0] }, // M

    { pos: [-opr, -1.0, -1.0], uv: [0.0, 1.0] }, // P | {-x,-y} square
    { pos: [-1.0, -opr, -1.0], uv: [0.0, 0.0] }, // X
    { pos: [-opr, -1.0,  1.0], uv: [1.0, 1.0] }, // O
    { pos: [-1.0, -opr,  1.0], uv: [1.0, 0.0] }, // U
    { pos: [-opr, -1.0,  1.0], uv: [1.0, 1.0] }, // O
    { pos: [-1.0, -opr, -1.0], uv: [0.0, 0.0] }, // X

    { pos: [ 1.0,  1.0,  opr], uv: [0.0, 1.0] }, // B | {+x,+z} square
    { pos: [ 1.0, -1.0,  opr], uv: [0.0, 0.0] }, // C
    { pos: [ opr,  1.0,  1.0], uv: [1.0, 1.0] }, // E
    { pos: [ opr, -1.0,  1.0], uv: [1.0, 0.0] }, // H
    { pos: [ opr,  1.0,  1.0], uv: [1.0, 1.0] }, // E
    { pos: [ 1.0, -1.0,  opr], uv: [0.0, 0.0] }, // C

    { pos: [ opr,  1.0, -1.0], uv: [0.0, 1.0] }, // F | {+x,-z} square
    { pos: [ opr, -1.0, -1.0], uv: [0.0, 0.0] }, // G
    { pos: [ 1.0,  1.0, -opr], uv: [1.0, 1.0] }, // I
    { pos: [ 1.0, -1.0, -opr], uv: [1.0, 0.0] }, // L
    { pos: [ 1.0,  1.0, -opr], uv: [1.0, 1.0] }, // I
    { pos: [ opr, -1.0, -1.0], uv: [0.0, 0.0] }, // G

    { pos: [-opr,  1.0,  1.0], uv: [0.0, 1.0] }, // N | {-x,+z} square
    { pos: [-opr, -1.0,  1.0], uv: [0.0, 0.0] }, // O
    { pos: [-1.0,  1.0,  opr], uv: [1.0, 1.0] }, // A
    { pos: [-1.0, -1.0,  opr], uv: [1.0, 0.0] }, // D
    { pos: [-1.0,  1.0,  opr], uv: [1.0, 1.0] }, // A
    { pos: [-opr, -1.0,  1.0], uv: [0.0, 0.0] }, // O

    { pos: [-1.0,  1.0, -opr], uv: [0.0, 1.0] }, // J | {-x,-z} square
    { pos: [-1.0, -1.0, -opr], uv: [0.0, 0.0] }, // K
    { pos: [-opr,  1.0, -1.0], uv: [1.0, 1.0] }, // M
    { pos: [-opr, -1.0, -1.0], uv: [1.0, 0.0] }, // P
    { pos: [-opr,  1.0, -1.0], uv: [1.0, 1.0] }, // M
    { pos: [-1.0, -1.0, -opr], uv: [0.0, 0.0] }, // K

    { pos: [-1.0,  opr,  1.0], uv: [0.0, 1.0] }, // T | {+y,+z} square
    { pos: [-1.0,  1.0,  opr], uv: [0.0, 0.0] }, // A
    { pos: [ 1.0,  opr,  1.0], uv: [1.0, 1.0] }, // S
    { pos: [ 1.0,  1.0,  opr], uv: [1.0, 0.0] }, // B
    { pos: [ 1.0,  opr,  1.0], uv: [1.0, 1.0] }, // S
    { pos: [-1.0,  1.0,  opr], uv: [0.0, 0.0] }, // A

    { pos: [ 1.0,  opr, -1.0], uv: [0.0, 1.0] }, // R | {+y,-z} square
    { pos: [ 1.0,  1.0, -opr], uv: [0.0, 0.0] }, // I
    { pos: [-1.0,  opr, -1.0], uv: [1.0, 1.0] }, // Q
    { pos: [-1.0,  1.0, -opr], uv: [1.0, 0.0] }, // J
    { pos: [-1.0,  opr, -1.0], uv: [1.0, 1.0] }, // Q
    { pos: [ 1.0,  1.0, -opr], uv: [0.0, 0.0] }, // I

    { pos: [-1.0, -1.0,  opr], uv: [0.0, 1.0] }, // D | {-y,+z} square
    { pos: [-1.0, -opr,  1.0], uv: [0.0, 0.0] }, // U
    { pos: [ 1.0, -1.0,  opr], uv: [1.0, 1.0] }, // C
    { pos: [ 1.0, -opr,  1.0], uv: [1.0, 0.0] }, // V
    { pos: [ 1.0, -1.0,  opr], uv: [1.0, 1.0] }, // C
    { pos: [-1.0, -opr,  1.0], uv: [0.0, 0.0] }, // U

    { pos: [ 1.0, -1.0, -opr], uv: [0.0, 1.0] }, // L | {-y,-z} square
    { pos: [ 1.0, -opr, -1.0], uv: [0.0, 0.0] }, // W
    { pos: [-1.0, -1.0, -opr], uv: [1.0, 1.0] }, // K
    { pos: [-1.0, -opr, -1.0], uv: [1.0, 0.0] }, // X
    { pos: [-1.0, -1.0, -opr], uv: [1.0, 1.0] }, // K
    { pos: [ 1.0, -opr, -1.0], uv: [0.0, 0.0] }, // W

    { pos: [ 1.0,  opr,  1.0], uv: [0.0, 0.0] }, // S | {+x,+y,+z} triangle
    { pos: [ 1.0,  1.0,  opr], uv: [0.0, 0.0] }, // B
    { pos: [ opr,  1.0,  1.0], uv: [0.0, 0.0] }, // E

    { pos: [ 1.0,  opr, -1.0], uv: [0.0, 0.0] }, // R | {+x,+y,-z} triangle
    { pos: [ opr,  1.0, -1.0], uv: [0.0, 0.0] }, // F
    { pos: [ 1.0,  1.0, -opr], uv: [0.0, 0.0] }, // I

    { pos: [-1.0,  opr, -1.0], uv: [0.0, 0.0] }, // Q | {-x,+y,-z} triangle
    { pos: [-1.0,  1.0, -opr], uv: [0.0, 0.0] }, // J
    { pos: [-opr,  1.0, -1.0], uv: [0.0, 0.0] }, // M

    { pos: [-1.0,  opr,  1.0], uv: [0.0, 0.0] }, // T | {-x,+y,+z} triangle
    { pos: [-opr,  1.0,  1.0], uv: [0.0, 0.0] }, // N
    { pos: [-1.0,  1.0,  opr], uv: [0.0, 0.0] }, // A

    { pos: [ 1.0, -opr,  1.0], uv: [0.0, 0.0] }, // V | {+x,-y,+z} triangle
    { pos: [ opr, -1.0,  1.0], uv: [0.0, 0.0] }, // H
    { pos: [ 1.0, -1.0,  opr], uv: [0.0, 0.0] }, // C

    { pos: [ 1.0, -opr, -1.0], uv: [0.0, 0.0] }, // W | {+x,-y,-z} triangle
    { pos: [ 1.0, -1.0, -opr], uv: [0.0, 0.0] }, // L
    { pos: [ opr, -1.0, -1.0], uv: [0.0, 0.0] }, // G

    { pos: [-1.0, -opr, -1.0], uv: [0.0, 0.0] }, // X | {-x,-y,-z} triangle
    { pos: [-opr, -1.0, -1.0], uv: [0.0, 0.0] }, // P
    { pos: [-1.0, -1.0, -opr], uv: [0.0, 0.0] }, // K

    { pos: [-1.0, -opr,  1.0], uv: [0.0, 0.0] }, // U | {-x,-y,+z} triangle
    { pos: [-1.0, -1.0,  opr], uv: [0.0, 0.0] }, // D
    { pos: [-opr, -1.0,  1.0], uv: [0.0, 0.0] }, // O
];

/* -------------------- */

let _rhombicDodecahedronVertexPositions = [];
let _rhombicDodecahedronVertexUvs = [];
for (const vertex of _rhombicDodecahedronGeometryVertices) {
    _rhombicDodecahedronVertexPositions.push(...vertex.pos);
    _rhombicDodecahedronVertexUvs.push(...vertex.uv);
}

const _rhombicDodecahedronGeometry = new THREE.BufferGeometry();
_rhombicDodecahedronGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(_rhombicDodecahedronVertexPositions.map((x) => x / 2.0)), 3));
_rhombicDodecahedronGeometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(_rhombicDodecahedronVertexUvs), 2));
_rhombicDodecahedronGeometry.computeVertexNormals();

/* -------------------- */

let _catomVertexPositions = [];
let _catomVertexUvs = [];
for (const vertex of _catomGeometryVertices) {
    _catomVertexPositions.push(...vertex.pos);
    _catomVertexUvs.push(...vertex.uv);
}

const _catomGeometry = new THREE.BufferGeometry();
_catomGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(_catomVertexPositions.map((x) => x / (opr + 1))), 3));
_catomGeometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(_catomVertexUvs), 2));
_catomGeometry.computeVertexNormals();

/* -------------------- */

export const ModuleGeometries = new Map([
    [ModuleType.CUBE, _cubeGeometry],
    [ModuleType.RHOMBIC_DODECAHEDRON, _rhombicDodecahedronGeometry],
    [ModuleType.CATOM, _catomGeometry]
]);
