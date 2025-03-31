/* Enums and basic data structures */
import { gModulePositions } from "./main.js";

export let moduleBrush = {
    // Module Properties
    color: { r:1.0, g:1.0, b:1.0 },
    type: 0,
    static: false,
    // Configuration Slice Properties
    zSlice: 0,
    adjSlicesVisible: true
};

export let VisConfigData = {
    nextModID: 0,
    bounds: {
        empty: true,
        x: {
            max: 0,
            min: 0
        },
        y: {
            max: 0,
            min: 0
        },
        z: {
            max: 0,
            min: 0
        }
    },
    updateBounds: (pos) => {
        // There's definitely a nicer way to do this, but it works, and it's easy enough to read
        if (VisConfigData.bounds.empty) {
            VisConfigData.bounds.x.min = pos.x;
            VisConfigData.bounds.x.max = pos.x;
            VisConfigData.bounds.y.min = pos.y;
            VisConfigData.bounds.y.max = pos.y;
            VisConfigData.bounds.z.min = pos.z;
            VisConfigData.bounds.z.max = pos.z;
            VisConfigData.bounds.empty = false;
        } else {
            if (VisConfigData.bounds.x.min > pos.x) {
                VisConfigData.bounds.x.min = pos.x;
            }
            if (VisConfigData.bounds.x.max < pos.x) {
                VisConfigData.bounds.x.max = pos.x;
            }
            if (VisConfigData.bounds.y.min > pos.y) {
                VisConfigData.bounds.y.min = pos.y;
            }
            if (VisConfigData.bounds.y.max < pos.y) {
                VisConfigData.bounds.y.max = pos.y;
            }
            if (VisConfigData.bounds.z.min > pos.z) {
                VisConfigData.bounds.z.min = pos.z;
            }
            if (VisConfigData.bounds.z.max < pos.z) {
                VisConfigData.bounds.z.max = pos.z;
            }
        }
    },
    clearBounds: () => {
        VisConfigData.bounds.empty = true;
    }
}

export let pathfinderData = {
    config_i: '{"exists": false}',
    config_f: '{"exists": false}',
    scen_out: 'INVALID SCENE',
    settings: {
        name: "WebPathfinder-Out",
        description: "Output produced by a valid Pathfinder run.",
        search: "A*",
        heuristic: "MRSH-1",
        movePaths: [ "Moves/PivotCube" ]
    },
    is_running: false
};

export function getModuleAtPosition(x, y, z) {
    return gModulePositions.get(JSON.stringify({x: Math.round(x), y: Math.round(y), z: Math.round(z)}));
}

export function deleteModuleAtPosition(x, y, z) {
    gModulePositions.get(JSON.stringify({x: Math.round(x), y: Math.round(y), z: Math.round(z)})).destroy();
}

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

// Function to create Pathfinder compatible configuration
export function createPathfinderConfiguration(name = "Default Configuration", description = "Created with MRWT") {
    // Get all modules from the global module positions map
    const modules = [];
    const positions = [];
    
    // Track min/max coordinates to determine axis size
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    gModulePositions.forEach((module, posKey) => {
        const pos = JSON.parse(posKey);
        positions.push([pos.x, pos.y, pos.z]);
        
        // Update min/max coordinates
        minX = Math.min(minX, pos.x);
        maxX = Math.max(maxX, pos.x);
        minY = Math.min(minY, pos.y);
        maxY = Math.max(maxY, pos.y);
        minZ = Math.min(minZ, pos.z);
        maxZ = Math.max(maxZ, pos.z);
        
        // Convert module to pathfinder format
        modules.push({
            // Apparently the number of coordinates here matters, probably could be considered a bug on pathfinder's end
            position: VisConfigData.bounds.z.max === VisConfigData.bounds.z.min ? [pos.x, pos.y] : [pos.x, pos.y, pos.z],
            static: module.isStatic,
            properties: {
                colorProperty: {
                    color: parseRgbString(module.color)
                }
            }
        });
    });
    
    // Calculate axis size (max dimension + padding)
    const axisSize = Math.max(
        maxX - minX,
        maxY - minY, 
        maxZ - minZ
    ) + 2; // Add padding of 1 on each side
    
    // Create configuration object
    const config = {
        exists: true,
        name: name,
        description: description,
        order: maxZ === minZ ? 2 : 3, // 2D if flat across Z-plane, 3D otherwise
        axisSize: axisSize,
        tensorPadding: 5,
        modules: modules,
        boundaries: [] // Could be populated with actual boundaries if available
    };
    
    return config;
}

// Function to parse RGB string and return color components as array
export function parseRgbString(rgbString) {
    if (typeof rgbString === 'number') {
        return rgbString;
    } else if (typeof rgbString === 'string' && rgbString.startsWith('rgb(')) {
        // Extract the numbers from the string
        const matches = rgbString.match(/\d+/g);
        if (matches && matches.length === 3) {
            const r = parseInt(matches[0]);
            const g = parseInt(matches[1]);
            const b = parseInt(matches[2]);
            return [r, g, b];
        }
    }
    
    // Default fallback color (white)
    console.warn("Could not parse color:", rgbString);
    return [1.0, 1.0, 1.0];
}

// Function to save current configuration as initial or final
export function saveConfiguration(isInitial = true, name = "", description = "") {
    const config = createPathfinderConfiguration(
        name || (isInitial ? "Initial Configuration" : "Final Configuration"),
        description || (isInitial ? "Starting state" : "Target state")
    );
    
    const configJSON = JSON.stringify(config);
    
    if (isInitial) {
        pathfinderData.config_i = configJSON;
    } else {
        pathfinderData.config_f = configJSON;
    }
    
    return configJSON;
}

// Function to download configuration as JSON file
export function downloadConfiguration(isInitial = true) {
    const configJSON = isInitial ? pathfinderData.config_i : pathfinderData.config_f;
    const configName = isInitial ? "initial_config.json" : "final_config.json";
    
    // Create blob and download link
    const blob = new Blob([configJSON], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = configName;
    link.click();
    
    // Clean up
    URL.revokeObjectURL(url);
}
