#version 330 core
in vec4 vertexColor;
in vec2 texCoord;
in vec4 worldPos;
in vec3 surfaceNorm;
out vec4 FragColor;
uniform sampler2D tex;
uniform vec2 iResolution;
uniform vec3 uColor;
uniform float uTime;
uniform vec3 baseSurfaceNorm;
uniform vec4 borderAttrs = vec4(0.0, 0.0, 0.0, 0.005); // [r, g, b, size]

#define WAVEGROWTH 1.5
#define WAVESPEED 0.62
#define WIDTH 0.001

#define fragCoord gl_FragCoord
#define fragColor FragColor

float Between(float low, float high, float val) {
	return step(low, val) - step(high, val);
}

float Rectangle(vec2 orig, vec2 wh, vec2 st) {
	float x = Between(orig.x, orig.x + wh.x, st.x);
	float y = Between(orig.y, orig.y + wh.y, st.y);
	return x*y;
}

float plot(vec2 st, float pct, float width){
  return  mix(smoothstep( pct-width, pct, st.y), 
              1.0 - smoothstep( pct, pct+width, st.y),
			  smoothstep(0.0, 0.3, (texCoord.y)/1.0));
}

void main()
{
	float incidentLight = 0.6;

	float borderMask = 1.0 - Rectangle(vec2(borderAttrs.w), vec2(1.0 - 2*borderAttrs.w), texCoord);
	float interiorMask = 1.0 - borderMask;
	vec3 borderColor = borderAttrs.xyz;
	vec3 border = borderMask * borderColor;

    vec3 interior = texture(tex, texCoord).xyz;
	interior = mix(uColor, interior, 0.3);
	interior *= incidentLight;
    interior *= interiorMask;

	FragColor = vec4(interior + border, 1.0);

	//FragColor = texture(tex, texCoord);
}