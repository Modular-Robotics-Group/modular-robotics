import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { Scenario } from './Scenario.js';
import { gScene, gLights } from './main.js';

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

export const gGui = new GUI();

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

let _exampleLoaders = {};
async function _loadExampleScenario(name) {
    const scen = await fetch(`./Scenarios/${name}.scen`).then(response => response.text());
    new Scenario(scen);
}
function _generateExampleLoader(name) {
    return () => _loadExampleScenario(name);
}

// web Pathfinder stuff
// TODO: I'm not sure this is the right place to put this functionality, feel free
// to move it somewhere else if you can find a spot that makes more sense.
const pathfinder = Module.cwrap("pathfinder", "string", ["string", "string"]);
let pathfinder_config_i ='{"exists": false}';
let pathfinder_config_f ='{"exists": false}';
let pathfinder_controller;
window._pathfinderConfigDEBUG = async function() {
    let example_configs = "";
    await fetch(`./pathfinder/example_config.json`).then(response => response.text()).then(text => { example_configs = text });
    let j = JSON.parse(example_configs);
    pathfinder_config_i = JSON.stringify(j.initial);
    pathfinder_config_f = JSON.stringify(j.final);
    pathfinder_controller.enable();
}

window._pathfinderRun = function() {
    let rv = pathfinder(pathfinder_config_i, pathfinder_config_f);
    //console.log(rv); // Uncomment this if you want to see the produced scen contents
    new Scenario(rv);
}

document.addEventListener("DOMContentLoaded", async function () {
    gGui.add(new GuiGlobalsHelper('gwAnimSpeed', 1.0, SliderType.QUADRATIC), 'value', 0.0, 5.0, 0.1).name("Anim Speed");
    gGui.add(new GuiGlobalsHelper('gwAutoAnimate', false), 'value').name("Auto Animate");
    gGui.add(window.gwUser, 'toggleCameraStyle').name("Toggle Camera Style");
    gGui.add(window, '_toggleBackgroundColor').name("Toggle Background Color");
    gGui.add(window, '_toggleFullbright').name("Toggle Fullbright");
    gGui.add(window, '_requestForwardAnim').name("Step Forward");
    gGui.add(window, '_requestBackwardAnim').name("Step Backward");
    gGui.add(window, '_pathfinderConfigDEBUG').name("Set configurations for Pathfinder");
    pathfinder_controller = gGui.add(window, '_pathfinderRun').name("Run Pathfinder").disable();

    const _folder = gGui.addFolder("Example Scenarios");
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
