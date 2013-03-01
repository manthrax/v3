SCRIPT='TNDVS';

attribute vec4 position;
attribute vec3 normal;
attribute vec2 texCoord;

uniform mat4 worldViewProjection;
uniform mat4 world;
uniform mat4 view;
uniform mat4 projection;
uniform mat4 worldInverse;
uniform mat4 viewInverse;
uniform mat4 worldInverseTranspose;

varying vec4 v_position;
varying vec2 v_texCoord;
varying vec3 v_normal;

void main() {
    v_texCoord = texCoord;
    v_position = position;
    v_normal =  (worldInverseTranspose * vec4(normal, 0)).xyz;
    gl_Position = worldViewProjection * position;
}

SCRIPT='TNDFS';

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D diffuseSampler;
varying vec3 v_normal;
varying vec4 v_position;
varying vec2 v_texCoord;

void main() {
    vec4 diffuse = texture2D(diffuseSampler, v_texCoord);
    vec3 normal = normalize(v_normal);
    gl_FragColor.rbg = diffuse.rbg;//v_normal;//diffuse*normal.y;
}

SCRIPT='windVS';

LINK='noise3D';

attribute vec4 position;
attribute vec3 normal;
attribute vec2 texCoord;

uniform mat4 worldViewProjection;
uniform mat4 world;
uniform mat4 view;
uniform mat4 projection;
uniform mat4 worldInverse;
uniform mat4 viewInverse;
uniform mat4 worldInverseTranspose;
uniform float seconds;

varying vec4 v_position;
varying vec2 v_texCoord;
varying vec3 v_normal;

void main() {
    v_texCoord = texCoord;
    v_position = position;
    v_normal =  (worldInverseTranspose * vec4(normal, 0)).xyz;
	
    gl_Position = worldViewProjection * position;
	
	vec3 wpos=(world*position).xyz*0.001;
	wpos.y+=seconds*0.5;
	float nv=snoise(wpos);
	//if(nv>0.5)nv*=2.0;
	gl_Position.y += nv*140.0;
}

SCRIPT='windFS';

//float rand(vec2 co){
//    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
//}

#ifdef GL_ES
precision highp float;
#endif

uniform sampler2D diffuseSampler;
varying vec3 v_normal;
varying vec4 v_position;
varying vec2 v_texCoord;

void main() {
    vec4 diffuse = texture2D(diffuseSampler, v_texCoord);
    vec3 normal = normalize(v_normal);
    gl_FragColor.rbg = diffuse.rbg;//v_normal;//diffuse*normal.y;
}

SCRIPT='endScripts';

