uniform vec3 uColor;
in vec2 uv;
uniform sampler2D tex;

void main()
{
	gl_FragColor = vec4(uColor, 1.0);
	gl_FragColor = texture(tex, uv);
}

    let _uColor = new THREE.Vector3(
        ((color & 0xFF0000) >> 16) / 255.0,
        ((color & 0x00FF00) >> 8) / 255.0,
        (color & 0x0000FF) / 255.0,
    )
    let material = new THREE.ShaderMaterial({
        uniforms: {
            uColor: { value: _uColor },
            uv: { value: geometry.uv },
        },
        fragmentShader: _fragmentShader,
        //lights: true,
    });

let cubeShader = await fetch('../resources/shaders/fshader_cube.glsl').then(response => response.text());
let rdShader = await fetch('../resources/shaders/fshader_rhombicdodecahedron.glsl').then(response => response.text());
//let vertexShader = await fetch('../resources/shaders/vertex_shader.glsl').then(response => response.text());
