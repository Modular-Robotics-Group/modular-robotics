class twoDScreen {
    constructor(width, height, tileSize) {
        this.width    = width
        this.height   = height;
        this.tileSize = tileSize;
        this.layer    = 0;
        this.cubes    = [];
        this.hexagons = [];
        this.rhomdod  = [];
        this.invalidRhomdod = [];
        this.shape = "cube";
    }

    set layer(value) {
        this._layer = value;
    }
    
    get layer() {
        return this._layer;
    }

    get getCubes() {
        return this.cubes;
    }

    set setCubes(cubes) {
        this._cubes = cubes;
    }

    get getHexagons() {
        return this.hexagons;
    }

    set setHexagons(hexagons) {
        this._hexagons = hexagons;
    }

    get getRhomdods() {
        return this.rhomdod;
    }

    set setRhomdods(rhomdod) {
        this._rhomdod = rhomdod;
    }

    get getShape() {
        return this.shape;
    }

    set setShape(shape) {
        this._shape = shape;
    }

    get width() {
        return this._width;
    }

    set width(value) {
        this._width = value;
    }

    get height() {
        return this._height;
    }

    set height(value) {
        this._height = value;
    }

    upLayer() {
        this.layer++;
    }

    downLayer() {
        this.layer--;
    }

    addCube(cube){
        this.cubes.push(cube);
    }

    addHexagon(hexagon) {
        this.hexagons.push(hexagon);
    }

    addRhomdod(rhomdod) {
        this.addInvalidRhomdod(rhomdod);
        this.rhomdod.push(rhomdod);
    }

    addInvalidRhomdod(rhomdod) {
        let x = rhomdod.x;
        let y = rhomdod.y;
        let z = this.layer;

        // current layer 4 adjacent faces
        this.invalidRhomdod.push([x-1, y, z]);
        this.invalidRhomdod.push([x, y-1, z]);
        this.invalidRhomdod.push([x+1, y, z]);
        this.invalidRhomdod.push([x, y+1, z]);

        // top layer 4 non-adjacent faces
        this.invalidRhomdod.push([x-1, y-1, z+1]);
        this.invalidRhomdod.push([x+1, y-1, z+1]);
        this.invalidRhomdod.push([x-1, y+1, z+1]);
        this.invalidRhomdod.push([x+1, y+1, z+1]);

        // top layer 4 non-adjacent faces
        this.invalidRhomdod.push([x-1, y-1, z-1]);
        this.invalidRhomdod.push([x+1, y-1, z-1]);
        this.invalidRhomdod.push([x-1, y+1, z-1]);
        this.invalidRhomdod.push([x+1, y+1, z-1]);
    }

    removeInvalidRhomdod(rhomdod) {
        let x = rhomdod.x;
        let y = rhomdod.y;
        let z = rhomdod.z;
    
        const coordinatesToRemove = [
            // current layer 4 adjacent faces
            [x-1, y, z],
            [x, y-1, z],
            [x+1, y, z],
            [x, y+1, z],
    
            // top layer 4 non-adjacent faces
            [x-1, y-1, z+1],
            [x+1, y-1, z+1],
            [x-1, y+1, z+1],
            [x+1, y+1, z+1],
    
            // bottom layer 4 non-adjacent faces
            [x-1, y-1, z-1],
            [x+1, y-1, z-1],
            [x-1, y+1, z-1],
            [x+1, y+1, z-1]
        ];
    
        for (let i = 0; i < coordinatesToRemove.length; i++) {
            for (let j = 0; j < this.rhomdod.length; j++) {
                if (this.rhomdod[j].x === coordinatesToRemove[i][0] &&
                    this.rhomdod[j].y === coordinatesToRemove[i][1] &&
                    this.rhomdod[j].z === coordinatesToRemove[i][2]) {
                    this.rhomdod.splice(j, 1);
                    break;
                }
            }
        }
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
        return false;
    }

    removeRhomdod(x, y, z) {
        for (let i = 0; i < this.rhomdod.length; i++) {
            if (this.rhomdod[i].x === x && this.rhomdod[i].y === y && this.rhomdod[i].z === z) {
                this.removeInvalidRhomdod(this.rhomdod[i]);
                this.rhomdod.splice(i, 1);
                return true;
            }
        }
        return false;
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

    hasCube(x, y, z) {
        for (let i = 0; i < this.cubes.length; i++) {
            if (this.cubes[i].x === x && this.cubes[i].y === y && this.cubes[i].z === z) {
                return true;
            }
        }
        return false; 
    }

    hasRhombicDodec(x, y, z) {
        for (let i = 0; i < this.rhomdod.length; i++) {
            if (this.rhomdod[i].x === x && this.rhomdod[i].y === y && this.rhomdod[i].z === z) {
                return true;
            }
        }
        return false; 
    }

    hexagon = (sketch, centerX, centerY, radius) => {
        const angle = Math.PI / 3;
        sketch.beginShape();
        for (let i = 0; i < 6; i++) {
            const x_i = centerX + radius * Math.cos(angle * i);
            const y_i = centerY + radius * Math.sin(angle * i);
            sketch.vertex(x_i, y_i);
        }
        sketch.endShape(sketch.CLOSE);
    };

    rhombus = (sketch, centerX, centerY, sideLength) => {
        const halfSide = sideLength / 2;
        sketch.beginShape();
        for (let i = 0; i < 4; i++) {
            const angle = Math.PI / 2 * i;
            const x_i = centerX + halfSide * Math.cos(angle);
            const y_i = centerY + halfSide * Math.sin(angle);
            sketch.vertex(x_i, y_i);
        }
        sketch.endShape(sketch.CLOSE);
    };

    square = (sketch, centerX, centerY, sideLength) => {
        const halfSide = sideLength / 2;
        sketch.beginShape();
        sketch.vertex(centerX - halfSide, centerY - halfSide); // Top-left
        sketch.vertex(centerX + halfSide, centerY - halfSide); // Top-right
        sketch.vertex(centerX + halfSide, centerY + halfSide); // Bottom-right
        sketch.vertex(centerX - halfSide, centerY + halfSide); // Bottom-left
        sketch.endShape(sketch.CLOSE);
    };

    drawHexGrid = (sketch, width, height, tileSize) => {
        const vertDist = Math.sqrt(3) * tileSize;
        const horizDist = 1.5 * tileSize;
        let count = 0;

        for (let y = 0; y < height; y += vertDist) {
            for (let x = 0; x < width; x += horizDist) {
                const yOffset = count % 2 === 0 ? 0 : vertDist / 2;
                this.hexagon(sketch, x, y + yOffset, tileSize);
                count++;
            }
            count++;
        }
    };

    drawRhombicDodecahedronGrid = (sketch, width, height, tileSize) => {
        const vertDist = tileSize;
        const horizDist = tileSize;    
        for (let y = tileSize/2; y < height; y += vertDist) {
            for (let x = tileSize/2; x < width; x += horizDist) {
                this.square(sketch, x, y, tileSize);
            }
        }
    };

    drawCubes(sketch) {
        for(let i = 0; i < this.width; i++) {
            sketch.line(0, i*this.tileSize, this.width, i*this.tileSize);
            sketch.line(i*this.tileSize, 0, i*this.tileSize, this.height);
        }
        for (let i = 0; i < this.cubes.length; i++) {
            switch(this.cubes[i].z) {
                case this.layer:
                    sketch.fill(this.cubes[i].color[0], this.cubes[i].color[1], this.cubes[i].color[2]);
                    sketch.rect(
                        this.cubes[i].x*this.tileSize, 
                        this.cubes[i].y*this.tileSize, 
                        this.tileSize, 
                        this.tileSize);
                    if (this.cubes[i].mStatic) {
                        sketch.fill(255);
                        sketch.textAlign(sketch.CENTER, sketch.CENTER);
                        sketch.text('S', 
                            this.cubes[i].x*this.tileSize + this.tileSize/2, 
                            this.cubes[i].y*this.tileSize + this.tileSize/2);
                    }
                    sketch.fill(255);
                    break;
                case this.layer-1:
                    sketch.fill(166, 166, 166);
                    sketch.rect(
                        this.cubes[i].x*this.tileSize, 
                        this.cubes[i].y*this.tileSize, 
                        this.tileSize, 
                        this.tileSize);
                    if (this.cubes[i].mStatic) {
                        sketch.fill(255);
                        sketch.textAlign(sketch.CENTER, sketch.CENTER);
                        sketch.text('S', 
                            this.cubes[i].x*this.tileSize + this.tileSize/2, 
                            this.cubes[i].y*this.tileSize + this.tileSize/2);
                    }
                    sketch.fill(255);
            }
        }
        sketch.stroke(255, 204, 0);
        sketch.noFill();
        sketch.rect(
            highlightCoords[0] * this.tileSize,
            highlightCoords[1] * this.tileSize,
            this.tileSize,
            this.tileSize
        );
    }

    drawHexagons(sketch) {
        this.drawHexGrid(sketch, this.width, this.height, this.tileSize);
        for (let i = 0; i < this.hexagons.length; i++) {
            switch(this.hexagons[i].z) {
                case this.layer:
                    sketch.fill(0);
                    this.hexagon(sketch, this.hexagons[i].x, this.hexagons[i].y, this.tileSize);
                    sketch.fill(255);
                    break;
                case this.layer-1:
                    sketch.fill(166, 166, 166);
                    this.hexagon(sketch, this.hexagons[i].x, this.hexagons[i].y, this.tileSize);
                    sketch.fill(255);
            }
        }
    }

    drawRhombicDodecahedrons(sketch) {
        this.drawRhombicDodecahedronGrid(sketch, this.width, this.height, this.tileSize);
        for (let i = 0; i < this.rhomdod.length; i++) {
            switch(this.rhomdod[i].z) {
                case this.layer:
                    sketch.fill(0);
                    sketch.rect(
                        this.rhomdod[i].x * this.tileSize, 
                        this.rhomdod[i].y * this.tileSize, 
                        this.tileSize, 
                        this.tileSize
                    );
                    if (this.rhomdod[i].mStatic) {
                        sketch.fill(255);
                        sketch.textAlign(sketch.CENTER, sketch.CENTER);
                        sketch.text('S', 
                            this.rhomdod[i].x * this.tileSize + this.tileSize / 2, 
                            this.rhomdod[i].y * this.tileSize + this.tileSize / 2);
                    }
                    sketch.fill(255);
                    break;
                case this.layer - 1:
                    sketch.fill(166, 166, 166);
                    sketch.rect(
                        this.rhomdod[i].x * this.tileSize, 
                        this.rhomdod[i].y * this.tileSize, 
                        this.tileSize, 
                        this.tileSize
                    );
                    if (this.rhomdod[i].mStatic) {
                        sketch.fill(255);
                        sketch.textAlign(sketch.CENTER, sketch.CENTER);
                        sketch.text('S', 
                            this.rhomdod[i].x * this.tileSize + this.tileSize / 2, 
                            this.rhomdod[i].y * this.tileSize + this.tileSize / 2);
                    }
                    sketch.fill(255);
            }
        }
    }

    draw(sketch) {
        sketch.background(255);
        sketch.stroke(0);
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
        sketch.stroke(255);
    }
}