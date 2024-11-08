import * as THREE from 'three';
import { ModuleType, MoveType } from './utils.js';
import { ModuleDihedralAngles, ModuleMidspheres } from './ModuleGeometries.js';

function constructAdc(ad) {
    // Given a THREE.Vector3 'ad' (anchor direction),
    //  returns an integral Anchor Direction Code.
    let i;
    let adc = 0;
    for (i = 0; i < 3; i++) {
        if (ad.getComponent(i) != 0) {
            adc = adc * 10 + i + 1 + (ad.getComponent(i) < 0 ? 3 : 0);
        }
    }
    return adc;
}

function parseAdc(adc) {
    let anchorDir;
    switch (Math.abs(adc)) {
        // Generic sliding move
        case 0:  anchorDir = new THREE.Vector3( 0.0,  0.0,  0.0 ); break; // generic slide

        // Cube pivots
        case 1:  anchorDir = new THREE.Vector3( 1.0,  0.0,  0.0 ); break; // +x
        case 2:  anchorDir = new THREE.Vector3( 0.0,  1.0,  0.0 ); break; // +y
        case 3:  anchorDir = new THREE.Vector3( 0.0,  0.0,  1.0 ); break; // +z
        case 4:  anchorDir = new THREE.Vector3(-1.0,  0.0,  0.0 ); break; // -x
        case 5:  anchorDir = new THREE.Vector3( 0.0, -1.0,  0.0 ); break; // -y
        case 6:  anchorDir = new THREE.Vector3( 0.0,  0.0, -1.0 ); break; // -z

        // Rhombic dodecahedron: faces with normals in xy plane
        case 12: anchorDir = new THREE.Vector3( 1.0,  1.0,  0.0 ); break; // +x +y
        case 15: anchorDir = new THREE.Vector3( 1.0, -1.0,  0.0 ); break; // +x -y
        case 42: anchorDir = new THREE.Vector3(-1.0,  1.0,  0.0 ); break; // -x +y
        case 45: anchorDir = new THREE.Vector3(-1.0, -1.0,  0.0 ); break; // -x -y

        // Rhombic dodecahedron: faces with normals in xz plane
        case 13: anchorDir = new THREE.Vector3( 1.0,  0.0,  1.0 ); break; // +x +z
        case 16: anchorDir = new THREE.Vector3( 1.0,  0.0, -1.0 ); break; // +x -z
        case 43: anchorDir = new THREE.Vector3(-1.0,  0.0,  1.0 ); break; // -x +z
        case 46: anchorDir = new THREE.Vector3(-1.0,  0.0, -1.0 ); break; // -x -z

        // Rhombic dodecahedron: faces with normals in yz plane
        case 23: anchorDir = new THREE.Vector3( 0.0,  1.0,  1.0 ); break; // +y +z
        case 26: anchorDir = new THREE.Vector3( 0.0,  1.0, -1.0 ); break; // +y -z
        case 53: anchorDir = new THREE.Vector3( 0.0, -1.0,  1.0 ); break; // -y +z
        case 56: anchorDir = new THREE.Vector3( 0.0, -1.0, -1.0 ); break; // -y -z

        default: anchorDir = new THREE.Vector3( 0.0,  0.0,  0.0 ); console.log("Unknown rotation code ", adc, " -- treating as sliding move"); break;
    }
    anchorDir.normalize();

    return anchorDir;
}

export class Move {
    // Pivot step attributes:
    //  anchorDir, deltaPos, rotAxis, maxAngle, preTrans, postTrans, maxPct
    // Slide step attributes:
    //  deltaPos, rotAxis, maxAngle, maxPct
    constructor(id, adc, deltaPos, moveType, moduleType) { 
        this.id = id;
        this.adc = adc;
        this.deltaPos = deltaPos;
        this.moveType = moveType;
        this.moduleType = moduleType;
        this.steps = [];

        if (this.moduleType == ModuleType.CATOM) {
            this.constructCatomSteps();
        } else if ((this.deltaPos.abs().sum() > 1) && (this.adc < 0)) {
            this.constructCornerSlideSteps();
        } else {
            this.constructStandardStep();
        }
    }

    constructStandardStep() {
        let step = {};
        step.anchorDir = parseAdc(this.adc);
        step.deltaPos = this.deltaPos;
        step.maxPct = 1.0;
        if (this.moveType == MoveType.PIVOT) {
            // Rotation axis
            step.rotAxis = this.deltaPos.clone().cross(step.anchorDir).normalize();

            // Determine our start position in the coordinate system centered at the origin of the "anchor" shape
            //  (This happens to be neatly encoded in anchorDir; we just need to re-scale it to appropriate length)
            let _startPos = step.anchorDir.clone().divide(step.anchorDir.abs()).setNaN(0.0);

            // Determine the midpoint of our start and end positions
            let _linearTranslation = _startPos.clone().add(step.deltaPos);

            // SPECIAL CASE: for cube "double-moves" (180-degree pivots), this logic won't work;
            //  just use the deltaPos as the linear translation value
            if ((this.moduleType == ModuleType.CUBE) && (step.deltaPos.abs().sum() > 1.0)) { _linearTranslation = this.deltaPos.clone(); }

            let _translationDir = _linearTranslation.clone().normalize();

            // Scale to midsphere length
            step.postTrans = _translationDir.clone().multiplyScalar(ModuleMidspheres.get(this.moduleType));
            step.preTrans = step.postTrans.clone().negate();
            step.maxAngle = THREE.MathUtils.degToRad(step.deltaPos.abs().sum() * ModuleDihedralAngles.get(this.moduleType));
        } 
        this.steps.push(step);
    }

    constructCornerSlideSteps() {
        //  deltaPos, rotAxis, maxAngle, maxPct
        let step1 = {}, step2 = {};
        step1.rotAxis = new THREE.Vector3(1.0, 0.0, 0.0);
        step1.maxAngle = 0.0;
        step1.maxPct = 0.5;
        step2.rotAxis = step1.rotAxis;
        step2.maxAngle = step1.maxAngle;
        step2.maxPct = 1.0;

        step1.deltaPos = this.deltaPos.clone().multiply(parseAdc(this.adc));
        step2.deltaPos = this.deltaPos.clone().sub(step1.deltaPos);

        this.steps.push(step1);
        this.steps.push(step2);
    }

    reverse() {
        let newDeltaPos = this.deltaPos.clone().negate();
        let newAdc;

        // Generic sliding moves
        if (this.adc == 0) {
            newAdc = this.adc;
        // Corner sliding moves; little bit of math to extract new adc
        } else if (this.moveType == MoveType.SLIDING && this.deltaPos.abs().sum() > 1) {
            let testVec = new THREE.Vector3(1.0, 1.0, 1.0);
            let scaleVec = new THREE.Vector3(1.0, 2.0, 3.0);
            newAdc = -constructAdc(this.steps[1].deltaPos.abs());
        } else if (this.moduleType == ModuleType.RHOMBIC_DODECAHEDRON) {
        // RD pivots
            let _startPos = this.steps[0].anchorDir.clone().divide(this.steps[0].anchorDir.abs()).setNaN(0.0);
            let _endPos = _startPos.add(newDeltaPos);
            newAdc = constructAdc(_endPos);
        } else {
        // All others
            newAdc = this.adc;
        }

        return new Move(this.id, newAdc, newDeltaPos, this.moveType, this.moduleType);
    }
}

// PIVOTING RHOMBIC DODECAHEDRONS:
//  Pivoting a shape is a translate->rotate->untranslate operation.
//  The AXIS OF ROTATION is easy --
//      Simply take the cross-product of the face-normal and the delta-position.
//  To make this rotation happen about a specific point,
//      we need to translate the shape such that the point lies at the origin.
//      (For rotation about an EDGE, we select the midpoint of the edge.)
//  The translation DIRECTION is trickier.
//  We need to point a vector from the origin of the shape to the corresponding edge.
//  For that, we need to figure out which edge we're pivoting about.
//  However, all we have is the face-normal ("anchor direction"), and the delta-position.
//
//  The coordinate system used has its "absolute-origin" at the center of the shape that we are pivoting around.
//  That is, the origin does NOT lie in the pivoting shape; it's in the "anchor" shape!
//
//  During the pivot, the origin of the shape traverses from a start position to an end position.
//  Consider if this traversal was a linear slide from the start to the end:
//      then, there is an "average position" of this linear translation,
//      and we can draw a vector from the absolute-origin to this "average position".
//  This "average position" lies at the midpoint of the edge about which we're pivoting.
