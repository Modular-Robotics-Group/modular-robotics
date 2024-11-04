class threeDScreen {
    constructor(width, height, tileSize) {
        this.width    = width
        this.height   = height;
        this.tileSize = tileSize*5;
        this.cubes    = [];
        this.hexagons = [];
        this.rhomdod  = [];
        this.shape    = "cube";
    }

    get getCubes() {
        return this.cubes;
    }

    set setCubes(cubes) {
        this._cubes = cubes;
    }

    addCube(cube) {
        this.cubes.push(cube);
    }

    addHexagon(hexagon) {
        this.hexagons.push(hexagon);
    }

    addRhomdod(rhomdod) {
        this.rhomdod.push(rhomdod);
    }

    setShape(shape) {
        this.shape = shape;
    }

    removeCube(x, y, z) {
        for (let i = 0; i < this.cubes.length; i++) {
            if (this.cubes[i].x === x && this.cubes[i].y === y && this.cubes[i].z === z) {
                this.cubes.splice(i, 1);
                return true;
            }
        }
        return false;
    }

    removeHexagon(x, y, z) {
        for (let i = 0; i < this.hexagons.length; i++) {
            if (this.hexagons[i].x === x && this.hexagons[i].y === y && this.hexagons[i].z === z) {
                this.hexagons.splice(i, 1);
                return true;
            }
        }
        return false
    }

    removeRhomdod(x, y, z) {
        for (let i = 0; i < this.rhomdod.length; i++) {
            if (this.rhomdod[i].x === x && this.rhomdod[i].y === y && this.rhomdod[i].z === z) {
                this.rhomdod.splice(i, 1);
                return true;
            }
        }
        return false
    }

    removeAllCubes() {
        while (this.cubes.length > 0) {
            this.removeCube(this.cubes.pop());
        }
    }

    removeAllHexagons() {
        while (this.hexagons.length > 0) {
            this.removeHexagon(this.hexagons.pop());
        }
    }

    removeAllRhomdods() {
        while (this.rhomdod.length > 0) {
            this.removeRhomdod(this.rhomdod.pop());
        }
    }

    generateCubeObjects() {
        let objData = '';
        let vertexOffset = 1;

        this.cubes.forEach(cube => {
            const x = cube.x * this.tileSize;
            const y = cube.y * this.tileSize;
            const z = cube.z * this.tileSize;
            const size = this.tileSize / 2;

            objData += `# Cube at (${x}, ${y}, ${z})\n`;
            // Define vertices for the cube
            const vertices = [
                { x: x - size, y: y - size, z: z - size },
                { x: x + size, y: y - size, z: z - size },
                { x: x + size, y: y + size, z: z - size },
                { x: x - size, y: y + size, z: z - size },
                { x: x - size, y: y - size, z: z + size },
                { x: x + size, y: y - size, z: z + size },
                { x: x + size, y: y + size, z: z + size },
                { x: x - size, y: y + size, z: z + size }
            ];

            // Add vertices to objData
            vertices.forEach(vertex => {
                objData += `v ${vertex.x} ${vertex.y} ${vertex.z}\n`;
            });

            // Define faces for the cube (each face is two triangles)
            const faces = [
                { a: 1, b: 2, c: 3 }, { a: 1, b: 3, c: 4 }, // Front face
                { a: 5, b: 6, c: 7 }, { a: 5, b: 7, c: 8 }, // Back face
                { a: 1, b: 5, c: 8 }, { a: 1, b: 8, c: 4 }, // Left face
                { a: 2, b: 6, c: 7 }, { a: 2, b: 7, c: 3 }, // Right face
                { a: 4, b: 3, c: 7 }, { a: 4, b: 7, c: 8 }, // Top face
                { a: 1, b: 2, c: 6 }, { a: 1, b: 6, c: 5 }  // Bottom face
            ];

            // Add faces to objData
            faces.forEach(face => {
                objData += `f ${face.a + vertexOffset - 1} ${face.b + vertexOffset - 1} ${face.c + vertexOffset - 1}\n`;
            });

            vertexOffset += vertices.length;
            objData += '\n';
        });

        return objData;
    }

    generateHexagonsOjects() {

    }

    generateRhomdodObjects() {
        let objData = '';
        let vertexOffset = 1;
    
        this.rhomdod.forEach(rhomdod => {
            const x = rhomdod.x * this.tileSize;
            const y = rhomdod.y * this.tileSize;
            const z = rhomdod.z * this.tileSize;
            const halfTileSize = this.tileSize / 2;
            const pyramidHeight = this.tileSize / 2;
    
            objData += `# Rhombic Dodecahedron at (${x}, ${y}, ${z})\n`;
    
            // Define vertices for the central cube
            const cubeVertices = [
                { x: x - halfTileSize, y: y - halfTileSize, z: z - halfTileSize },
                { x: x + halfTileSize, y: y - halfTileSize, z: z - halfTileSize },
                { x: x + halfTileSize, y: y + halfTileSize, z: z - halfTileSize },
                { x: x - halfTileSize, y: y + halfTileSize, z: z - halfTileSize },
                { x: x - halfTileSize, y: y - halfTileSize, z: z + halfTileSize },
                { x: x + halfTileSize, y: y - halfTileSize, z: z + halfTileSize },
                { x: x + halfTileSize, y: y + halfTileSize, z: z + halfTileSize },
                { x: x - halfTileSize, y: y + halfTileSize, z: z + halfTileSize }
            ];
    
            // Add cube vertices to objData
            cubeVertices.forEach(vertex => {
                objData += `v ${vertex.x} ${vertex.y} ${vertex.z}\n`;
            });
    
            // Define vertices for the pyramids
            const pyramidVertices = [
                { x: x, y: y, z: z + halfTileSize + pyramidHeight }, // Front face
                { x: x, y: y, z: z - halfTileSize - pyramidHeight }, // Back face
                { x: x - halfTileSize - pyramidHeight, y: y, z: z }, // Left face
                { x: x + halfTileSize + pyramidHeight, y: y, z: z }, // Right face
                { x: x, y: y + halfTileSize + pyramidHeight, z: z }, // Top face
                { x: x, y: y - halfTileSize - pyramidHeight, z: z }, // Bottom face
                // front cube
                { x: x - halfTileSize, y: y - halfTileSize, z: z + this.tileSize / 2},
                { x: x + halfTileSize, y: y - halfTileSize, z: z + this.tileSize / 2},
                { x: x + halfTileSize, y: y + halfTileSize, z: z + this.tileSize / 2},
                { x: x - halfTileSize, y: y + halfTileSize, z: z + this.tileSize / 2},
                // back cube
                { x: x - halfTileSize, y: y - halfTileSize, z: z + halfTileSize - this.tileSize},
                { x: x + halfTileSize, y: y - halfTileSize, z: z + halfTileSize - this.tileSize},
                { x: x + halfTileSize, y: y + halfTileSize, z: z + halfTileSize - this.tileSize},
                { x: x - halfTileSize, y: y + halfTileSize, z: z + halfTileSize - this.tileSize}
            ];
    
            // Add pyramid vertices to objData
            pyramidVertices.forEach(vertex => {
                objData += `v ${vertex.x} ${vertex.y} ${vertex.z}\n`;
            });
    
            // Define faces for the central cube (each face is two triangles)
            const cubeFaces = [
                { a: 1, b: 2, c: 3 }, { a: 1, b: 3, c: 4 }, // Front face
                { a: 5, b: 6, c: 7 }, { a: 5, b: 7, c: 8 }, // Back face
                { a: 1, b: 5, c: 8 }, { a: 1, b: 8, c: 4 }, // Left face
                { a: 2, b: 6, c: 7 }, { a: 2, b: 7, c: 3 }, // Right face
                { a: 4, b: 3, c: 7 }, { a: 4, b: 7, c: 8 }, // Top face
                { a: 1, b: 2, c: 6 }, { a: 1, b: 6, c: 5 }  // Bottom face
            ];
    
            // Add cube faces to objData
            cubeFaces.forEach(face => {
                objData += `f ${face.a + vertexOffset - 1} ${face.b + vertexOffset - 1} ${face.c + vertexOffset - 1}\n`;
            });
    
            // Define faces for the pyramids
            const pyramidFaces = [
                { a: 15, b: 16, c: 9 }, // Front face
                { a: 16, b: 17, c: 9 },
                { a: 17, b: 18, c: 9 },
                { a: 18, b: 15, c: 9 },
                { a: 19, b: 20, c: 10 }, // Back face
                { a: 20, b: 21, c: 10 },
                { a: 21, b: 22, c: 10 },
                { a: 22, b: 19, c: 10 },
                { a: 1, b: 5, c: 11 }, // Left face
                { a: 5, b: 8, c: 11 },
                { a: 8, b: 4, c: 11 },
                { a: 4, b: 1, c: 11 },
                { a: 2, b: 6, c: 12 }, // Right face
                { a: 6, b: 7, c: 12 },
                { a: 7, b: 3, c: 12 },
                { a: 3, b: 2, c: 12 },
                { a: 4, b: 3, c: 13 }, // Top face
                { a: 3, b: 7, c: 13 },
                { a: 7, b: 8, c: 13 },
                { a: 8, b: 4, c: 13 },
                { a: 1, b: 2, c: 14 }, // Bottom face
                { a: 2, b: 6, c: 14 },
                { a: 6, b: 5, c: 14 },
                { a: 5, b: 1, c: 14 }
            ];
    
            // Add pyramid faces to objData
            pyramidFaces.forEach(face => {
                objData += `f ${face.a + vertexOffset - 1} ${face.b + vertexOffset - 1} ${face.c + vertexOffset - 1}\n`;
            });
    
            vertexOffset += cubeVertices.length + pyramidVertices.length;
            objData += '\n';
        });
    
        return objData;
    }

    drawCubes(sketch) {
        if (metamoduleBlocks.length > 0) {
            this.drawCubesAsMetamodule(sketch);
            return;
        }
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
    
        for (let i = 0; i < this.cubes.length; i++) {
            const x = this.cubes[i].x * this.tileSize - halfWidth;
            const y = this.cubes[i].y * this.tileSize - halfHeight;
            const z = this.cubes[i].z * this.tileSize;
            let highlightBorder = highlightCoords[0] == this.cubes[i].x && highlightCoords[1] == this.cubes[i].y && highlightCoords[2] == this.cubes[i].z;
            sketch.push();
            sketch.translate(x, y, z);
            if (highlight && this.cubes[i].z === layer) {
                sketch.fill(0, 0, 255);
            } else {
                sketch.fill(this.cubes[i].color[0], this.cubes[i].color[1], this.cubes[i].color[2]);
            }
            sketch.box(this.tileSize);
            if (highlightBorder) {
                sketch.stroke(255, 204, 0);
                sketch.noFill();
                sketch.box(this.tileSize * 1.1);
            }
            const isMatching = (box, cube) => box[0] == cube.x && box[1] == cube.y && box[2] == cube.z;
            if ([boundaryBox[0], boundaryBox[1]].some(box => isMatching(box, this.cubes[i]))) {
                sketch.stroke(128, 0, 128);
                sketch.noFill();
                sketch.box(this.tileSize * 1.1);
            }
            sketch.pop();
        }
        for (let block of coloredBlocks) {
            const x = block.x * this.tileSize - halfWidth;
            const y = block.y * this.tileSize - halfHeight;
            const z = block.z * this.tileSize;
            sketch.push();
            sketch.translate(x, y, z);
            sketch.fill(128, 0, 128);
            sketch.box(this.tileSize);
            sketch.pop();
        }
    }

    drawCubesAsMetamodule(sketch) {
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
    
        for (let i = 0; i < this.cubes.length; i++) {
            const cube = this.cubes[i];
            let minX = Math.min(...metamoduleBlocks.map(block => block.x));
            let maxX = Math.max(...metamoduleBlocks.map(block => block.x));
            let minY = Math.min(...metamoduleBlocks.map(block => block.y));
            let maxY = Math.max(...metamoduleBlocks.map(block => block.y));
            let minZ = Math.min(...metamoduleBlocks.map(block => block.z));
            let maxZ = Math.max(...metamoduleBlocks.map(block => block.z));
            let diffX = maxX - minX + 1;
            let diffY = maxY - minY + 1;
            let diffZ = maxZ - minZ + 1;
            let start = [cube.x * diffX, cube.y * diffY, cube.z * diffZ];
            for (let j = 0; j < metamoduleBlocks.length; j++) {
                const newX = start[0] + metamoduleBlocks[j].x;
                const newY = start[1] + metamoduleBlocks[j].y;
                const newZ = start[2] + metamoduleBlocks[j].z;
                const x = newX * this.tileSize - halfWidth;
                const y = newY * this.tileSize - halfHeight;
                const z = newZ * this.tileSize;
                let highlightBorder = highlightCoords[0] == this.cubes[i].x && highlightCoords[1] == this.cubes[i].y && highlightCoords[2] == this.cubes[i].z;
                sketch.push();
                sketch.translate(x, y, z);
                if (highlight && this.cubes[i].z === layer) {
                    sketch.fill(0, 0, 255);
                } else {
                    sketch.fill(this.cubes[i].color[0], this.cubes[i].color[1], this.cubes[i].color[2]);
                }
                sketch.box(this.tileSize);
                if (highlightBorder) {
                    sketch.stroke(255, 204, 0);
                    sketch.noFill();
                    sketch.box(this.tileSize * 1.1);
                }
                const isMatching = (box, cube) => box[0] == cube.x && box[1] == cube.y && box[2] == cube.z;
                if ([boundaryBox[0], boundaryBox[1]].some(box => isMatching(box, this.cubes[i]))) {
                    sketch.stroke(128, 0, 128);
                    sketch.noFill();
                    sketch.box(this.tileSize * 1.1);
                }
                sketch.pop();
            }
        }
    }

    drawHexagons(sketch) {
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        const depth = this.tileSize;
    
        for (let i = 0; i < this.hexagons.length; i++) {
            const x = this.hexagons[i].x * this.tileSize - halfWidth;
            const y = this.hexagons[i].y * this.tileSize - halfHeight;
            const z = this.hexagons[i].z * this.tileSize;
            sketch.push();
            sketch.translate(x, y, z);
    
            if (highlight && this.hexagons[i].z === layer) {
                sketch.fill(0, 0, 255);
            } else {
                sketch.fill(this.hexagons[i].color[0], this.hexagons[i].color[1], this.hexagons[i].color[2]);
            }
    
            // Draw top face
            sketch.beginShape();
            for (let j = 0; j < 6; j++) {
                const angle = sketch.TWO_PI / 6 * j;
                const hx = this.tileSize * Math.cos(angle);
                const hy = this.tileSize * Math.sin(angle);
                sketch.vertex(hx, hy, 0);
            }
            sketch.endShape(sketch.CLOSE);
    
            // Draw bottom face
            sketch.beginShape();
            for (let j = 0; j < 6; j++) {
                const angle = sketch.TWO_PI / 6 * j;
                const hx = this.tileSize * Math.cos(angle);
                const hy = this.tileSize * Math.sin(angle);
                sketch.vertex(hx, hy, depth);
            }
            sketch.endShape(sketch.CLOSE);
    
            // Draw sides
            for (let j = 0; j < 6; j++) {
                const angle1 = sketch.TWO_PI / 6 * j;
                const angle2 = sketch.TWO_PI / 6 * ((j + 1) % 6);
                const hx1 = this.tileSize * Math.cos(angle1);
                const hy1 = this.tileSize * Math.sin(angle1);
                const hx2 = this.tileSize * Math.cos(angle2);
                const hy2 = this.tileSize * Math.sin(angle2);
    
                sketch.beginShape();
                sketch.vertex(hx1, hy1, 0);
                sketch.vertex(hx2, hy2, 0);
                sketch.vertex(hx2, hy2, depth);
                sketch.vertex(hx1, hy1, depth);
                sketch.endShape(sketch.CLOSE);
            }
    
            sketch.pop();
        }
    }

    drawRhombicDodecahedron(sketch) {
        // coords from https://stackoverflow.com/questions/29314787/three-js-trying-to-render-a-custom-mesh-rhombic-dodecahedron
        // const vertices = [
        //     [-1, 1, -1], // A       (0)
        //     [1, 1, -1],  // B       (1)
        //     [1, 1, 1],   // C       (2)
        //     [-1, 1, 1],  // D       (3)
        //     [-1, -1, -1],// E       (4)
        //     [1, -1, -1], // F       (5)
        //     [1, -1, 1],  // G       (6)
        //     [-1, -1, 1], // H       (7)
        //     [-2, 0, 0],  // left    (8)
        //     [2, 0, 0],   // right   (9)
        //     [0, 2, 0],   // top     (10)
        //     [0, -2, 0],  // bottom  (11)
        //     [0, 0, 2],   // front   (12)
        //     [0, 0, -2]   // back    (13)
        // ];
        
        // const faces = [
        //     [12, 2, 10, 3],  // (front, C, top, D)
        //     [12, 6, 9, 2],   // (front, G, right, C)
        //     [12, 7, 11, 6],  // (front, H, bottom, G)
        //     [12, 3, 8, 7],   // (front, D, left, H)
        //     [13, 5, 11, 4],  // (back, F, bottom, E)
        //     [13, 4, 8, 0],   // (back, E, left, A)
        //     [13, 0, 10, 1],  // (back, A, top, B)
        //     [13, 1, 9, 5],   // (back, B, right, F)
        //     [8, 3, 10, 0],   // (left, D, top, A)
        //     [8, 4, 11, 7],   // (left, E, bottom, H)
        //     [9, 1, 10, 2],   // (right, B, top, C)
        //     [9, 6, 11, 5]    // (right, G, bottom, F)
        // ];

        const cos45 = Math.sqrt(2) / 2;
        const sin45 = Math.sqrt(2) / 2;    
        const vertices = [
            [-1 * cos45 + -1 * sin45, 1, -1 * -sin45 + -1 * cos45], // A       (0)
            [1 * cos45 + -1 * sin45, 1, 1 * -sin45 + -1 * cos45],   // B       (1)
            [1 * cos45 + 1 * sin45, 1, 1 * -sin45 + 1 * cos45],     // C       (2)
            [-1 * cos45 + 1 * sin45, 1, -1 * -sin45 + 1 * cos45],   // D       (3)
            [-1 * cos45 + -1 * sin45, -1, -1 * -sin45 + -1 * cos45],// E       (4)
            [1 * cos45 + -1 * sin45, -1, 1 * -sin45 + -1 * cos45],  // F       (5)
            [1 * cos45 + 1 * sin45, -1, 1 * -sin45 + 1 * cos45],    // G       (6)
            [-1 * cos45 + 1 * sin45, -1, -1 * -sin45 + 1 * cos45],  // H       (7)
            [-2 * cos45 + 0 * sin45, 0, -2 * -sin45 + 0 * cos45],   // left    (8)
            [2 * cos45 + 0 * sin45, 0, 2 * -sin45 + 0 * cos45],     // right   (9)
            [0, 2, 0],                                              // top     (10)
            [0, -2, 0],                                             // bottom  (11)
            [0 * cos45 + 2 * sin45, 0, 0 * -sin45 + 2 * cos45],     // front   (12)
            [0 * cos45 + -2 * sin45, 0, 0 * -sin45 + -2 * cos45]    // back    (13)
        ];
        
        const faces = [
            [12, 2, 10, 3],  // (front, C, top, D)
            [12, 6, 9, 2],   // (front, G, right, C)
            [12, 7, 11, 6],  // (front, H, bottom, G)
            [12, 3, 8, 7],   // (front, D, left, H)
            [13, 5, 11, 4],  // (back, F, bottom, E)
            [13, 4, 8, 0],   // (back, E, left, A)
            [13, 0, 10, 1],  // (back, A, top, B)
            [13, 1, 9, 5],   // (back, B, right, F)
            [8, 3, 10, 0],   // (left, D, top, A)
            [8, 4, 11, 7],   // (left, E, bottom, H)
            [9, 1, 10, 2],   // (right, B, top, C)
            [9, 6, 11, 5]    // (right, G, bottom, F)
        ];
    
        const colors = [
            [255, 0, 0],    // Red
            [0, 255, 0],    // Green
            [0, 0, 255],    // Blue
            [255, 255, 0],  // Yellow
            [0, 255, 255],  // Cyan
            [255, 0, 255],  // Magenta
            [192, 192, 192],// Silver
            [128, 128, 128],// Gray
            [128, 0, 0],    // Maroon
            [128, 128, 0],  // Olive
            [0, 128, 0],    // Dark Green
            [0, 128, 128]   // Teal
        ];
    
        for (let i = 0; i < faces.length; i++) {
            sketch.fill(colors[i][0], colors[i][1], colors[i][2]);
            sketch.beginShape();
            const face = faces[i];
            for (let j = 0; j < face.length; j++) {
                const vertex = vertices[face[j]];
                sketch.vertex(vertex[0], vertex[1], vertex[2]);
            }
            sketch.endShape(sketch.CLOSE);
        }
    }
    
    // drawRhombicDodecahedrons(sketch) {
    //     const halfWidth = this.width / 2;
    //     const halfHeight = this.height / 2;
    //     const scaleFactor = 10;
    //     const rhombicDodecahedronSize = this.tileSize;
    
    //     for (let i = 0; i < this.rhomdod.length; i++) {
    //         const x = this.rhomdod[i].x * rhombicDodecahedronSize - halfWidth;
    //         const y = this.rhomdod[i].y * rhombicDodecahedronSize - halfHeight;
    //         const z = this.rhomdod[i].z * rhombicDodecahedronSize;
    //         sketch.push();
    //         sketch.translate(x, y, z);
    //         sketch.scale(scaleFactor);
    //         sketch.fill(this.rhomdod[i].color[0], this.rhomdod[i].color[1], this.rhomdod[i].color[2]);
    //         this.drawRhombicDodecahedron(sketch, this.tileSize);
    //         sketch.pop();
    //     }
    // }

    drawPyramid(sketch, baseSize, height) {
        // Precompute vertices
        const v0 = [-baseSize / 2, baseSize / 2, 0];
        const v1 = [baseSize / 2, baseSize / 2, 0];
        const v2 = [baseSize / 2, -baseSize / 2, 0];
        const v3 = [-baseSize / 2, -baseSize / 2, 0];
        const apex = [0, 0, height];
    
        // Draw base
        sketch.beginShape();
        sketch.vertex(...v0);
        sketch.vertex(...v1);
        sketch.vertex(...v2);
        sketch.vertex(...v3);
        sketch.endShape(sketch.CLOSE);
    
        // Draw faces
        const faces = [
            [v0, v1, apex],
            [v1, v2, apex],
            [v2, v3, apex],
            [v3, v0, apex]
        ];
    
        faces.forEach(face => {
            sketch.beginShape();
            face.forEach(vertex => sketch.vertex(...vertex));
            sketch.endShape(sketch.CLOSE);
        });
    }
    
    drawRhombicDodecahedrons(sketch) {
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        const pyramidHeight = this.tileSize / 2;
        const halfTileSize = this.tileSize / 2;
    
        const transformations = [
            { translate: [0, 0, halfTileSize], rotate: [0, 0, 0] }, // Front face
            { translate: [0, 0, -halfTileSize], rotate: [0, Math.PI, 0] }, // Back face
            { translate: [-halfTileSize, 0, 0], rotate: [0, -Math.PI / 2, 0] }, // Left face
            { translate: [halfTileSize, 0, 0], rotate: [0, Math.PI / 2, 0] }, // Right face
            { translate: [0, halfTileSize, 0], rotate: [-Math.PI / 2, 0, 0] }, // Top face
            { translate: [0, -halfTileSize, 0], rotate: [Math.PI / 2, 0, 0] } // Bottom face
        ];
    
        for (let i = 0; i < this.rhomdod.length; i++) {
            const x = this.rhomdod[i].x * this.tileSize - halfWidth;
            const y = this.rhomdod[i].y * this.tileSize - halfHeight;
            const z = this.rhomdod[i].z * this.tileSize;
            sketch.push();
            sketch.translate(x, y, z);
            if (highlight && this.rhomdod[i].z === layer) {
                sketch.fill(0, 0, 255);
            } else {
                sketch.fill(this.rhomdod[i].color[0], this.rhomdod[i].color[1], this.rhomdod[i].color[2]);
            }
            sketch.box(this.tileSize);
    
            // Draw pyramids on each face of the cube
            transformations.forEach(trans => {
                sketch.push();
                sketch.translate(...trans.translate);
                sketch.rotateX(trans.rotate[0]);
                sketch.rotateY(trans.rotate[1]);
                sketch.rotateZ(trans.rotate[2]);
                this.drawPyramid(sketch, this.tileSize, pyramidHeight);
                sketch.pop();
            });
    
            sketch.pop();
        }
    }
    
    draw(sketch) {
        sketch.fill(255);
        switch (this.shape) {
            case "cube":
                this.drawCubes(sketch);
                break;
            case "hexagon":
                this.drawHexagons(sketch);
                break;
            case "rhombicDodecahedron":
                this.drawRhombicDodecahedrons(sketch);
                break;
            default:
                break;
        }
    }
}