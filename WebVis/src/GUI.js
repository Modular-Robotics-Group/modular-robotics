import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { Scenario } from './Scenario.js';
import { gScene, gLights, gRenderer } from './main.js';
import { moduleBrush, pathfinderData, ModuleType, getModuleAtPosition } from './utils.js';
import { CameraType } from "./utils.js";
import { 
    saveConfiguration,
    downloadConfiguration
} from './utils.js';
import { gModules } from './main.js';
import { Module as ModuleClass } from './Module.js';

// Exact filenames of example scenarios in /Scenarios/
let EXAMPLE_SCENARIOS = [
    '2x2x2 Metamodule',
    '3x3 Metamodule',
    'Cube Debugging',
    'RD Debugging',
    'Slide Debugging',
	'3x3 Metamodule Sub-case 1',
	'3x3 Metamodule Sub-case 2',
	'3x3 Metamodule Sub-case 3',
    'Parallel Move Debugging',
    'Parallel Monkey Move',
    'Catom Debugging'
]

// Opacity settings for changing layers / visualizing adjacent layers
const OPACITY_SETTINGS = Object.freeze({
    FULLY_OPAQUE:       1.0,
    ADJACENT_SLICE:     0.4,
    TRANSPARENT:        0.0
});

const LAYER_SETTINGS = Object.freeze({
    ADJACENT_DISTANCE: 1  // Number of layers to show above/below current slice
});

const MODULE_SETTINGS = Object.freeze({
    SCALE:            0.9
})

/**
 * Predefined camera control configurations for different application modes
 */
const CAMERA_MODES = Object.freeze({
    PAINTER: { pan: true, rotate: false, zoom: false },
    NORMAL:  { pan: true, rotate: true, zoom: true }
});

/* ****************************** */
/* Helpers */
/* ****************************** */
const SliderType = Object.freeze({
    LINEAR: 0,
    QUADRATIC: 1
});

class GuiGlobalsHelper {
    constructor(prop, defaultVal, sliderType = SliderType.LINEAR) {
        this.prop = prop;
        this.value = defaultVal;
        this.sliderType = sliderType;
    }

    get value() {
        return window[this.prop + "_Unaltered"];
    }

    set value(v) {
        let newVal = v;
        switch(this.sliderType) {
            case SliderType.LINEAR: break;
            case SliderType.QUADRATIC: newVal = v * v; break;
        }
        window[this.prop] = newVal;
        window[this.prop + "_Unaltered"] = v;
    }
}

/* ****************************** */
/* Global function definitions */
/* ****************************** */
window._toggleBackgroundColor = function() {
    gScene._backgroundColorSelected = (gScene._backgroundColorSelected + 1) % gScene._backgroundColors.length
    gScene.background = gScene._backgroundColors[gScene._backgroundColorSelected];
}
window._toggleFullbright = function() {
    gLights._fullbright = !gLights._fullbright;
    gLights.lightAmbient.intensity = gLights._fullbright ? 3.0 : gLights._defaultAmbientIntensity;
    gLights.lightDirectional.intensity = gLights._fullbright ? 0 : gLights._defaultDirectionalIntensity;
    gLights.headlamp.intensity = gLights._fullbright ? 0 : gLights._defaultHeadlampIntensity;
}

// Painter Mode Toggle
window._toggleMRWTMode = function() {
    window._isPainterModeActive = !window._isPainterModeActive;
    
    // Toggle GUI elements visibility
    gAnimGui.show(gAnimGui._hidden);
    gScenGui.show(gScenGui._hidden);
    gModuleBrushGui.show(gModuleBrushGui._hidden);
    gLayerGui.show(gLayerGui._hidden);
    
    if (window._isPainterModeActive) {
        gwUser.cameraStyle = CameraType.ORTHOGRAPHIC;
        gwUser.resetCamera();
        // Update module visibility based on current z-slice
        updateVisibleModules(moduleBrush.zSlice);
        
        // Configure controls for painter mode (panning only)
        setCameraControls(CAMERA_MODES.PAINTER);
    } else {
        // Show all modules when exiting painter mode
        showAllModules();

        // Restore full camera controls for normal mode
        setCameraControls(CAMERA_MODES.NORMAL);
    }
}

/**
 * Helper function to set camera controls with a single configuration object
 * @param {Object} options - Camera control options
 * @param {boolean} options.pan - Enable/disable panning
 * @param {boolean} options.rotate - Enable/disable rotation
 * @param {boolean} options.zoom - Enable/disable zooming
 */
function setCameraControls({ pan = true, rotate = true, zoom = true }) {
    gwUser.controls.enablePan = pan;        // Panning (right/middle-click + drag)
    gwUser.controls.enableRotate = rotate;  // Rotation (left-click + drag)
    gwUser.controls.enableZoom = zoom;      // Zooming (scroll wheel)
}

let _exampleLoaders = {};
async function _loadExampleScenario(name) {
    const scen = await fetch(`./Scenarios/${name}.scen`).then(response => response.text());
    new Scenario(scen);
}
function _generateExampleLoader(name) {
    return () => _loadExampleScenario(name);
}

/* ****************************** */
/* Pathfinder stuff */
/* ****************************** */
// TODO: I'm not sure this is the right place to put this functionality, feel free
// to move it somewhere else if you can find a spot that makes more sense.
const pathfinder = Module.cwrap("pathfinder", "string", ["string", "string"]);
let pathfinder_controller;
window._pathfinderConfigDEBUG = async function() {
    let example_configs = "";
    await fetch(`./pathfinder/example_config.json`).then(response => response.text()).then(text => { example_configs = text });
    let j = JSON.parse(example_configs);
    pathfinderData.config_i = JSON.stringify(j.initial);
    pathfinderData.config_f = JSON.stringify(j.final);
    pathfinder_controller.enable();
}

window._pathfinderRun = function() {
    pathfinderData.scen_out = pathfinder(pathfinderData.config_i, pathfinderData.config_f);
    //console.log(pathfinderData.scen_out); // Uncomment this if you want to see the produced scen contents
    new Scenario(pathfinderData.scen_out);
}

/* ****************************** */
/* GUI setup */
/* ****************************** */
// GUI elements for general settings
export const gGraphicsGui = new GUI( { title: "Graphics", width: 160, container: document.getElementById("controlBar") } ).close();

// GUI elements for Visualizer Mode
export const gAnimGui = new GUI( { title: "Animation", container: document.getElementById("controlBar") } );
export const gScenGui = new GUI( { title: "Scenario", container: document.getElementById("controlBar") } ).close();

// GUI elements for Configurizer Mode
export const gModuleBrushGui = new GUI( { title: "Brush", container: document.getElementById("controlBar") } ).hide();
export const gLayerGui = new GUI( { title: "Layer", container: document.getElementById("controlBar") } ).hide();

// GUI element for Pathfinder and developer options
export const gPathfinderGui = new GUI( { title: "Pathfinder", container: document.getElementById("controlBar") } ).close();
export const gDevGui = new GUI( { title: "Dev Menu", width: 160, container: document.getElementById("controlBar") } ).close().hide();

document.addEventListener("DOMContentLoaded", async function () {
    // Visualizer Controls
    gAnimGui.add(new GuiGlobalsHelper('gwAnimSpeed', 1.0, SliderType.QUADRATIC), 'value', 0.0, 5.0, 0.1).name("Anim Speed");
    gAnimGui.add(new GuiGlobalsHelper('gwAutoAnimate', false), 'value').name("Auto Animate");
    gGraphicsGui.add(window.gwUser, 'toggleCameraStyle').name("Toggle Camera Style");
    gGraphicsGui.add(window, '_toggleBackgroundColor').name("Toggle Background Color");
    gGraphicsGui.add(window, '_toggleFullbright').name("Toggle Fullbright");
    gAnimGui.add(window, '_requestForwardAnim').name("Step Forward");
    gAnimGui.add(window, '_requestBackwardAnim').name("Step Backward");
    // Configurizer Controls
    gModuleBrushGui.addColor(moduleBrush, 'color').name("Module Color");
    gModuleBrushGui.add(moduleBrush, 'static').name("Static Module");
    // TODO: set max value for zSlice to highest module z-value in scene
    // TODO: might need to adjust step size for zSlice depending on module type
    const zSliceController = gLayerGui.add(moduleBrush, 'zSlice', 0, 10, 1).name("Layer");
    zSliceController.onChange((value) => {
        if (window._isPainterModeActive) {
            updateVisibleModules(value);
        }
    });
    gLayerGui.add(moduleBrush, 'adjSlicesVisible').name("Visualize Adjacent Layers");
    // Pathfinder and debug Controls
    gPathfinderGui.add(window, '_pathfinderConfigDEBUG').name("Set configurations for Pathfinder");
    pathfinder_controller = gPathfinderGui.add(window, '_pathfinderRun').name("Run Pathfinder").disable();
    gDevGui.add(window, '_toggleMRWTMode').name("MRWT Mode Toggle");
    // Add event listener for module placement
    document.addEventListener('mousedown', handleModulePlacement);

    // Create configuration button controls using object literals
    gPathfinderGui.add({ 
        saveInitial: function() {
            saveConfiguration(true);
            console.log("Initial configuration saved");
            pathfinder_controller.enable();
        }
    }, 'saveInitial').name("Save Initial Config");
    
    gPathfinderGui.add({ 
        saveFinal: function() {
            saveConfiguration(false);
            console.log("Final configuration saved");
            pathfinder_controller.enable();
        }
    }, 'saveFinal').name("Save Final Config");
    
    gPathfinderGui.add({ 
        downloadInitial: function() {
            downloadConfiguration(true);
        }
    }, 'downloadInitial').name("Download Initial");
    
    gPathfinderGui.add({ 
        downloadFinal: function() {
            downloadConfiguration(false);
        }
    }, 'downloadFinal').name("Download Final");

    const _folder = gScenGui.addFolder("Example Scenarios");
    for (let i in EXAMPLE_SCENARIOS) {
        let ex = EXAMPLE_SCENARIOS[i];
        _exampleLoaders[ex] = _generateExampleLoader(ex);
        _folder.add(_exampleLoaders, ex).name(ex);
    }

    // Following code only works with certain server backends (that allow fetching directories).
    //  Purpose was to automatically identify all elements in the /Scenarios/ subfolder.
    //
    // await fetch("./Scenarios/").then(async response => {
    //     let scen, item, name, filepath;
    //     let raw = await response.text();
    //     let el = document.createElement('html');
    //     el.innerHTML = raw;
    //     let list = el.getElementsByClassName("file scen");
    //     for (item in list) {
    //         name = list[item].title;
    //         if (!name) { continue; }
    //         name = name.split('.')[0];
    //         _exampleLoaders[name] = _generateExampleLoader(name);
    //         _folder.add(_exampleLoaders, name).name(name);
    //     }
    // });
});

/**
 * Updates module visibility to only show modules at the specified z-slice
 * @param {number} zSlice - The z-slice value to show
 */
function updateVisibleModules(zSlice) {
    const moduleIds = Object.keys(gModules);

    // Update visibility for each module
    moduleIds.forEach((id) => {
        const module = gModules[id];
        const moduleZ = Math.round(module.pos.z);
        
        updateModuleVisibility(module, moduleZ, zSlice);
    });
}

/**
 * Updates the visibility and opacity of a single module based on its position relative to the current z-slice
 * @param {object} module - The module object to update
 * @param {number} moduleZ - The z position of the module
 * @param {number} zSlice - The current z-slice being visualized
 */
function updateModuleVisibility(module, moduleZ, zSlice) {
    const isCurrentSlice = moduleZ === zSlice;
    let isVisible = false;
    let opacity = OPACITY_SETTINGS.TRANSPARENT;
    
    const maxDistance = moduleBrush.adjSlicesVisible ? LAYER_SETTINGS.ADJACENT_DISTANCE : 0;
    isVisible = (Math.abs(moduleZ - zSlice) <= maxDistance);
    
    // Set opacity based on visibility and whether it's the current slice
    opacity = isVisible ? 
        (isCurrentSlice ? OPACITY_SETTINGS.FULLY_OPAQUE : OPACITY_SETTINGS.ADJACENT_SLICE) : 
        OPACITY_SETTINGS.TRANSPARENT;
    
    // Apply visibility and opacity settings
    module.visible = isVisible;
    module.mesh.material.opacity = opacity;
}

/**
 * Makes all modules visible again (used when exiting MRWT mode)
 */
function showAllModules() {
    const moduleIds = Object.keys(gModules);

    moduleIds.forEach((id) => {
        const module = gModules[id];
        const moduleMesh = module;

        moduleMesh.visible = true;
        moduleMesh.mesh.material.opacity = OPACITY_SETTINGS.FULLY_OPAQUE;
    });
}

/**
 * Handles mouse clicks for module placement
 * @param {MouseEvent} event - The mouse event
 */
function handleModulePlacement(event) {
    // Only process left clicks when in MRWT mode
    if (!window._isPainterModeActive || event.button !== 0) return;
    
    // Check if the click is on a UI element
    const path = event.path || (event.composedPath && event.composedPath());
    for (const element of path || []) {
        if (element.classList && 
            (element.classList.contains('lil-gui') || 
             element.classList.contains('dg'))) {
            return; // Click was on GUI, don't place a module
        }
    }

    // Get the canvas element and its dimensions
    const canvas = gRenderer.domElement;
    const rect = canvas.getBoundingClientRect();
    
    // Get camera's current view parameters
    const camera = gwUser.camera;
    
    // Calculate the click position relative to the canvas
    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;
    
    // Convert to normalized device coordinates (-1 to 1)
    const ndcX = (canvasX / rect.width) * 2 - 1;
    const ndcY = -(canvasY / rect.height) * 2 + 1;
    
    // For orthographic camera, we can directly map from NDC to world coordinates
    // based on the camera's current view size
    const worldX = ndcX * camera.right * camera.zoom;
    const worldY = ndcY * camera.top * camera.zoom;
    
    // Add the camera position to get the final world position
    const finalX = worldX + camera.position.x;
    const finalY = worldY + camera.position.y;
    
    // Round to the nearest grid position
    const gridX = Math.round(finalX);
    const gridY = Math.round(finalY);
    const gridZ = moduleBrush.zSlice;
    
    console.log("Click position:", {
        canvas: { x: canvasX, y: canvasY },
        ndc: { x: ndcX, y: ndcY },
        world: { x: worldX, y: worldY },
        final: { x: finalX, y: finalY },
        grid: { x: gridX, y: gridY, z: gridZ }
    });
    
    toggleModuleAtPosition(gridX, gridY, gridZ);
}

/**
 * Toggles a module at the specified grid position - places one if none exists, or removes it if one does
 * @param {number} x - X grid position
 * @param {number} y - Y grid position
 * @param {number} z - Z grid position
 */
function toggleModuleAtPosition(x, y, z) {
    const existingModule = getModuleAtPosition(x, y, z);

    if (!existingModule) {
        // Create a module ID
        const moduleId = `module_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        
        // Create a new module at the position
        const pos = new THREE.Vector3(x, y, z);

        // Convert moduleBrush.color (which is an object with r,g,b properties) to a THREE.Color
        const color = new THREE.Color(
            moduleBrush.color.r,
            moduleBrush.color.g,
            moduleBrush.color.b
        );

        const module = new ModuleClass(ModuleType.CUBE, moduleId, pos, color.getHex(), MODULE_SETTINGS.SCALE);
        
        // TODO: Handle static property
        // if (moduleBrush.static && typeof module.setStatic === 'function') {
        //     module.setStatic(true);
        // }
        updateModuleVisibility(module, z, moduleBrush.zSlice);
    } else {
        gModules[existingModule.id].destroy();
    }
}
