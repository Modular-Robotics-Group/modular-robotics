document.oncontextmenu = () => { return false; }
canvasW = window.screen.width * 1 - 200;
canvasH = window.screen.height * .8;
canvasPosition = [200, 0]
canvasZ = 75;
twoDtileSize = canvasW / (2 * 30);
twoDtileSizeDelta = twoDtileSize * .1;
layer = 0;
highlight = false;
highlightCoords = [-1, -1, -1];
mStatic = false;
objects = [];
blocks = [];
copyBlocks = [];
metamoduleBlocks = [];
coloredBlocks = [];
importBlocks = [];
historyStack = [];
redoStack = [];
rgbColor = [255, 255, 255];
boundaryBox = [[-1, -1, -1], [-1, -1, -1]];

function triggerFileInput() {
    document.getElementById('fileInput').click();
}

function importFromJson(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const jsonContent = JSON.parse(e.target.result);
                processJson(jsonContent);
            } catch (error) {
                console.error("Error parsing JSON:", error);
            }
        };
        reader.readAsText(file);
    }
}

function processJson(parsedJson) {
    defaultColor = [255, 255, 255];
    var modules = parsedJson.modules;
    for (var i = 0; i < modules.length; i++) {
        var module = modules[i];
        var position = module.position;
        var color = module.properties && module.properties.colorProperty ? module.properties.colorProperty.color : defaultColor;
        var staticV = module.static ? module.static : false;
        var z = module.position[2] ? module.position[2] : 0;
        var block = {
            x: position[0],
            y: position[1],
            z: z,
            color: color,
            static: staticV
        };
        importBlocks.push(block);
    }
}

function exportToJson() {
    var jsonOutput = "{\n";
    var sameZ = true;
    var firstZ = blocks.length > 0 ? blocks[0].z : null;
    let axisSize = 0;
    let minX = Infinity, minY = Infinity, minZ = Infinity;

    // Determine if all blocks are on the same Z level and find the minimum coordinates
    for (var i = 0; i < blocks.length; i++) {
        var current_block = blocks[i];
        if (current_block.z !== firstZ) {
            sameZ = false;
        }
        minX = Math.min(minX, current_block.x);
        minY = Math.min(minY, current_block.y);
        minZ = Math.min(minZ, current_block.z);
    }

    // Calculate the axis size
    for (let i = 0; i < blocks.length; i++) {
        for (let j = 0; j < blocks.length; j++) {
            let diffX = Math.abs(blocks[i].x - blocks[j].x);
            let diffY = Math.abs(blocks[i].y - blocks[j].y);
            let diffZ = Math.abs(blocks[i].z - blocks[j].z);
            axisSize = Math.max(axisSize, diffX, diffY, diffZ);
        }
    }

    var order = sameZ ? 2 : 3;
    jsonOutput += "    \"order\": " + order + ",\n";
    jsonOutput += "    \"axisSize\": " + (axisSize + 1) + ",\n";
    jsonOutput += "    \"modules\": [";

    // Adjust coordinates to start at origin
    for (var i = 0; i < blocks.length; i++) {
        var current_block = blocks[i];
        var staticV = current_block.mStatic !== undefined ? current_block.mStatic : false;
        jsonOutput += "\n\t{\n\t\t\"position\": [" + (current_block.x - minX) + ", " + (current_block.y - minY);
        if (!sameZ) {
            jsonOutput += ", " + (current_block.z - minZ);
        }
        jsonOutput += "],\n";
        jsonOutput += "\t\t\"static\": " + staticV + ",\n";
        jsonOutput += "\t\t\"properties\": {\n";
        jsonOutput += "\t\t\t\"colorProperty\": {\n";
        jsonOutput += "\t\t\t\t\"color\": [" + current_block.color + "]\n";
        jsonOutput += "\t\t\t}\n";
        jsonOutput += "\t\t}\n\t}";
        if (i < blocks.length - 1) {
            jsonOutput += ",";
        }
    }
    jsonOutput += "\n    ]\n}";
    var defaultFilename = "3Dtiles.json";
    var filename = prompt("Enter the filename:", defaultFilename);
    dwnldAsTxt(filename, jsonOutput);
}

function exportToScen() {
    var ScenOutput = "";
    ScenOutput += "0 244 244 0 100\n\n"
    for (var i=0; i < blocks.length; i++){
	if(i < 10){
		ScenOutput += "0";
	}
	current_block = blocks[i];
	ScenOutput += i + "," + "0" + "," + current_block.x + "," + current_block.y + "," + current_block.z + "\n";
    }
    var defaultFilename = "3Dtiles.scen";
    var filename = prompt("Enter the filename:", defaultFilename);
    dwnldAsTxt(filename, ScenOutput);
}

function exportToObj() {
    var defaultFilename = "model.obj";
    var filename = prompt("Enter the filename:", defaultFilename);
    const blob = new Blob([objects], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function dwnldAsTxt(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

function changeColor(color) {
    rgbColor = color;
}

function ChangeLabel(newString) {
    document.getElementById("curLayer").textContent = newString;
}

function upLayer() {
    layer++;
    ChangeLabel("Current Layer = " + layer);
}

function downLayer() {
    layer--;
    ChangeLabel("Current Layer = " + layer);
}

function highlightLayer() {
    highlight = !highlight;
}

function toggleStatic() {
    const button = document.getElementById('static');
    button.classList.toggle('active');
    mStatic = !mStatic;
}

function increaseTileSize() {
    if (twoDtileSize <= 50) {
        twoDtileSize += twoDtileSizeDelta;
    }
}

function decreaseTileSize() {
    if (twoDtileSize > 10) {
        twoDtileSize -= twoDtileSizeDelta;
    }
}

var sketch1 = function (sketch) {
    let undoPressed = false;
    let redoPressed = false;
    let clearPressed = false;
    let switchShapePressed = false;

    sketch.setup = function () {
        canv1 = sketch.createCanvas(canvasW / 2, canvasH);
        canv1.position(canvasPosition[0], canvasPosition[1]);
        screen = new twoDScreen(canvasW / 2, canvasH, twoDtileSize);
        prevLayer = layer;
        let undoButton = document.getElementById('undo');
        if (undoButton) {
            undoButton.addEventListener('click', function () {
                undoPressed = true;
            });
        }
        let redoButton = document.getElementById('redo');
        if (redoButton) {
            redoButton.addEventListener('click', function () {
                redoPressed = true;
            });
        }
        let clearButton = document.getElementById('clear');
        if (clearButton) {
            clearButton.addEventListener('click', function () {
                clearPressed = true;
            });
        }
        let switchShapeButton = document.getElementById('switch-shape');
        if (switchShapeButton) {
            switchShapeButton.addEventListener('click', function () {
                switchShapePressed ^= true;
            });
        }
        let increaseTileSizeButton = document.getElementById('increaseTileSize');
        if (increaseTileSizeButton) {
            increaseTileSizeButton.addEventListener('click', function () {
                increaseTileSize();
                console.log("Tile Size Increased");
                updateCanvas();
            });
        }
        let decreaseTileSizeButton = document.getElementById('decreaseTileSize');
        if (decreaseTileSizeButton) {
            decreaseTileSizeButton.addEventListener('click', function () {
                decreaseTileSize();
                console.log("Tile Size Decreased");
                updateCanvas();
            });
        }
    }

    function updateCanvas() {
        let existingCubes = screen ? screen.cubes : [];
        canv1 = sketch.createCanvas(canvasW / 2, canvasH);
        canv1.position(canvasPosition[0], canvasPosition[1]);
        screen = new twoDScreen(canvasW / 2, canvasH, twoDtileSize);
        screen.cubes = existingCubes;
    }

    sketch.draw = function () {
        offsetX = document.getElementById('canvas-container').scrollLeft;
        offsetY = document.getElementById('canvas-container').scrollTop;
        sketch.translate(-offsetX, -offsetY);
        if (layer > prevLayer) {
            screen.upLayer();
        }
        if (layer < prevLayer) {
            screen.downLayer();
        }
        sketch.background(0, 255, 0);
        screen.draw(sketch, highlightCoords);
        prevLayer = layer;
        switch (screen.shape) {
            case 'hexagon':
                blocks = screen.getHexagons;
                objects = threeScreen.generateHexagonsOjects();
                break;
            case 'cube':
                blocks = screen.getCubes;
                objects = threeScreen.generateCubeObjects();
                break;
            case 'rhombicDodecahedron':
                blocks = screen.getRhomdods;
                objects = threeScreen.generateRhomdodObjects();
                break;
            default:
                console.error('Unknown shape:', screen.shape);
                blocks = [];
                break;
        }
        if (undoPressed) {
            console.log("Undo Move");
            if (historyStack.length > 0) {
                let lastMove = historyStack.pop();
                redoStack.push(lastMove);
                if (lastMove.action === 'add') {
                    screen.removeCube(lastMove.x, lastMove.y, lastMove.z);
                    threeScreen.removeCube(lastMove.x, lastMove.y, lastMove.z);
                } else {
                    screen.addCube(new Cube(lastMove.x, lastMove.y, lastMove.z, lastMove.color, lastMove.mStatic));
                    threeScreen.addCube(new Cube(lastMove.x, lastMove.y, lastMove.z, lastMove.color, lastMove.mStatic));
                }
            }
            undoPressed = false;
        }
        if (redoPressed) {
            if (redoStack.length > 0) {
                console.log("Redo Move");
                let lastMove = redoStack.pop();
                historyStack.push(lastMove);
                if (lastMove.action === 'add') {
                    screen.addCube(new Cube(lastMove.x, lastMove.y, lastMove.z, lastMove.color, lastMove.mStatic));
                    threeScreen.addCube(new Cube(lastMove.x, lastMove.y, lastMove.z, lastMove.color, lastMove.mStatic));
                } else {
                    screen.removeCube(lastMove.x, lastMove.y, lastMove.z);
                    threeScreen.removeCube(lastMove.x, lastMove.y, lastMove.z);
                }
            }
            redoPressed = false;
        }
        if (clearPressed) {
            console.log("Clearing Screen");
            screen.removeAllCubes()
            threeScreen.removeAllCubes();
            clearPressed = false;
        }
        if (switchShapePressed) {
            if (document.getElementById("switch-shape").innerText === "Switch to Hexagon") {
                document.getElementById("switch-shape").innerText = "Switch to Dodecahedron";
                screen.setShape("hexagon");
                threeScreen.setShape("hexagon");
            } else if (document.getElementById("switch-shape").innerText === "Switch to Cube") {
                document.getElementById("switch-shape").innerText = "Switch to Dodecahedron";
                screen.setShape("cube");
                threeScreen.setShape("cube");
            } else if (document.getElementById("switch-shape").innerText === "Switch to Dodecahedron") {
                document.getElementById("switch-shape").innerText = "Switch to Cube";
                screen.setShape("rhombicDodecahedron");
                threeScreen.setShape("rhombicDodecahedron");
            }
            switchShapePressed = false;
            clearPressed = true;
        }
        if (importBlocks.length > 0) {
            screen.removeAllCubes()
            threeScreen.removeAllCubes();
            screen.removeAllHexagons();
            threeScreen.removeAllHexagons();
            screen.removeAllRhomdods();
            threeScreen.removeAllRhomdods();
            switch (screen.shape) {
                case 'hexagon':
                    for (let block of importBlocks) {
                        screen.addHexagon(new Hexagon(block.x, block.y, block.z, block.color, block.static));
                        threeScreen.addHexagon(new Hexagon(block.x, block.y, block.z, block.color, block.static));
                    }
                    break;
                case 'cube':
                    for (let block of importBlocks) {
                        screen.addCube(new Cube(block.x, block.y, block.z, block.color, block.static));
                        threeScreen.addCube(new Cube(block.x, block.y, block.z, block.color, block.static));
                    }
                    break;
                case 'rhombicDodecahedron':
                    for (let block of importBlocks) {
                        screen.addRhomdod(new RhomDod(block.x, block.y, block.z, block.color, block.static));
                        threeScreen.addRhomdod(new RhomDod(block.x, block.y, block.z, block.color, block.static));
                    }
                    break;
                default:
                    console.error('Unknown shape:', screen.shape);
                    blocks = [];
                    break;
            }
            importBlocks.length = 0;
        }
        // let message = areAllCubesConnected(blocks) ? "Yes" : "No";
        // document.getElementById("checkConnectivity").innerText = "Connected: " + message;    
    }

    function handleAddShape(x, y, z = screen.layer) {
        if (screen.shape === "cube") {
            if (screen.hasCube(x, y, z)) return;
            screen.addCube(new Cube(x, y, z, rgbColor, mStatic));
            threeScreen.addCube(new Cube(x, y, z, rgbColor, mStatic));
            historyStack.push({ action: 'add', x: x, y: y, z: z, color: rgbColor, mStatic: mStatic });
        } else if (screen.shape === "hexagon") {
            screen.addHexagon(new Hexagon(x, y, z, rgbColor, mStatic));
            threeScreen.addHexagon(new Hexagon(x, y, z, rgbColor, mStatic));
        } else if (screen.shape === "rhombicDodecahedron") {
            if (screen.hasRhombicDodec(x, y, z)) return;
            const newRhomDod = new RhomDod(x, y, z, rgbColor, mStatic);
            if (!screen.invalidRhomdod.some(rhmdod => rhmdod[0] == x && rhmdod[1] == y && rhmdod[2] == z)) {
                screen.addRhomdod(newRhomDod);
                threeScreen.addRhomdod(newRhomDod);
            }
        }
    }
    
    function handleRemoveShape(x, y) {
        if (screen.shape === "cube") {
            screen.removeCube(x, y, screen.layer);
            threeScreen.removeCube(x, y, screen.layer);
            historyStack.push({ action: 'remove', x: x, y: y, z: screen.layer });
        } else if (screen.shape === "hexagon") {
            screen.removeHexagon(x, y, screen.layer);
            threeScreen.removeHexagon(x, y, screen.layer);
        } else if (screen.shape === "rhombicDodecahedron") {
            screen.removeRhomdod(x, y, screen.layer);
            threeScreen.removeRhomdod(x, y, screen.layer);
        }
    }
    
    function handleMouseAction(isAdding) {
        let x, y, yM;
        if (screen.shape === "cube" || screen.shape === "rhombicDodecahedron") {
            x = Math.floor(sketch.mouseX / twoDtileSize);
            y = Math.floor(sketch.mouseY / twoDtileSize);
            xM = Math.floor((canvasW / 2) / twoDtileSize);
            yM = Math.floor(canvasH / twoDtileSize);
            console.log(x, xM);
            // if (x >= xM - 1) {
            //     canvasW *= 2;
            //     canv1 = sketch.createCanvas(canvasW / 2, canvasH);
            //     canv1.position(canvasPosition[0], canvasPosition[1]);
            //     screen.width = canvasW / 2;
            // }
            // if (y >= yM - 1) {
            //     canvasH *= 2;
            //     canv1 = sketch.createCanvas(canvasW / 2, canvasH);
            //     canv1.position(canvasPosition[0], canvasPosition[1]);
            //     screen.height = canvasH;
            // }
        } else if (screen.shape === "hexagon") {
            [x, y] = pixelToHex(sketch.mouseX, sketch.mouseY, twoDtileSize);
        }
        if (isAdding) {
            handleAddShape(x, y);
        } else {
            handleRemoveShape(x, y);
        }
    }

    function highlightTile() {
        x = Math.floor(sketch.mouseX / twoDtileSize);
        y = Math.floor(sketch.mouseY / twoDtileSize);
        highlightCoords = [x, y, layer];
    }

    function inBorder() {
        return sketch.mouseX < canvasW / 2
            && sketch.mouseX > 0
            && sketch.mouseY < canvasH
            && sketch.mouseY > 0;
    }
    
    sketch.mousePressed = function () {
        if (!inBorder()) return;
        if (sketch.mouseButton === sketch.LEFT) {
            handleMouseAction(true);
            highlightTile();
        } else {
            handleMouseAction(false);
        }
    };
    
    sketch.mouseDragged = function () {
        if (!inBorder()) return;
        if (sketch.mouseButton === sketch.LEFT) {
            handleMouseAction(true);
        } else {
            handleMouseAction(false);
        }
    };

    sketch.keyPressed = function() {
        x = Math.floor(sketch.mouseX / twoDtileSize);
        y = Math.floor(sketch.mouseY / twoDtileSize);
        if (sketch.key === '1') {
            boundaryBox[0] = [x, y, screen.layer];
        } else if (sketch.key === '2') {
            copyBlocks = [];
            coloredBlocks = [];
            boundaryBox[1] = [x, y, screen.layer];
            for (let i = boundaryBox[0][0]; i <= boundaryBox[1][0]; i++) {
                for (let j = boundaryBox[0][1]; j <= boundaryBox[1][1]; j++) {
                    for (let k = boundaryBox[0][2]; k <= boundaryBox[1][2]; k++) {
                        if (screen.hasCube(i, j, k)) {
                            copyBlocks.push({ x: i, y: j, z: k });
                            coloredBlocks.push({x: i, y: j, z: k});
                        }
                    }
                }
            }
        } else if (sketch.key === '3') {
            for (let block of copyBlocks) {
                handleAddShape(x + block.x - boundaryBox[0][0], y + block.y - boundaryBox[0][1], screen.layer + block.z - boundaryBox[0][2]);
            }
        } else if (sketch.key === '4') {
            coloredBlocks = [];
            for (let i = boundaryBox[0][0]; i <= boundaryBox[1][0]; i++) {
                for (let j = boundaryBox[0][1]; j <= boundaryBox[1][1]; j++) {
                    for (let k = boundaryBox[0][2]; k <= boundaryBox[1][2]; k++) {
                        screen.removeCube(i, j, k);
                        threeScreen.removeCube(i, j, k);
                    }
                }
            }
        }
    }
}

var sketch2 = function (sketch) {
    sketch.setup = function () {
        canv2 = sketch.createCanvas(canvasW / 2, canvasH, sketch.WEBGL);
        canv2.position(canvasW / 2 + canvasPosition[0], canvasPosition[1]);
        threeScreen = new threeDScreen(canvasW / 2, canvasH, twoDtileSize / 5);
        sketch._center = [0, 0, 0];
        sketch.createEasyCam();
    }

    sketch.draw = function () {
        sketch.background(205, 102, 94);
        threeScreen.draw(sketch, highlight, highlightCoords, layer);
    }
}

function arraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) return false;
    }
    return true;
}

function includesArray(mainArray, subArray) {
    for (let arr of mainArray) {
        if (arraysEqual(arr, subArray)) return true;
    }
    return false;
}

function areAdjacent(block1, block2) {
    // Assuming blocks are adjacent if they share a face
    return Math.abs(block1.x - block2.x) + Math.abs(block1.y - block2.y) + Math.abs(block1.z - block2.z) === 1;
}

function areAllCubesConnected(blocks) {
    if (blocks.length === 0) return true;

    // Create an adjacency list
    let adjacencyList = new Map();
    blocks.forEach(block => {
        adjacencyList.set(block, []);
    });

    // Populate the adjacency list
    blocks.forEach(block => {
        blocks.forEach(otherBlock => {
            if (block !== otherBlock && areAdjacent(block, otherBlock)) {
                adjacencyList.get(block).push(otherBlock);
            }
        });
    });

    // Perform DFS
    let visited = new Set();
    function dfs(block) {
        visited.add(block);
        adjacencyList.get(block).forEach(neighbor => {
            if (!visited.has(neighbor)) {
                dfs(neighbor);
            }
        });
    }

    // Start DFS from the first block
    dfs(blocks[0]);
    return visited.size === blocks.length;
}

function hexRound(q, r) {
    let x = q;
    let z = r;
    let y = -x - z;

    let rx = Math.round(x);
    let ry = Math.round(y);
    let rz = Math.round(z);

    let x_diff = Math.abs(rx - x);
    let y_diff = Math.abs(ry - y);
    let z_diff = Math.abs(rz - z);

    if (x_diff > y_diff && x_diff > z_diff) {
        rx = -ry - rz;
    } else if (y_diff > z_diff) {
        ry = -rx - rz;
    } else {
        rz = -rx - ry;
    }

    return { q: rx, r: rz };
}

function pixelToHex(x, y, size) {
    const vertDist = (Math.sqrt(3) * size);
    const horizDist = (1.5 * size);
    let q = (Math.floor(x / horizDist) * horizDist);
    let r = (Math.floor(y / vertDist) * vertDist);
    let off = (Math.floor(x / horizDist) - 1) * Math.floor(y / vertDist) + Math.floor(x / horizDist + Math.floor(y / vertDist));
    if (off&1) {
        r += vertDist / 2;
    }
    let values = hexRound(q, r);
    q = values.q;
    r = values.r;
    return [q, r];
}

document.addEventListener('mousemove', function(event) {
    const coordinates = getTileCoordinates(event.clientX, event.clientY);
    let displayX = coordinates.x;
    let displayY = coordinates.y;
    const gridWidth = Math.floor(canvasW / twoDtileSize / 2);
    const gridHeight = Math.floor(canvasH / twoDtileSize);
    if (coordinates.x < 0 || coordinates.y < 0 || coordinates.x >= gridWidth || coordinates.y >= gridHeight) {
        displayX = '-';
        displayY = '-';
    }
    document.getElementById('coordinates').innerText = `Tile Coordinates: x=${displayX}, y=${displayY}`;
});

function getTileCoordinates(mouseX, mouseY) {
    const tileX = Math.floor((mouseX-canvasPosition[0]) / twoDtileSize);
    const tileY = Math.floor((mouseY-canvasPosition[1]) / twoDtileSize);
    return { x: tileX, y: tileY };
}

twodCanv = new p5(sketch1);
threeDCanv = new p5(sketch2);