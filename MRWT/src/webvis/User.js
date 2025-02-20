/* 
 * User class
 * User is a wrapper around the three.js Camera observing the scene,
 *  containing view settings (projection type, zoom level, etc)
 *  as well as methods to switch view settings
 * This module also handles other types of user input
 *  (such as window resizing)
*/

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { gScene, gCanvas, gUser, gRenderer, gLights, toggleRenderMode } from "./main.js";
import { CameraType } from "./utils.js";

export class User {
    constructor() {
        this.cameraStyle = CameraType.ORTHOGRAPHIC;
        this.headlamp = new THREE.PointLight(0xFFFFFF, 50.0);
        this.headlamp.position.set(0.0, 0.0, 0.0);
        gLights.headlamp = this.headlamp;
        gLights._defaultHeadlampIntensity = this.headlamp.intensity;
        this.resetCamera();
        window.gwUser = this;
    }

    resetCamera() {
        let newCamera;
        switch (this.cameraStyle) {
            case CameraType.PERSPECTIVE: newCamera = new THREE.PerspectiveCamera( 75, gCanvas.clientWidth / gCanvas.clientHeight, 0.1, 250.0 ); break;
            case CameraType.ORTHOGRAPHIC: {
                let width = gCanvas.clientWidth / 100;
                let height = gCanvas.clientHeight / 100;
                newCamera = new THREE.OrthographicCamera( -width, width, height, -height, 0.1, 250.0 ); break;
            }
        }
        newCamera.position.x = window.gwScenarioCentroid.x;
        newCamera.position.y = window.gwScenarioCentroid.y;
        newCamera.position.z = window.gwScenarioCentroid.z + window.gwScenarioRadius + 3.0;

        this.controls = new OrbitControls(newCamera, gCanvas);
        this.controls.target.set(...window.gwScenarioCentroid);
        this.camera = newCamera;
        this.camera.add(this.headlamp);
        gScene.add(this.camera);
    }

    toggleCameraStyle() {
        let newCameraStyle;
        switch(this.cameraStyle) {
            case CameraType.PERSPECTIVE: newCameraStyle = CameraType.ORTHOGRAPHIC; break;
            case CameraType.ORTHOGRAPHIC: newCameraStyle = CameraType.PERSPECTIVE; break;
        }
        this.cameraStyle = newCameraStyle;
        this.resetCamera();
    }
}

function window_resize_callback() {
    const width = window.innerWidth * gCanvas._xscale;
    const height = window.innerHeight * gCanvas._yscale;

    let newAspect = width/height;
    switch (gUser.cameraStyle) {
        case CameraType.PERSPECTIVE: gUser.camera.aspect = newAspect; break;
        case CameraType.ORTHOGRAPHIC: {
            let oldAspect = gUser.camera.right / gUser.camera.top;
            gUser.camera.left = gUser.camera.left * (newAspect / oldAspect);
            gUser.camera.right = gUser.camera.right * (newAspect / oldAspect);
            break;
        }
    }

    gUser.camera.updateProjectionMatrix();
    gRenderer.setSize(width, height);
}

function keydown_input_callback(event) {
    let key = event.key;
    switch (key) {
        case 'p': gUser.toggleCameraStyle(); break;
        case 'r': gUser.resetCamera(); break;
        case 'ArrowRight': _requestForwardAnim(); break;
        case 'ArrowLeft': _requestBackwardAnim(); break;
        case 'M': toggleRenderMode(); break;
        case 'P': console.log(gRenderer.domElement); break;
        default: break;
    }
}

// effectively making these functions global
window._requestForwardAnim = function () {
    window.gwNextAnimationRequested = true; 
    window.gwForward = true;
}
window._requestBackwardAnim = function () {
    window.gwNextAnimationRequested = true; 
    window.gwForward = false;
}

window.addEventListener('resize', window_resize_callback);
window.addEventListener('keydown', keydown_input_callback);

