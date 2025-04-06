import * as THREE from 'three';
import { SVGRenderer } from 'three/addons/renderers/SVGRenderer.js';
import { Module, ReferenceModule, HighlightModule } from "./Module.js";
import { User } from "./User.js";
import { ModuleType, MoveType } from "./utils.js";
import { Move } from "./Move.js";
import { MoveSetSequence } from "./MoveSetSequence.js";
import { gAnimGui } from "./GUI.js";
import { Scenario } from "./Scenario.js";

// Extends THREE Vector3 type with new component-wise abs() and sum() methods
// TODO put this in a better place?
THREE.Vector3.prototype.abs = function() {
    return new THREE.Vector3(Math.abs(this.x), Math.abs(this.y), Math.abs(this.z));
}
THREE.Vector3.prototype.sum = function() {
    return (this.x + this.y + this.z);
}
THREE.Vector3.prototype.setNaN = function(newVal) {
    return new THREE.Vector3(isNaN(this.x) ? newVal : this.x,
                             isNaN(this.y) ? newVal : this.y,
                             isNaN(this.z) ? newVal : this.z);
}
THREE.Vector3.prototype.sgn = function() {
    const precision = 0.000001;
    let rounded = this.clone().multiplyScalar(1/precision).roundToZero().multiplyScalar(precision);
    return rounded.divide(rounded.abs()).setNaN(0);
}

/* ****************************** */
/* Global attributes */
/* ****************************** */
window.gwAutoAnimate = false;
window.gwForward = true;
window.gwNextAnimationRequested = false;
window.gwAnimSpeed = 1.0;
window.gwUser = null;
window.gwMoveSetSequence = new MoveSetSequence();
window.gwScenarioCentroid = new THREE.Vector3(0.0, 0.0, 0.0);
window.gwScenarioRadius = 1.0;

/* ****************************** */
/* Renderer setup */
/* ****************************** */
let renderMode = 'WEBGL';
function _setupWebGLRenderer() {
    // Primary View: set up canvas + renderer
    gCanvas.width = gCanvas.clientWidth;
    gCanvas.height = gCanvas.clientHeight;
    gRenderer = new THREE.WebGLRenderer( {canvas: gCanvas, antialiasing: true} );
    gRenderer.setPixelRatio(window.devicePixelRatio * 1.5);
    THREE.ColorManagement.enabled = true;
    gRenderer.shadowMap.enabled = true;
    gRenderer.setSize(gCanvas.clientWidth, gCanvas.clientHeight);
    // Mini View: set up canvas + renderer
    gMiniCanvas.width = gMiniCanvas.clientWidth;
    gMiniCanvas.height = gMiniCanvas.clientHeight;
    gMiniRenderer = new THREE.WebGLRenderer( {canvas: gMiniCanvas, antialiasing: true, alpha: true} );
    gMiniRenderer.setPixelRatio(window.devicePixelRatio * 1.5);
    gMiniRenderer.shadowMap.enabled = true;
    gMiniRenderer.setSize(0.25 * gCanvas.clientWidth, 0.25 * gCanvas.clientHeight);
    gReferenceRenderer = new THREE.WebGLRenderer( {canvas: gReferenceCanvas, antialiasing: true, alpha: true} );
    gReferenceRenderer.setSize(0.05 * gCanvas.clientWidth, 0.05 * gCanvas.clientWidth);
}
function _setupSVGRenderer() {
    gCanvas.width = 0;
    gCanvas.height = 0;
    THREE.ColorManagement.enabled = false;
    gRenderer = new SVGRenderer( {} );
    gRenderer.setSize(gCanvas.clientWidth, gCanvas.clientHeight);
    document.body.appendChild(gRenderer.domElement);
    gRenderer.domElement.setAttribute('xmlns' ,'http://www.w3.org/2000/svg');
    requestAnimationFrame(animate);
}
export function toggleRenderMode() {
    if (renderMode == 'SVG') {
        document.body.removeChild(gRenderer.domElement);
        renderMode = 'WEBGL';
        _setupWebGLRenderer();
    } else {
        renderMode = 'SVG';
        _setupSVGRenderer();
    }
}

// Primary View
export let gRenderer;
export const gCanvas = document.getElementById("mainView");
gCanvas._xscale = gCanvas.clientWidth / window.innerWidth; // Used for resizing
gCanvas._yscale = gCanvas.clientHeight / window.innerHeight; // Used for resizing
// Mini View
export let gMiniRenderer;
export const gMiniCanvas = document.getElementById("miniView");
export let gReferenceRenderer;
export const gReferenceCanvas = document.getElementById("referenceModule");

// Final initialization
export const gLights = {_fullbright: false};
export const gScene = new THREE.Scene();
export const gUser = new User();
export const gModules = {};
export let gReferenceModule = new ReferenceModule(ModuleType.CUBE);
export const gHighlightModule = new HighlightModule(ModuleType.CUBE);
export const gModulePositions = new Map();
_setupWebGLRenderer();
gScene._backgroundColors = [new THREE.Color(0x334D4D), new THREE.Color(0xFFFFFF), new THREE.Color(0x000000)];
gScene._backgroundColorSelected = 0;
gRenderer.setClearColor(gScene._backgroundColors[gScene._backgroundColorSelected]);
gMiniRenderer.setClearColor(0xFFFFFF, 0.05);
requestAnimationFrame(animate);

/* ****************************** */
/* Initial scene setup: modules + lights */
/* ****************************** */
// Create a dummy module just to have something on the screen
new Module(ModuleType.RHOMBIC_DODECAHEDRON, 0, new THREE.Vector3(0.0, 0.0, 0.0), 0xFFFFFF, 0.9);

// Add some lighting
export const lightAmbient = new THREE.AmbientLight(0xFFFFFF, 0.8);
const lightDirectional = new THREE.DirectionalLight(0xFFFFFF, 0.5);
lightDirectional.position.set(1, 1, 1);
lightAmbient.layers.enable(3);
lightDirectional.layers.enable(3);
gScene.add(lightAmbient);
gScene.add(lightDirectional);
gLights.lightAmbient = lightAmbient;
gLights.lightDirectional = lightDirectional;
gLights._defaultAmbientIntensity = lightAmbient.intensity;
gLights._defaultDirectionalIntensity = lightDirectional.intensity;

// Axis lines to help with orientation
let axesHelper = new THREE.AxesHelper(5);
axesHelper.layers.set(1);
gScene.add(axesHelper);

// Once the page loads, automatically load an example scenario
document.addEventListener("DOMContentLoaded", async function () {
    new Scenario(await fetch('./Scenarios/3x3 Metamodule.scen').then(response => response.text()));
});

/* ****************************** */
/* Animation function, called every frame */
/* ****************************** */
// First a few helper variables and functions
let moveSet;
let lastFrameTime = 0;
let gDeltaTime;
let readyForNewAnimation = true;
let currentAnimProgress = 0.0; // 0.0-1.0
export function cancelActiveMove() {
    moveSet = null;
    currentAnimProgress = 0.0;
    readyForNewAnimation = true;
    window.gwNextAnimationRequested = false;
}

// OK
function animate(time) {
    gDeltaTime = time - lastFrameTime;
    lastFrameTime = time;

    if (currentAnimProgress > 1.0) { // Wrap up current animation if needed
        for (let i = 0; i < moveSet.moves.length; i++) {
            let move = moveSet.moves[i];
            gModules[move.id].finishMove(move); // Offset the module
        }
        readyForNewAnimation = true; // Flag that we can handle starting a new anim

        // If we're auto-animating, flag that we want another anim
        //  Otherwise, handle checkpoint moves:
        //      If we're animating forwards, and the next move is a checkpoint move,
        //      OR if we're animating backwards and the just-finished move was a checkpoint move,
        //          don't request another animation.
        if (window.gwAutoAnimate) {
            window.gwNextAnimationRequested = true;
        } else {
            let _moveSet = window.gwForward ? window.gwMoveSetSequence.moveSets[0] : moveSet;
            window.gwNextAnimationRequested = _moveSet ? !_moveSet.checkpoint : false;
        }

        currentAnimProgress = 0.0;
        moveSet = null;
    }

    if (readyForNewAnimation && window.gwNextAnimationRequested) { // Fetch and start new animations if needed
        moveSet = window.gwForward ? window.gwMoveSetSequence.pop() : window.gwMoveSetSequence.undo();

        // if there was no moveset to extract,
        //  keep readyForNewAnimation = true, but set request to false
        // otherwise, proceed as usual
        if (moveSet == null) {
            window.gwNextAnimationRequested = false;
        } else {
            readyForNewAnimation = false;
        }

        // TODO could add some effects to show which modules are moving --
        //  e.g. attaching a light to the movers,
        //  changing their materials, etc
    }

    if (moveSet) { // Perform animation (if there's one active)
        for (let i = 0; i < moveSet.moves.length; i++) {
            let move = moveSet.moves[i];
            gModules[move.id].animateMove(move, currentAnimProgress);
        }
        currentAnimProgress += gDeltaTime * window.gwAnimSpeed / 1000.0;
    }

    gUser.controls.update();
    gUser.miniControls.update();
    gUser.referenceCamera.position.copy(gUser.miniCamera.position);
    gUser.referenceCamera.position.sub(gUser.miniControls.target);
    gUser.referenceCamera.position.setLength(1.5);
    gUser.referenceCamera.lookAt(new THREE.Vector3(0.0, 0.0, 0.0));

	gMiniRenderer.render( gScene, gUser.miniCamera );
    gReferenceRenderer.render( gScene, gUser.referenceCamera );
    gRenderer.render( gScene, gUser.camera );

    // Manually add line strokes to SVG paths, if in SVG rendering mode
    if (renderMode == 'SVG') {
        let rawSvg = gRenderer.domElement.innerHTML;
        let fixedSvg = rawSvg.replace(/style="/g, 'style="stroke-width:1;stroke:black;stroke-linecap:round;');
        gRenderer.domElement.innerHTML = fixedSvg;
    }

    requestAnimationFrame(animate);
}
