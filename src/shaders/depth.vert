#version 300 es

in vec3 a_position;

uniform mat4 u_model;
uniform mat4 u_lightSpaceMatrix;

void main() {
    gl_Position = u_lightSpaceMatrix * u_model * vec4(a_position, 1.0);
}
