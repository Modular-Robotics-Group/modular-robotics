import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { Scenario } from './Scenario.js';
import { gScene, gLights, gRenderer, gModules, gModulePositions } from './main.js';
import { moduleBrush, pathfinderData, VisConfigData, ModuleType, getModuleAtPosition } from './utils.js';
import { CameraType } from "./utils.js";
import { saveConfiguration, downloadConfiguration } from './utils.js';
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

const DRAW_MODES = Object.freeze({
    ERASE:  -1,
    PLACE:   0
})

/**
 * Predefined camera control configurations for different application modes
 */
const CAMERA_MODES = Object.freeze({
    PAINTER: { pan: true, rotate: false, zoom: true },
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

// Auto-Center
window._autoCenterConfig = function() {
    let shift = {
        x: VisConfigData.bounds.x.min,
        y: VisConfigData.bounds.y.min,
        z: VisConfigData.bounds.z.min
    };
    gModulePositions.clear();
    for (let module in gModules) {
        gModules[module].pos.x -= shift.x;
        gModules[module].pos.y -= shift.y;
        gModules[module].pos.z -= shift.z;
        gModules[module].parentMesh.position.sub(shift);
        gModulePositions.set(JSON.stringify({
            x: Math.round(gModules[module].pos.x),
            y: Math.round(gModules[module].pos.y),
            z: Math.round(gModules[module].pos.z)}),
            gModules[module]);
    }
    let max = {
        x: VisConfigData.bounds.x.max + shift.x,
        y: VisConfigData.bounds.y.max + shift.y,
        z: VisConfigData.bounds.z.max + shift.z
    };
    VisConfigData.clearBounds()
    VisConfigData.updateBounds({x: 0, y: 0, z: 0});
    VisConfigData.updateBounds(max);
}

// Clear
window._clearConfig = function() {
    for (let module in gModules) {
        gModules[module].destroy();
    }

    // Reset Data
    VisConfigData.nextModID = 0;
    VisConfigData.clearBounds();
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
export const zSliceController = gLayerGui.add(moduleBrush, 'zSlice', VisConfigData.bounds.z.min - 2, VisConfigData.bounds.z.max + 2, 1).name("Layer").onChange((value) => {
    if (window._isPainterModeActive) {
        updateVisibleModules(value);
    }
});

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
    gLayerGui.add(moduleBrush, 'adjSlicesVisible').name("Visualize Adjacent Layers").onChange((value) => {
        if (window._isPainterModeActive) {
            updateVisibleModules(moduleBrush.zSlice);
        }
    });
    gLayerGui.add(window, '_autoCenterConfig').name("Auto-Center Configuration")
    gLayerGui.add(window, '_clearConfig').name("Clear Configuration")
    // Pathfinder and debug Controls
    pathfinder_controller = gPathfinderGui.add(window, '_pathfinderRun').name("Run Pathfinder").disable();
    gDevGui.add(window, '_toggleMRWTMode').name("MRWT Mode Toggle");
    // Add event listener for module placement
    document.addEventListener('mousedown', (event) => {
        if (event.button === 0 && !(event.shiftKey || event.ctrlKey)) {
            window._mouseHeld = true;
            setDrawMode(event);
            handleModulePlacement(event);
        }
    });
    document.addEventListener('mouseup', (event) => {
        if (event.button === 0) {
            window._mouseHeld = false;
        }
    });
    document.addEventListener('mousemove', handleModulePlacement);

    // Create configuration button controls using object literals
    gPathfinderGui.add({ 
        saveInitial: function() {
            window._autoCenterConfig();
            saveConfiguration(true);
            console.log("Initial configuration saved");
            pathfinder_controller.enable();
        }
    }, 'saveInitial').name("Save Initial Config");
    
    gPathfinderGui.add({ 
        saveFinal: function() {
            window._autoCenterConfig();
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
    let distance = Math.abs(moduleZ - zSlice);
    
    const maxDistance = moduleBrush.adjSlicesVisible ? LAYER_SETTINGS.ADJACENT_DISTANCE : 0;
    isVisible = distance <= maxDistance;
    
    // Set opacity based on visibility and whether it's the current slice
    opacity = isVisible ? 
        (isCurrentSlice ? OPACITY_SETTINGS.FULLY_OPAQUE : OPACITY_SETTINGS.ADJACENT_SLICE) : 
        OPACITY_SETTINGS.TRANSPARENT;
    
    // Apply visibility and opacity settings
    module.visible = isVisible;
    module.mesh.material.uniforms.opacity = { value: opacity };
    module.mesh.material.uniforms.line_divisor = { value: 2 * distance + 1 };
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
        moduleMesh.mesh.material.uniforms.opacity = { value: 1.0 };
        moduleMesh.mesh.material.uniforms.line_divisor = { value: 1 };
    });
}

function getClickPosition(event) {
    // Get the canvas element and its dimensions
    const canvas = gRenderer.domElement;
    const rect = canvas.getBoundingClientRect();

    // Get camera's current view parameters
    const camera = gwUser.camera;

    // Calculate the click position by casting ray onto plane parallel to camera
    // TODO: probably can tidy this bit up, most of it is pulled from an old stackoverflow answer
    let raycaster = new THREE.Raycaster();
    let mouse = new THREE.Vector2();
    let plane = new THREE.Plane();
    let planeNormal = new THREE.Vector3();
    let point = new THREE.Vector3();

    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
    planeNormal.copy(camera.position).normalize();
    plane.setFromNormalAndCoplanarPoint(planeNormal, gScene.position);
    raycaster.setFromCamera(mouse, camera);
    raycaster.ray.intersectPlane(plane, point);

    return {
        x: Math.round(point.x),
        y: Math.round(point.y),
        z: moduleBrush.zSlice
    };
}

function setDrawMode(event) {
    if (!window._isPainterModeActive) return;

    // Set draw mode based on module presence
    let clickPos = getClickPosition(event);

    const existingModule = getModuleAtPosition(clickPos.x, clickPos.y, clickPos.z);
    if (!existingModule) {
        window._drawMode = DRAW_MODES.PLACE;
    } else {
        window._drawMode = DRAW_MODES.ERASE;
    }
}

/**
 * Handles mouse clicks for module placement
 * @param {MouseEvent} event - The mouse event
 */
function handleModulePlacement(event) {
    // Only process left clicks when in MRWT mode
    if (!window._mouseHeld || !window._isPainterModeActive) return;
    
    // Check if the click is on a UI element
    const path = event.path || (event.composedPath && event.composedPath());
    for (const element of path || []) {
        if (element.classList && 
            (element.classList.contains('lil-gui') || 
             element.classList.contains('dg'))) {
            return; // Click was on GUI, don't place a module
        }
    }

    let clickPos = getClickPosition(event)
    
    toggleModuleAtPosition(clickPos.x, clickPos.y, clickPos.z);
}

/**
 * Toggles a module at the specified grid position - places one if none exists, or removes it if one does
 * @param {number} x - X grid position
 * @param {number} y - Y grid position
 * @param {number} z - Z grid position
 */
function toggleModuleAtPosition(x, y, z) {
    const existingModule = getModuleAtPosition(x, y, z);

    if (!existingModule && window._drawMode === DRAW_MODES.PLACE) {
        // Create a new module at the position
        const pos = new THREE.Vector3(x, y, z);

        // Convert moduleBrush.color (which is an object with r,g,b properties) to a THREE.Color
        const color = new THREE.Color(
            moduleBrush.color.r,
            moduleBrush.color.g,
            moduleBrush.color.b
        );

        const module = new ModuleClass(ModuleType.CUBE, VisConfigData.nextModID, pos, color.getHex(), MODULE_SETTINGS.SCALE);

        if (moduleBrush.static) {
            module.markStatic();
        }
        updateModuleVisibility(module, z, moduleBrush.zSlice);
    } else if (existingModule && window._drawMode === DRAW_MODES.ERASE) {
        gModules[existingModule.id].destroy();
    }
}
