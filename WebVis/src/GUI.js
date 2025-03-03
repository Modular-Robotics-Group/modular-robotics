import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { Scenario } from './Scenario.js';
import { gScene, gLights } from './main.js';
import { moduleBrush, pathfinderData } from './utils.js';

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

// MRWT Mode Toggle
window._toggleMRWTMode = function() {
    gAnimGui.show(gAnimGui._hidden);
    gScenGui.show(gScenGui._hidden);
    gModuleBrushGui.show(gModuleBrushGui._hidden);
    gLayerGui.show(gLayerGui._hidden);
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
    gLayerGui.add(moduleBrush, 'zSlice', 0, 10, 1).name("Layer");
    gLayerGui.add(moduleBrush, 'adjSlicesVisible').name("Visualize Adjacent Layers");
    // Pathfinder and debug Controls
    gPathfinderGui.add(window, '_pathfinderConfigDEBUG').name("Set configurations for Pathfinder");
    pathfinder_controller = gPathfinderGui.add(window, '_pathfinderRun').name("Run Pathfinder").disable();
    gDevGui.add(window, '_toggleMRWTMode').name("MRWT Mode Toggle");

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
