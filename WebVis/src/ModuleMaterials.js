/* Module material data */

import * as THREE from 'three';
import { ModuleType } from "./utils.js";

function _constructBorderedMaterial(texture, color, opacity) {
    return new THREE.ShaderMaterial({
        transparent: true,
        lights: true,
        side: THREE.DoubleSide,
        alphaTest: 0.5,
        uniforms: {
            map: { value: texture },
            mapTransform: { value: texture.matrix },
            diffuse: { value: new THREE.Vector3().setFromColor(new THREE.Color(color)) },
            ambientLightColor: { value: new THREE.Vector3().setFromColor(new THREE.Color(0xFFFFFF)) },
            lightProbe: { value: [] },
            directionalLights: { value: [] },
            directionalLightShadows: { value: [] },
            spotLights: { value: [] },
            spotLightShadows: { value: [] },
            pointLights: { value: [] },
            pointLightShadows: { value: [] },
            rectAreaLights: { value: [] },
            rectAreaLightShadows: { value: [] },
            ltc_1: { value: null },
            ltc_2: { value: null },
            hemisphereLights: { value: [] },
            hemisphereLightShadows: { value: [] },
            directionalShadowMap: { value: [] },
            spotShadowMap: { value: [] },
            pointShadowMap: { value: [] },
            directionalShadowMatrix: { value: [] },
            pointShadowMatrix: { value: [] },
            spotLightMap: { value: [] },
            spotLightMatrix: { value: [] },
            shininess: { value: 30.0 },
            reflectivity: { value: 1.0 },
            opacity: { value: opacity },
            line_divisor: { value: 1 },
            border_extra: { value: 0.0 }
        },
        vertexShader: `
#define USE_MAP
#define USE_UV
#define USE_LIGHT_PROBES
#define USE_ALPHATEST
#define MAP_UV uv

attribute vec3 edge;
varying vec3 dist;
uniform int line_divisor;
uniform float border_extra;

#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
	dist = edge;
}
`,
        fragmentShader:`
#define USE_MAP
#define USE_UV
#define USE_LIGHT_PROBES
#define USE_ALPHATEST
#define MAP_UV uv

varying vec3 dist;
uniform int line_divisor;
uniform float border_extra;

#define PHONG

uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
vec3 hsv2rgb(vec3 c)
{
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
	// Barycentric Coordinate Ordering
	//     Normalize
	// NOTE: Normalizing coordinates is purely stylistic, it makes the borders look a bit like they were drawn by pen.
	// dist = normalize(dist)
	//     Minimum barycentric coordinate
	float d1 = min(min(dist[0], dist[1]), dist[2]);
	//     Second smallest barycentric coordinate
	float d2 = max(min(dist[0], dist[1]), max(min(dist[1], dist[2]), min(dist[0], dist[2])));
	//     Maximum barycentric coordinate
    //float d3 = max(max(dist[0], dist[1]), dist[2]);
    // NOTE: It is possible under normal circumstances to calculate one of the coordinates by subtracting the
    // others from 1, however, since we allow one of the coordinates to be locked at 1 to prevent drawing edges
    // diagonally across square/rhombic faces, this method does not work for us.
    // NOTE 2: If any of the above distances aren't being used (shader that uses them is commented out), ensure
    // that the distance calculation is also commented out.
    
    // Ghost Layer Effects
	//     Matryoshka face effect
    //gl_FragColor = mix(vec4(0, 0, 0, 0), gl_FragColor, float(int(d1 * 100.0) % line_divisor == 0));
    //     Diagonal line effect
    //gl_FragColor = mix(vec4(0, 0, 0, 0), gl_FragColor, float(int((d2 - d1) * 100.0) % line_divisor == 0));
    //     Neat curve effect
    gl_FragColor = mix(vec4(0, 0, 0, 0), gl_FragColor, float(int(length(vec2(d1, d2)) * 100.0) % line_divisor == 0));
    
    // Static Module Effects
    gl_FragColor = mix(gl_FragColor, vec4(0, 0, 0, 1), border_extra * float(d1 * sin(d2 * PI) < 0.115 / float(line_divisor)));
    
    // Border Shaders
    //     Standard
    //gl_FragColor = mix(gl_FragColor, vec4(0, 0, 0, 1), float(d1 < 0.1 / float(line_divisor)));
    //     Thin Convex
    //gl_FragColor = mix(gl_FragColor, vec4(0, 0, 0, 1), float(d1 - 0.025 * sin(d2 * PI) < 0.01 / float(line_divisor)));
    //     Thick Convex
    //gl_FragColor = mix(gl_FragColor, vec4(0, 0, 0, 1), float(d1 - 0.025 * sin(d2 * PI) < 0.075 / float(line_divisor)));
    //     Ultra Thin Concave
    //gl_FragColor = mix(gl_FragColor, vec4(0, 0, 0, 1), float(d1 + 0.05 * sin(d2 * PI) < 0.075 / float(line_divisor)));
    //     Thin Concave
    //gl_FragColor = mix(gl_FragColor, vec4(0, 0, 0, 1), float(d1 + 0.025 * sin(d2 * PI) < 0.035 / float(line_divisor)));
    //     Thick Concave
    //gl_FragColor = mix(gl_FragColor, vec4(0, 0, 0, 1), float(d1 + 0.025 * sin(d2 * PI) < 0.075 / float(line_divisor)));
    //     Rounded
    gl_FragColor = mix(gl_FragColor, vec4(0, 0, 0, 1), float(d1 * sin(d2 * PI) < 0.025 / float(line_divisor)));
    //     Pen (Made for use with normalized coordinates)
    //gl_FragColor = mix(gl_FragColor, vec4(0, 0, 0, 1), float(d1 < (0.075 - 0.025 * sin(d2 * PI)) / float(line_divisor)));
    //     Strong Vertex
    //gl_FragColor = mix(gl_FragColor, vec4(0, 0, 0, 1), float(d1 + 0.1 * sin(d2 * PI) < 0.1 / float(line_divisor)));
}
`
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
