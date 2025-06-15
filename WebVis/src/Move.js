import * as THREE from 'three';
import { ModuleType, MoveType } from './utils.js';
import { ModuleData } from './ModuleGeometries.js';

function constructAdc(ad) {
    // Given a THREE.Vector3 'ad' (anchor direction),
    //  returns an integral Anchor Direction Code.
    let i;
    let adc = 0;
    for (i = 0; i < 3; i++) {
        if (Math.abs(ad.getComponent(i)) > 0.000001) {
            adc = adc * 10 + i + 1 + (ad.getComponent(i) < 0 ? 3 : 0);
        }
    }
    return adc;
}

function parseAdc(adc) {
    let anchorDir;
    switch (Math.abs(adc % 1000)) {
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
        let midsphere = ModuleData.get(this.moduleType)['midsphere'];
        let dihedral = ModuleData.get(this.moduleType)['dihedral'];

        step.anchorDir = parseAdc(this.adc);
        step.deltaPos = this.deltaPos;
        step.maxPct = 1.0;
        if (this.moveType == MoveType.PIVOT) {
            // Rotation axis
            step.rotAxis = this.deltaPos.clone().cross(step.anchorDir).normalize();

            // Determine our start position in the coordinate system centered at the origin of the "anchor" shape
            //  (This happens to be neatly encoded in anchorDir; we just need to re-scale it to appropriate length)
            let _startPos = step.anchorDir.sgn();

            // Determine the midpoint of our start and end positions
            let _linearTranslation = _startPos.clone().add(step.deltaPos);

            // SPECIAL CASE: for cube "double-moves" (180-degree pivots), this logic won't work;
            //  just use the deltaPos as the linear translation value
            if ((this.moduleType == ModuleType.CUBE) && (step.deltaPos.abs().sum() > 1.0)) { _linearTranslation = this.deltaPos.clone(); }

            let _translationDir = _linearTranslation.clone().normalize();

            // Scale to midsphere length
            step.postTrans = _translationDir.clone().multiplyScalar(midsphere);
            step.preTrans = step.postTrans.clone().negate();
            step.maxAngle = step.deltaPos.abs().sum() * dihedral;
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

    constructCatomSteps() {
        let dihedral = ModuleData.get(this.moduleType)['dihedral'];
        let faceDist = ModuleData.get(this.moduleType)['facedist'];
        let edgeDist = ModuleData.get(this.moduleType)['edgedist'];

        let isTriMove = this.adc >= 1000;
        let anchorDir = parseAdc(this.adc);
        let step1 = {}, step2 = {};

        if (isTriMove) {
            // Pivot across triangle face
            dihedral = 1.23095941734 // arctan(1 - sqrt(2) / 2, sqrt(2) - 1) * 2
            step1.maxAngle = dihedral;
            step1.maxPct = 0.5;
            step2.maxAngle = dihedral;
            step2.maxPct = 1.0;

            // Delta positions for each step
            let dp2 = this.deltaPos.clone().multiply(anchorDir.abs()).normalize();
            let dp1 = this.deltaPos.clone().sub(dp2);

            // Bump Axis
            let bumpAxis = anchorDir.sgn().sub(dp2.sgn());
            this.bumpAxis = bumpAxis;

            // Triangle rotation axes for each step
            let ra1 = dp1.clone().cross(anchorDir).normalize();
            let ra2 = this.deltaPos.clone().cross(bumpAxis).normalize();

            step1.deltaPos = dp1;
            step1.rotAxis = ra1;
            step2.deltaPos = dp2;
            step2.rotAxis = ra2;

            // Translations
            step1.postTrans = dp1.clone().setLength(edgeDist).add(dp2.clone().setLength(0.5)).add(bumpAxis.clone().setLength(0.5));
            step1.preTrans = step1.postTrans.clone().negate();

            step2.postTrans = this.deltaPos.sgn().multiplyScalar(0.5).add(bumpAxis.clone().setLength(edgeDist));
            step2.preTrans = step2.postTrans.clone().negate();
        } else {
            // Pivot across square face
            step1.maxAngle = dihedral;
            step1.maxPct = 0.5;
            step2.maxAngle = dihedral;
            step2.maxPct = 1.0;

            // Delta positions for each step
            let dp1 = this.deltaPos.clone().multiply(anchorDir.abs()).normalize();
            let dp2 = this.deltaPos.clone().sub(dp1);

            // Catom movement will take place in a plane
            // "Bump axis" is the normal to this plane
            let bumpAxis = anchorDir.sgn().sub(dp1.sgn());
            this.bumpAxis = bumpAxis;

            // Rotation axes for each step
            let ra1 = dp1.clone().cross(anchorDir).normalize();
            let ra2 = dp2.clone().cross(bumpAxis).normalize().negate();

            step1.deltaPos = dp1;
            step1.rotAxis = ra1;
            step2.deltaPos = dp2.clone().applyAxisAngle(ra1, dihedral);
            step2.rotAxis = dp1.equals(dp2) ? ra1 : ra2.clone().applyAxisAngle(ra1, dihedral);

            // Translations: along the deltaPos direction by faceDist,
            //  and along the bumpAxis direction by edgeDist
            step1.postTrans = dp1.clone().setLength(faceDist).add(bumpAxis.clone().setLength(edgeDist));
            step1.preTrans = step1.postTrans.clone().negate();

            step2.postTrans = dp1.equals(dp2) ?
                dp2.clone().setLength(edgeDist).add(bumpAxis.clone().setLength(faceDist)).applyAxisAngle(ra1.clone().negate(), dihedral)
                : dp2.clone().setLength(edgeDist).add(bumpAxis.clone().setLength(faceDist).negate()).applyAxisAngle(ra1, dihedral);
            step2.preTrans = step2.postTrans.clone().negate();
        }

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
            let _startPos = this.steps[0].anchorDir.sgn();
            let _endPos = _startPos.add(newDeltaPos);
            newAdc = constructAdc(_endPos);
        } else if (this.moduleType == ModuleType.CATOM) {
        // Catom pivots
            if (this.adc >= 1000) {
                newAdc = 1000 + constructAdc(parseAdc(this.adc).sgn().sub(this.deltaPos));
            } else {
                let reverseStepTwo = this.steps[1].deltaPos.clone().applyAxisAngle(this.steps[0].rotAxis, -ModuleData.get(this.moduleType)['dihedral']).negate().add(this.bumpAxis);
                newAdc = constructAdc(reverseStepTwo);
            }
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
