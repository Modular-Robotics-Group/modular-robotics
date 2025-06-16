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
        let rotationMagnitude = ModuleData.get(this.moduleType)['rotationMagnitude'];

        step.anchorDir = parseAdc(this.adc);
        step.deltaPos = this.deltaPos;
        step.maxPct = 1.0;
        if (this.moveType == MoveType.PIVOT) {
            /* Part 1: Get the rotation axis
             * The module will rotate about an edge.
             * So, we need a unit vector representing the direction of this edge.
             * For cubes and RDs, there's a convenient shortcut to calculate this: take the cross product of
             *      (a) deltaPos (the net-translation of the full move), and
             *      (b) anchorDir
             */
            step.rotAxis = this.deltaPos.clone().cross(step.anchorDir).normalize();

            /* Part 2: Determine where the edge is
             * Again, the module rotates about an edge.
             * To do this rotation, we need to first perform a translation so that the edge lies at the origin.
             * So, we need to know exactly where the edge is.
             * For cubes and RDs, the following strategy works: (excluding a special case for cube "double-moves")
             *  1. Draw a line between
             *      (a) The origin of the shape before it does any movement, and
             *      (b) The origin of the shape after it finishes movement
             *  2. Calculate the midpoint of this line. In local space, this point lies on the edge we will pivot around: done!
             *  (note: Technically, the following code does this from the POV of the "anchor" module, but the concept is the same.)
             */

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
            step.maxAngle = step.deltaPos.abs().sum() * rotationMagnitude;
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
        let rotationMagnitude = ModuleData.get(this.moduleType)['rotationMagnitude'];
        let faceDist = ModuleData.get(this.moduleType)['facedist'];
        let bumpDist = ModuleData.get(this.moduleType)['bumpdist'];

        let isTriMove = this.adc >= 1000;
        let anchorDir = parseAdc(this.adc);
        let step1 = {}, step2 = {};

        /* As with cube/RD pivoting, we need a rotation axis, and the location of the edge to pivot around.
         * But, the geometry is more complicated; AND, catom rotation takes place in two steps,
         *  so we need TWO rotation axes and TWO edge-locations.
         * We use a trick to help calculate all the information we need: a "bump" plane/axis.
         *      A catom movement involves pivoting away from face "A" onto face "B", then pivoting away from face "B" onto face "C".
         *      Note that face "B" is common to both steps:
         *          therefore, the pivot-edge for step 1 and the pivot-edge for step 2 BOTH lie on face "B".
         *          If we have face "B", then we've effectively solved for one component of both steps' edge-locations.
         *      -- Also note that the net translation of a catom movement can never be in all 3 axes (x, y, and z);
         *          that is, there is no valid catom move which results in a change in all 3 x, y, and z coordinates.
         *          This fact is used to help define face "B".
         *      With face "B" well-defined, we have enough information to easily calculate the other two components of each edge-location.
         */

        if (isTriMove) {
            // Pivot across triangle face
            rotationMagnitude = 1.23095941734 // arctan(1 - sqrt(2) / 2, sqrt(2) - 1) * 2
            step1.maxAngle = rotationMagnitude;
            step1.maxPct = 0.5;
            step2.maxAngle = rotationMagnitude;
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
            step1.postTrans = dp1.clone().setLength(bumpDist).add(dp2.clone().setLength(0.5)).add(bumpAxis.clone().setLength(0.5));
            step1.preTrans = step1.postTrans.clone().negate();

            step2.postTrans = this.deltaPos.sgn().multiplyScalar(0.5).add(bumpAxis.clone().setLength(bumpDist));
            step2.preTrans = step2.postTrans.clone().negate();
        } else {
            // Pivot across square face
            step1.maxAngle = rotationMagnitude;
            step1.maxPct = 0.5;
            step2.maxAngle = rotationMagnitude;
            step2.maxPct = 1.0;

            /* Part 1: Calculate delta-position for each individual step 
             * That is: dp1 is the net-translation of step 1,
             *          dp2 is the net-translation of step 2
             */
            let dp1 = this.deltaPos.clone().multiply(anchorDir.abs()).normalize();
            let dp2 = this.deltaPos.clone().sub(dp1);

            /* Part 2: Calculate "bump axis" 
             * The first step of the move "lands" on a face; the second step of the move pivots away from this face.
             *      -> Call this the "intermediate face" ("face B" in function docstring).
             * The "bump axis" is the normal vector of this "intermediate face".
             * The edges for both steps lie on this face: calculating the normal vector...
             *  means that bumpAxis.setLength(bumpDist) solves a component of each edge's location
             */
            let bumpAxis = anchorDir.sgn().sub(dp1.sgn());
            this.bumpAxis = bumpAxis;

            /* Part 3: Get the rotation axes
             * Just like with cubes/RDs, except we need two axes now (one for each step).
             */
            let ra1 = dp1.clone().cross(anchorDir).normalize();
            let ra2 = dp2.clone().cross(bumpAxis).normalize().negate();

            /* Part 4: Store what we have so far in the 'step' objects
             * step1 is a direct copy of what we've calculated so far...
             * but step2 is more complicated. We need to calculate step2's final parameters WITH RESPECT TO
             *      what's already been done for step1 (since step2 is a direct continuation of step1).
             * All this really means is, we need to rotate all of step2 about the rotation axis of step1.
             * In the case of "straight" catom moves, where dp1==dp2 (step1 and step2 roll in the same direction),
             *      step2 should just directly re-use step1's rotation axis.
             */
            step1.deltaPos = dp1;
            step1.rotAxis = ra1;
            step2.deltaPos = dp2.clone().applyAxisAngle(ra1, rotationMagnitude);
            step2.rotAxis = dp1.equals(dp2) ? ra1 : ra2.clone().applyAxisAngle(ra1, rotationMagnitude);

            /* Part 5: Determine where the edges are
             * Like with cubes/RDs, we need to pre-translate the module so that the pivot-edge lies along the origin
             *      (and post-translate it back, after the rotation is finished).
             * With the bumpaxis calculated, one component of this translation is simply bumpAxis.setLength(bumpDist),
             *      (where bumpDist is one-half the edge length).
             * The other component, conveniently, is just the direction of the step's delta-position,
             *      scaled to the radius of the inscribed sphere (faceDist).
             * In this way, the translation can simply be thought of as two sub-translations:
             *      (1) along the deltaPos direction by faceDist, and
             *      (2) along the bumpAxis direction by bumpDist
             * Like in part (4), step2 needs to be rotated by step1's rotation axis, unless it's a "straight" catom move.
             */
            step1.postTrans = dp1.clone().setLength(faceDist).add(bumpAxis.clone().setLength(bumpDist));
            step1.preTrans = step1.postTrans.clone().negate();

            step2.postTrans = dp1.equals(dp2) ?
                dp2.clone().setLength(bumpDist).add(bumpAxis.clone().setLength(faceDist)).applyAxisAngle(ra1.clone().negate(), rotationMagnitude)
                : dp2.clone().setLength(bumpDist).add(bumpAxis.clone().setLength(faceDist).negate()).applyAxisAngle(ra1, rotationMagnitude);
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
                let reverseStepTwo = this.steps[1].deltaPos.clone().applyAxisAngle(this.steps[0].rotAxis, -ModuleData.get(this.moduleType)['rotationMagnitude']).negate().add(this.bumpAxis);
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
