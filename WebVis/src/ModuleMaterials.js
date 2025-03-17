/* Module material data */

import * as THREE from 'three';
import { ModuleType } from "./utils.js";

function _constructBorderedMaterial(texture, color, opacity) {
    return new THREE.MeshPhongMaterial({
        map: texture,
        color: color,
        transparent: true,
        opacity: opacity,
        onBeforeCompile: shader => { // Manually update the existing material shader to add borders to modules
            let endOfVert = shader.vertexShader.lastIndexOf('}');
            
            // Anything to inject at the top of the shaders (uniforms, macros, etc)
            let attributesToInject = `
attribute vec3 edge;
`;
            let varyingsToInject = `
varying vec3 dist;
`;
            let uniformsToInject = ``;
            
            let codeToInjectToVert = `
dist = edge;
`;

            shader.vertexShader =
                attributesToInject
                + varyingsToInject
                + shader.vertexShader.substring(0, endOfVert)
                + codeToInjectToVert
                + shader.vertexShader.substring(endOfVert);
            
            // Extract the index of the start of main
            //  We will declare some helper functions right before main()
            let beginningOfFrag = shader.fragmentShader.indexOf('void main() {');

            // Extract the index of the closing curly brace, hack-ily
            //  We will inject code to the end of main
            let endOfFrag = shader.fragmentShader.lastIndexOf('}');

/*          let uniformsToInject =
`uniform vec4 borderAttrs;
`           // Hook up these uniforms to a variable TODO: add actual variability
            shader.uniforms.borderAttrs = { value: new THREE.Vector4(0.0, 0.0, 0.0, 0.02) }; // R,G,B,width
*/
            
            // We will inject some helper functions
            let helperFunctions =
`float Between(float low, float high, float val) {
return step(low, val) - step(high, val);
}
float Rectangle(vec2 orig, vec2 wh, vec2 st) {
float x = Between(orig.x, orig.x + wh.x, st.x);
float y = Between(orig.y, orig.y + wh.y, st.y);
return x*y;
}
`;          // We will inject code at the end of main()
            let codeToInjectToFrag = `
float d = min(min(dist[0], dist[1]), dist[2]);
gl_FragColor = float(d < 0.1) * vec4(0, 0, 0, 1) + (1.0 - float(d < 0.1)) * gl_FragColor;
`;
/*`float borderMask = 1.0 - Rectangle(vec2(borderAttrs.w), vec2(1.0 - 2.0*borderAttrs.w), vMapUv);
float interiorMask = 1.0 - borderMask;
vec3 borderColor = borderAttrs.xyz;
vec3 border = borderMask * borderColor;

vec3 interior = gl_FragColor.xyz * interiorMask;
gl_FragColor = vec4(interior + border, gl_FragColor.a);
`*/
            // Perform the injection
            shader.fragmentShader = 
                uniformsToInject
                + varyingsToInject
                + shader.fragmentShader.substring(0, beginningOfFrag)
                + helperFunctions
                + shader.fragmentShader.substring(beginningOfFrag, endOfFrag)
                + codeToInjectToFrag
                + shader.fragmentShader.substring(endOfFrag);
        }
    });
}

function _constructBasicMaterial(texture, color, opacity) {
    return new THREE.MeshPhongMaterial({
        map: texture,
        color: color,
        transparent: true,
        opacity: opacity
    });
}

export const ModuleMaterialConstructors = new Map([
    //[ModuleType.CUBE, _constructBasicMaterial],
    //[ModuleType.RHOMBIC_DODECAHEDRON, _constructBasicMaterial],
    [ModuleType.CUBE, _constructBorderedMaterial],
    [ModuleType.RHOMBIC_DODECAHEDRON, _constructBorderedMaterial],
    [ModuleType.CATOM, _constructBorderedMaterial],
]);
