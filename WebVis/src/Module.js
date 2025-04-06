/* 
 * Module class
 * Modules contain their position, color, ID, etc. info,
 *  as well as their mesh
*/

import * as THREE from 'three';
import {CameraType, ModuleType, MoveType, VisConfigData} from "./utils.js";
import { ModuleData } from "./ModuleGeometries.js";
import { ModuleMaterialConstructors } from "./ModuleMaterials.js";
import { gScene, gModules, gModulePositions, gRenderer, gUser } from "./main.js";
import { zSliceController } from "./GUI.js";
import { Move } from "./Move.js"

const gTexLoader = new THREE.TextureLoader();
let cubeTexture = gTexLoader.load('./resources/textures/box.png');
let rdTexture = gTexLoader.load('./resources/textures/RD.png');
let catomTexture = gTexLoader.load('./resources/textures/catom.png');

// Interpolation function used for animation progress: Should map [0.0, 1.0] -> [0.0, 1.0]
function _animInterp(pct) {
    //return pct < 0.5 ? 4 * pct * pct * pct : 1 - Math.pow(-2 * pct + 2, 3) / 2; // Cubic ease in-out
    //return pct < 0.5 ? 2 * pct * pct : 1 - Math.pow(-2 * pct + 2, 2) / 2; // Quadratic ease in-out
    return -(Math.cos(Math.PI * pct) - 1) / 2; // Sinusodal ease in-out
    //return pct; // Bypass
}

function _createModuleMesh(moduleType, color = 0x808080, scale = 1.0, opacity = 1.0) {
    let geometry = ModuleData.get(moduleType)['geometry'];
    let material;
    let materialConstructor = ModuleMaterialConstructors.get(moduleType);
    let texture;

    switch (moduleType) {
        case ModuleType.CUBE: texture = cubeTexture; break;
        case ModuleType.RHOMBIC_DODECAHEDRON: texture = rdTexture; break;
        case ModuleType.CATOM: texture = catomTexture; break;
    }
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    material = materialConstructor(texture, color, opacity);

    let mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(scale, scale, scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false; // We will calculate transformation matrices ourselves
    return mesh;
}

// Unused, for now
function _createModuleBorder(moduleType, scale = 1.0) {
    let geometry = new THREE.EdgesGeometry(ModuleGeometries.get(moduleType), 1);
    let material = new THREE.LineBasicMaterial( {color: 0x000000, linewidth: 2.0} );
    let lines = new THREE.LineSegments(geometry, material);
    lines.scale.set(scale, scale, scale);
    return lines;
}

export class Module {
    constructor(moduleType, id, pos, color = 0x808080, scale = 1.0) {
        this.moduleType = moduleType;
        this.id = id;
        this.pos = pos;
        this.color = color;
        this.scale = scale;
        this.isStatic = false;

        this.cumulativeRotationMatrix = new THREE.Matrix4();

        this.mesh = _createModuleMesh(moduleType, color, scale);
        this._setMeshMatrix();
        this.parentMesh = new THREE.Object3D(); // Parent object will never rotate
        this.parentMesh.position.set(...pos);
        this.parentMesh.add(this.mesh);
        //let axesHelper = new THREE.AxesHelper(1.2);
        //this.mesh.add(axesHelper);
        gScene.add(this.parentMesh);
        gModules[id] = this;
        gModulePositions.set(JSON.stringify({x: Math.round(pos.x), y: Math.round(pos.y), z: Math.round(pos.z)}), this);

        // Update configuration bounds data
        VisConfigData.updateBounds(pos);
        zSliceController.min(VisConfigData.bounds.z.min - 2);
        zSliceController.max(VisConfigData.bounds.z.max + 2);
        zSliceController.updateDisplay();
        if (gUser.cameraStyle === CameraType.ORTHOGRAPHIC) {
            gUser.camera.position.z = 5.0 + Math.max(VisConfigData.bounds.z.max, VisConfigData.bounds.x.max);
        }

        // Update module ID data
        VisConfigData.nextModID = Math.max(VisConfigData.nextModID, id + 1);
    }

    markStatic() {
        this.isStatic = true;
        this.mesh.material.uniforms.border_extra = { value: 0.375 };
    }

    unMarkStatic() {
        this.isStatic = false;
        this.mesh.material.uniforms.border_extra = { value: 0.0 };
    }

    destroy() {
        delete gModules[this.id];
        gModulePositions.delete(JSON.stringify({x: Math.round(this.pos.x), y: Math.round(this.pos.y), z: Math.round(this.pos.z)}));
        gScene.remove(this.parentMesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();

        // Update configuration bounds data
        VisConfigData.clearBounds();
        for (let module in gModules) {
            VisConfigData.updateBounds(gModules[module].pos);
        }
        zSliceController.min(VisConfigData.bounds.z.min - 2);
        zSliceController.max(VisConfigData.bounds.z.max + 2);
        zSliceController.updateDisplay();
        if (gUser.cameraStyle === CameraType.ORTHOGRAPHIC) {
            gUser.camera.position.z = 5.0 + Math.max(VisConfigData.bounds.z.max, VisConfigData.bounds.x.max);
        }
    }

    _setMeshMatrix(optionalPreTransform = new THREE.Matrix4()) {
        let transform = new THREE.Matrix4().makeScale(this.scale, this.scale, this.scale).premultiply(optionalPreTransform);
        this.mesh.matrix.copy(transform);
    }

    animateMove(move, pct) {
        let iPct = _animInterp(pct);
        let maxPct = 0;
        let transform = new THREE.Matrix4();
        let i;
        for (i = 0; i < move.steps.length; i++) {
            let step = move.steps[i];
            let prevStepMaxPct = i > 0 ? move.steps[i-1].maxPct : 0.0;
            let stepPct = (Math.min(iPct, step.maxPct) - prevStepMaxPct) / (step.maxPct - prevStepMaxPct);
            switch (move.moveType) {
                case MoveType.PIVOT: transform.multiply(this._pivotAnimate(step, stepPct)); break;
                case MoveType.SLIDING: transform.multiply(this._slidingAnimate(step, stepPct)); break;
                case MoveType.MONKEY: transform.multiply(this._monkeyAnimate(step, stepPct)); break;
            }
            if (iPct < step.maxPct) { break; }
        }
        transform.multiply(this.cumulativeRotationMatrix);
        this._setMeshMatrix(transform);
    }

    finishMove(move) {
        let i;
        if (move.moveType !== MoveType.SLIDING) {
            for (i = 0; i < move.steps.length; i++) {
                let step = move.steps[i];
                let rotate = new THREE.Matrix4().makeRotationAxis(step.rotAxis, step.maxAngle);
                this.cumulativeRotationMatrix = this.cumulativeRotationMatrix.premultiply(rotate);
            }
        }
        this._setMeshMatrix(this.cumulativeRotationMatrix);
        this.parentMesh.position.add(move.deltaPos);
    }

    _pivotAnimate(step, pct) {
        let trans1 = new THREE.Matrix4().makeTranslation(step.preTrans);
        let rotate = new THREE.Matrix4().makeRotationAxis(step.rotAxis, step.maxAngle * pct);
        let trans2 = new THREE.Matrix4().makeTranslation(step.postTrans);
        let transform = new THREE.Matrix4().premultiply(trans1).premultiply(rotate).premultiply(trans2);
        return transform;
    }

    _slidingAnimate(step, pct) {
        let translate = step.deltaPos.clone().multiplyScalar(pct);
        let transform = new THREE.Matrix4().makeTranslation(translate);
        return transform;
    }
}

export class ReferenceModule {
    constructor(moduleType) {
        this.moduleType = moduleType;

        this.mesh = _createModuleMesh(moduleType, 0xFFFFFF, 1.0);
        this.mesh.layers.set(3);
        this.mesh.material.uniforms.opacity = { value: 0.3 };
        this.mesh.material.depthWrite = false;
        gScene.add(this.mesh);
    }

    swapType(moduleType) {
        gScene.remove(this.mesh);
        this.mesh = _createModuleMesh(moduleType, 0xFFFFFF, 1.0);
        this.mesh.layers.set(3);
        this.mesh.material.uniforms.opacity = { value: 0.3 };
        this.mesh.material.depthWrite = false;
        gScene.add(this.mesh);
    }
}
