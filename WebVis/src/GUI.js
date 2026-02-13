import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { Scenario } from './Scenario.js';
import { gScene, gLights, gRenderer, gModules, gReferenceModule, gModulePositions, gCanvas, gHighlightModule, cancelActiveMove } from './main.js';
import { moduleBrush, pathfinderData, WorkerType, MessageType, ContentType, VisConfigData, ModuleType, getModuleAtPosition } from './utils.js';
import { CameraType } from "./utils.js";
import { saveConfiguration, downloadConfiguration, downloadScenario, downloadCurrentConfiguration, parseConfigurationJSON } from './utils.js';
import { Module } from './Module.js';

// Exact filenames of example scenarios in /Scenarios/
let EXAMPLE_SCENARIOS = [
    '3x3 Metamodule',
    'Cube Example',
    'RD Example',
    'Slide Example',
    'Catom Example',
	// '3x3 Metamodule Sub-case 1',
	// '3x3 Metamodule Sub-case 2',
	// '3x3 Metamodule Sub-case 3',
    'Parallel Move Example',
    // 'Parallel Monkey Move',
    // '2x2x2 Metamodule'
    "socg2025",
    // "socg2025-2piv+slide",
    'Catom Example 2'
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

const TOOL_MODES = Object.freeze({
    EDIT:       0,
    PICK_COLOR: 1
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

/**
 * Load a configuration from JSON and display it in the scene
 * @param {string} configJSON - The JSON string of the configuration
 * @returns {boolean} - True if successful, false otherwise
 */
function loadConfigurationFromJSON(configJSON) {
    const configData = parseConfigurationJSON(configJSON);

    if (!configData) {
        console.error("Failed to parse configuration JSON");
        return false;
    }

    // Clear existing modules
    for (let module in gModules) {
        gModules[module].destroy();
    }
    cancelActiveMove();

    // Reset Data
    VisConfigData.nextModID = 0;
    VisConfigData.clearBounds();

    // Invalidate move sequence
    window.gwMoveSetSequence.invalidate();

    // Create modules from configuration
    configData.modules.forEach((moduleData, index) => {
        const pos = moduleData.position;
        // Handle 2D positions (add z=0) or 3D positions
        const position = new THREE.Vector3(
            pos[0],
            pos[1],
            pos.length === 3 ? pos[2] : 0
        );

        // Parse color - can be array [r,g,b] or hex number
        let colorHex;
        const colorData = moduleData.properties?.colorProperty?.color;
        if (Array.isArray(colorData)) {
            // Convert RGB array to hex
            const r = colorData[0];
            const g = colorData[1];
            const b = colorData[2];
            colorHex = (r << 16) | (g << 8) | b;
        } else if (typeof colorData === 'number') {
            colorHex = colorData;
        } else {
            colorHex = 0xFFFFFF; // Default white
        }

        // Create the module
        const module = new Module(configData.moduleType, index, position, colorHex, 0.9);

        // Set static property if specified
        if (moduleData.static) {
            module.markStatic();
        }
    });

    // Position camera
    const centroid = VisConfigData.getCentroid();
    const radius = VisConfigData.getRadius();

    gwUser.camera.position.x = centroid.x;
    gwUser.camera.position.y = centroid.y;
    gwUser.camera.position.z = centroid.z + radius + 3.0;
    gwUser.controls.target.set(centroid.x, centroid.y, centroid.z);

    gwUser.miniCamera.position.x = centroid.x;
    gwUser.miniCamera.position.y = centroid.y;
    gwUser.miniCamera.position.z = centroid.z + radius + 3.0;
    gwUser.miniControls.target.set(centroid.x, centroid.y, centroid.z);

    // Update reference module to match the loaded configuration type
    gReferenceModule.swapType(configData.moduleType);
    gHighlightModule.swapType(configData.moduleType);

    console.log(`Loaded configuration "${configData.name}" with ${configData.modules.length} modules`);
    return true;
}

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
    gRenderer.setClearColor(gScene._backgroundColors[gScene._backgroundColorSelected]);
}
window._toggleFullbright = function() {
    gLights._fullbright = !gLights._fullbright;
    gLights.lightAmbient.intensity = gLights._fullbright ? 3.0 : gLights._defaultAmbientIntensity;
    gLights.lightDirectional.intensity = gLights._fullbright ? 0 : gLights._defaultDirectionalIntensity;
    gLights.headlamp.intensity = gLights._fullbright ? 0 : gLights._defaultHeadlampIntensity;
    gLights.miniHeadlamp.intensity = gLights._fullbright ? 0 : gLights._defaultMiniHeadlampIntensity;
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
        // Hide perspective controller and swap to ortho view
        style_controller.hide();
        gwUser.cameraStyle = CameraType.ORTHOGRAPHIC;
        gwUser.resetCamera();
        // Update module visibility based on current z-slice
        updateVisibleModules(moduleBrush.zSlice);
        // Reset move sequence to initial state
        window.gwMoveSetSequence.reset();
        // Configure controls for painter mode (panning only)
        setCameraControls(CAMERA_MODES.PAINTER);
        // Set tool to edit
        window._toolMode = TOOL_MODES.EDIT;
    } else {
        style_controller.show();
        // Show all modules when exiting painter mode
        showAllModules();
        // Restore full camera controls for normal mode
        setCameraControls(CAMERA_MODES.NORMAL);
    }
}

// Clear
window._clearConfig = function() {
    for (let module in gModules) {
        gModules[module].destroy();
    }

    // Reset Data
    VisConfigData.nextModID = 0;
    VisConfigData.clearBounds();

    // Invalidate move sequence and reset progress bar
    pathfinderProgressBar.style.width = "0%";
    window.gwMoveSetSequence.invalidate();
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
let pathfinderWorker;
let config2ScenWorker;
let pathfinder_controller, moveset_selector, heuristic_setter;

const pathfinderProgressBar = document.getElementById("pathfinderProgressBar");
const pathfinderReverseProgressBar = document.getElementById("pathfinderReverseProgressBar");
const pathfinderStats = {
    div: document.getElementById("statsDiv"),
    found: document.getElementById("found"),
    expanded: document.getElementById("expanded"),
    unexpanded: document.getElementById("unexpanded")
};

window._pathfinderRun = function() {
    if (window.Worker) {
        pathfinderData.is_running = true;
        pathfinder_controller.disable();
        pathfinderProgressBar.style.width = "0%";
        pathfinderReverseProgressBar.style.width = "0%";
        if (pathfinderData.settings.search === 'BDBFS') {
            pathfinderProgressBar.style.backgroundColor = "rgba(0, 255, 255, 0.5)";
        }
        if (pathfinderWorker != null) {
            pathfinderWorker.terminate();
        }
        pathfinderWorker = new Worker("src/PathfinderWorker.js");
        pathfinderWorker.onmessage = (msg) => {
            switch(msg.data[0]) {
                case MessageType.ERROR:
                    pathfinderData.is_running = false;
                    pathfinder_controller.enable();
                    pathfinderProgressBar.style.backgroundColor = "rgba(255, 255, 255, 0.5)";
                    pathfinderProgressBar.style.width = "0%";
                    pathfinderReverseProgressBar.style.width = "0%";
                    console.log("pathfinder task encountered an error.");
                    pathfinderWorker.terminate();
                    break;
                case MessageType.RESULT:
                    pathfinderData.is_running = false;
                    pathfinder_controller.enable();
                    pathfinderData.scen_out = msg.data[1];
                    pathfinderWorker.terminate();

                    // Check if the result is valid before trying to load it
                    if (!pathfinderData.scen_out || pathfinderData.scen_out.length === 0 || pathfinderData.scen_out.trim() === '') {
                        console.error("Pathfinder returned empty result - no path found");
                        alert("Pathfinder could not find a path between the initial and final configurations.\n\nPossible reasons:\n1. Configurations are not connected (modules too far apart)\n2. Wrong move set selected for the module type\n3. Configurations have different number of modules\n4. Path requires too many moves (timeout)\n\nCheck the console for more details.");
                        pathfinderProgressBar.style.backgroundColor = "rgba(255, 0, 0, 0.5)";
                        pathfinderProgressBar.style.width = "100%";
                    } else {
                        // Valid result, load the scenario
                        new Scenario(pathfinderData.scen_out);
                        pathfinderProgressBar.style.backgroundColor = "rgba(0, 255, 0, 0.5)";
                        pathfinderProgressBar.style.width = "100%";
                    }
                    pathfinderReverseProgressBar.style.width = "0%";
                    break;
                case MessageType.DATA:
                    let data = JSON.parse(msg.data[1]);
                    switch (data.content) {
                        case ContentType.PATHFINDER_PROGRESS:
                            pathfinderProgressBar.style.width = 100 * data.estimatedProgress + "%";
                            break;
                        case ContentType.PATHFINDER_BD_PROGRESS:
                            pathfinderProgressBar.style.width = 100 * data.estimatedProgress_s + "%";
                            pathfinderReverseProgressBar.style.width = 100 * data.estimatedProgress_t + "%";
                            break;
                        case ContentType.PATHFINDER_UPDATE:
                            pathfinderStats.div.style.display = "block";
                            pathfinderStats.found.innerText = data.found;
                            pathfinderStats.expanded.innerText = data.expanded;
                            pathfinderStats.unexpanded.innerText = data.unexpanded;
                    }
            }
        }
        pathfinderWorker.postMessage([
            WorkerType.PATHFINDER, pathfinderData.config_i,
            pathfinderData.config_f, JSON.stringify(pathfinderData.settings)
        ]);
        console.log("Started pathfinder task");
    } else {
        console.log("Browser does not support web workers.");
    }
}

/* ****************************** */
/* GUI setup */
/* ****************************** */
// GUI elements for general settings
export const gGraphicsGui = new GUI( { title: "Graphics",width: window.innerWidth*.08, container: document.getElementById("controlBar") } ).close();
let style_controller;
// GUI elements for Visualizer Mode
export const gAnimGui = new GUI( { title: "Animation",width: window.innerWidth*.08, container: document.getElementById("controlBar") } );
export const gScenGui = new GUI( { title: "Scenario",width: window.innerWidth*.08, container: document.getElementById("controlBar") } ).close();

// GUI elements for Configurizer Mode
export const gModuleBrushGui = new GUI( { title: "Brush",width: window.innerWidth*.08, container: document.getElementById("controlBar") } ).hide();
let brushColor_selector;
export const gLayerGui = new GUI( { title: "Layer",width: window.innerWidth*.08, container: document.getElementById("controlBar") } ).hide();
export const gSelectedModuleGui = new GUI( { title: "Selected Module",width: window.innerWidth*.08, container: document.getElementById("controlBar") } ).hide();
export const zSliceController = gLayerGui.add(moduleBrush, 'zSlice', VisConfigData.bounds.z.min - 2, VisConfigData.bounds.z.max + 2, 1).name("Layer").onChange((value) => {
    if (window._isPainterModeActive) {
        updateVisibleModules(value);
    }
});

// GUI element for Pathfinder and developer options
export const gPathfinderGui = new GUI( { title: "Pathfinder",width: window.innerWidth*.12, container: document.getElementById("controlBar") } ).close();
export const gExportGui = new GUI( { title: "Import/Export",width: window.innerWidth*.08, container: document.getElementById("controlBar") } );
export const gModeGui = new GUI( { title: "View/Edit",width: window.innerWidth*.12, container: document.getElementById("controlBar") } );
// Global variables for module selection
let selectedModule = null;
const selectedModuleColor = { color: 0x808080 };

document.addEventListener("DOMContentLoaded", async function () {
    // Visualizer Controls
    gAnimGui.add(new GuiGlobalsHelper('gwAnimSpeed', 1.0, SliderType.QUADRATIC), 'value', 0.0, 5.0, 0.1).name("Anim Speed");
    gAnimGui.add(new GuiGlobalsHelper('gwAutoAnimate', false), 'value').name("Auto Animate");
    style_controller = gGraphicsGui.add(window.gwUser, 'toggleCameraStyle').name("Toggle Camera Style");
    gGraphicsGui.add(window, '_toggleBackgroundColor').name("Toggle Background Color");
    gGraphicsGui.add(window, '_toggleFullbright').name("Toggle Fullbright");
    gAnimGui.add(window, '_requestForwardAnim').name("Step Forward");
    gAnimGui.add(window, '_requestBackwardAnim').name("Step Backward");
    // Configurizer Controls
    brushColor_selector = gModuleBrushGui.addColor(moduleBrush, 'color').name("Module Color");
    gModuleBrushGui.add({ beginColorPick: () => { window._toolMode = TOOL_MODES.PICK_COLOR } }, 'beginColorPick');
    gModuleBrushGui.add(moduleBrush, 'static').name("Static Module");
    gLayerGui.add(moduleBrush, 'adjSlicesVisible').name("Visualize Adjacent Layers").onChange((value) => {
        if (window._isPainterModeActive) {
            updateVisibleModules(moduleBrush.zSlice);
        }
    });
    gModuleBrushGui.add(moduleBrush, 'type', {
            "Cube": ModuleType.CUBE,
            "Rhombic Dodecahedron": ModuleType.RHOMBIC_DODECAHEDRON,
            "Catom": ModuleType.CATOM
        }).name("Module Type").onChange((value) => {
            window._clearConfig();
            gReferenceModule.swapType(value);
            gHighlightModule.swapType(value);
            moveset_selector.setValue(value === ModuleType.CUBE
                ? "Moves/PivotCube"
                : value === ModuleType.CATOM
                    ? "Moves/Catom"
                    : "Moves/RhombicDodecahedron"
            );
    });
    gLayerGui.add(window, '_clearConfig').name("Clear Configuration");
    // Pathfinder and debug Controls
    pathfinder_controller = gPathfinderGui.add(window, '_pathfinderRun').name("Run Pathfinder").disable();
    gPathfinderGui.add(pathfinderData.settings, 'name').name("Name");
    gPathfinderGui.add(pathfinderData.settings, 'description').name("Description");
    moveset_selector = gPathfinderGui.add(pathfinderData.settings, 'movePaths', {
        "Pivoting Cube": [ "Moves/PivotCube" ],
        "Sliding Cube": [ "Moves/SlideCube" ],
        "NASA Cube": [ "Moves/SlideNASA" ],
        "Rhombic Dodecahedron": [ "Moves/RhombicDodecahedron" ],
        "Catom": [ "Moves/Catom" ]
    }).name("Move Set");
    heuristic_setter = gPathfinderGui.add(pathfinderData.settings, 'heuristic',
        ['MRSH-1', 'Symmetric Difference', 'Manhattan Distance', 'Chebyshev Distance']).name("Heuristic");
    gPathfinderGui.add(pathfinderData.settings, 'search', ['A*', 'BDBFS']).name("Search Type").onChange((value) => {
        if (value === "A*") {
            heuristic_setter.show();
        } else {
            heuristic_setter.hide();
        }
    });
    gModeGui.add(window, '_toggleMRWTMode').name("Toggle Painter/Viewer Mode");
    // Add event listener for module placement
    gCanvas.addEventListener('mousedown', (event) => {
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
        if (window._toolMode === TOOL_MODES.PICK_COLOR) {
            window._toolMode = TOOL_MODES.EDIT;
        }
    });
    gCanvas.addEventListener('mouseleave', (event) => {
        if (window._isPainterModeActive) {
            gHighlightModule.hide();
        }
    });
    gCanvas.addEventListener('mousemove', handleModulePlacement);
    gCanvas.addEventListener('wheel', (event) => {
        if (event.ctrlKey && window._isPainterModeActive) {
            if (gwUser.controls.enableZoom) {
                gwUser.controls.enableZoom = false;
            }
            moduleBrush.zSlice += Math.sign(event.deltaY);
            zSliceController.updateDisplay();
            updateVisibleModules(moduleBrush.zSlice);
        } else {
            gwUser.controls.enableZoom = true;
        }
    });

    // Import/Export Controls
    gExportGui.add({
        import: function() {
            document.getElementById("configUploadButton").click();
        }
    }, 'import').name("Import");

    gExportGui.add({
        downloadCurrent: function() {
            downloadCurrentConfiguration();
        }
    }, 'downloadCurrent').name("Download Current");

    gExportGui.add({
        importScenario: function() {
            document.getElementById("scenarioUploadButton").click();
        }
    }, 'importScenario').name("Import Scenario");

    gExportGui.add({
        downloadScenario: function() {
            downloadScenario();
        }
    }, 'downloadScenario').name("Download Scenario");

    gExportGui.add({
        saveInitial: function() {
            saveConfiguration(true);
            console.log("Initial configuration saved");
            if (!pathfinderData.is_running && JSON.parse(pathfinderData.config_f).exists) {
                pathfinder_controller.enable();
            }
        }
    }, 'saveInitial').name("Save Initial Config");

    gExportGui.add({
        saveFinal: function() {
            saveConfiguration(false);
            console.log("Final configuration saved");
            if (!pathfinderData.is_running && JSON.parse(pathfinderData.config_i).exists) {
                pathfinder_controller.enable();
            }
        }
    }, 'saveFinal').name("Save Final Config");

    gExportGui.add({
        viewInitial: function() {
            try {
                const config = JSON.parse(pathfinderData.config_i);
                if (!config.exists) {
                    alert("No initial configuration saved. Please save an initial configuration first.");
                    return;
                }
                const success = loadConfigurationFromJSON(pathfinderData.config_i);
                if (!success) {
                    alert("Failed to load initial configuration. Please check the console for errors.");
                }
            } catch (error) {
                console.error("Error loading initial configuration:", error);
                alert("No initial configuration saved or invalid configuration.");
            }
        }
    }, 'viewInitial').name("View Initial Config");

    gExportGui.add({
        viewFinal: function() {
            try {
                const config = JSON.parse(pathfinderData.config_f);
                if (!config.exists) {
                    alert("No final configuration saved. Please save a final configuration first.");
                    return;
                }
                const success = loadConfigurationFromJSON(pathfinderData.config_f);
                if (!success) {
                    alert("Failed to load final configuration. Please check the console for errors.");
                }
            } catch (error) {
                console.error("Error loading final configuration:", error);
                alert("No final configuration saved or invalid configuration.");
            }
        }
    }, 'viewFinal').name("View Final Config");

    const _folder = gScenGui.addFolder("Example Scenarios");
    for (let i in EXAMPLE_SCENARIOS) {
        let ex = EXAMPLE_SCENARIOS[i];
        _exampleLoaders[ex] = _generateExampleLoader(ex);
        _folder.add(_exampleLoaders, ex).name(ex);
    }

    // Add color picker for selected module
    gSelectedModuleGui.addColor(selectedModuleColor, 'color')
        .name('Color')
        .onChange((value) => {
            if (selectedModule) {
                selectedModule.color = value;
                selectedModule.mesh.material.uniforms.diffuse.value.setFromColor(new THREE.Color(value));
            }
        });

    // Add event listener for configuration file upload
    const configUploadElement = document.getElementById("configUploadButton");
    configUploadElement.onchange = (e) => {
        const file = configUploadElement.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const jsonContent = e.target.result;
            try {
                // Load and display the configuration directly
                const success = loadConfigurationFromJSON(jsonContent);
                if (!success) {
                    alert("Failed to load configuration. Please check the console for errors.");
                }
            } catch (error) {
                console.error("Invalid JSON file:", error);
                alert("Invalid JSON file. Please select a valid configuration file.");
            }
        }
        reader.onerror = (e) => {
            console.error("Error reading file:", e.target.error);
        }
        reader.readAsText(file);
        // Reset the input so the same file can be selected again
        configUploadElement.value = '';
    }
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

function getMousePosition(event) {
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

    let roundedPoint = {
        x: Math.round(point.x),
        y: Math.round(point.y),
        z: moduleBrush.zSlice
    };

    if (moduleBrush.type !== 0 && (roundedPoint.x + roundedPoint.y + roundedPoint.z) % 2 !== 0) {
        let yDiff = point.y - roundedPoint.y;
        let xDiff = point.x - roundedPoint.x;
        if (Math.abs((yDiff)/(xDiff)) >= 1) {
            roundedPoint.y += Math.sign(yDiff);
        } else {
            roundedPoint.x += Math.sign(xDiff);
        }
    }
    return roundedPoint;
}

function setDrawMode(event) {
    if (!window._isPainterModeActive) return;

    // Set draw mode based on module presence
    let mousePos = getMousePosition(event);
    if (!mousePos) return;

    let module = getModuleAtPosition(mousePos.x, mousePos.y, mousePos.z);
    if (!module) {
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
    // Only paint modules when clicking on main view in painter mode
    if (!window._isPainterModeActive) return;

    if (document.elementFromPoint(event.clientX, event.clientY).id !== "mainView") {
        gHighlightModule.hide();
        return;
    }
    let mousePos = getMousePosition(event)
    gHighlightModule.setPosition(mousePos);
    gHighlightModule.show();
    if (!window._mouseHeld || !gHighlightModule.mesh.visible) return;
    switch (window._toolMode) {
        case TOOL_MODES.PICK_COLOR:
            copyColorFromModule(gHighlightModule.parentMesh.position.x, gHighlightModule.parentMesh.position.y, gHighlightModule.parentMesh.position.z)
            break;
        case TOOL_MODES.EDIT:
            toggleModuleAtPosition(gHighlightModule.parentMesh.position.x, gHighlightModule.parentMesh.position.y, gHighlightModule.parentMesh.position.z);
    }
}

function copyColorFromModule(x, y, z) {
    const existingModule = getModuleAtPosition(x, y, z);

    if (existingModule) {
        const color = new THREE.Color(existingModule.color)
        brushColor_selector.setValue({ r: color.r, g: color.g, b: color.b });
    }
}

/**
 * Toggles a module at the specified grid position - places one if none exists, or removes it if one does
 * @param {number} x - X grid position
 * @param {number} y - Y grid position
 * @param {number} z - Z grid position
 */
function toggleModuleAtPosition(x, y, z) {
    const existingModule = getModuleAtPosition(x, y, z);

    // Invalidate move sequence and reset progress bar
    pathfinderProgressBar.style.width = "0%";
    window.gwMoveSetSequence.invalidate();

    if (!existingModule && window._drawMode === DRAW_MODES.PLACE) {
        // Create a new module at the position
        const pos = new THREE.Vector3(x, y, z);

        // Convert moduleBrush.color (which is an object with r,g,b properties) to a THREE.Color
        const color = new THREE.Color(
            moduleBrush.color.r,
            moduleBrush.color.g,
            moduleBrush.color.b
        );
        const module = new Module(moduleBrush.type, VisConfigData.nextModID, pos, color.getHex(), MODULE_SETTINGS.SCALE);
        if (moduleBrush.static) {
            module.markStatic();
        }
        updateModuleVisibility(module, z, moduleBrush.zSlice);
    } else if (existingModule && window._drawMode === DRAW_MODES.ERASE) {
        gModules[existingModule.id].destroy();
    }
}

// Add click handler for module selection
document.addEventListener('click', (event) => {
    // Only handle selection if not in painter mode
    if (window._isPainterModeActive) return;

    // Check if click is on GUI
    const path = event.path || (event.composedPath && event.composedPath());
    for (const element of path || []) {
        if (element.classList &&
            (element.classList.contains('lil-gui') ||
             element.classList.contains('dg'))) {
            return; // Click was on GUI, don't handle selection
        }
    }

    // Get mouse position in normalized device coordinates
    const mouse = new THREE.Vector2();
    const rect = gRenderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Create raycaster
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, gwUser.camera);

    // Get all module meshes
    const moduleMeshes = Object.values(gModules).map(module => module.mesh);

    // Find intersections
    const intersects = raycaster.intersectObjects(moduleMeshes);

    if (intersects.length > 0) {
        // Find the module that owns the intersected mesh
        const intersectedModule = Object.values(gModules).find(module =>
            module.mesh === intersects[0].object
        );
        selectModule(intersectedModule);
    } else {
        selectModule(null);
    }
});

// Add module selection functionality
function selectModule(module) {
    selectedModule = module;
    if (module) {
        selectedModuleColor.color = module.color;
        gSelectedModuleGui.show();
        gSelectedModuleGui.updateDisplay();
    } else {
        gSelectedModuleGui.hide();
    }
}