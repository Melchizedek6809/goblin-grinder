#version 300 es

layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;
layout(location = 2) in vec2 a_uv;
layout(location = 3) in vec3 a_color;

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;
uniform mat4 u_lightSpaceMatrix;

out vec3 v_color;
out vec3 v_normal;
out vec3 v_worldPosition;
out vec2 v_uv;
out vec4 v_lightSpacePosition;

void main() {
    vec4 worldPosition = u_model * vec4(a_position, 1.0);
    v_worldPosition = worldPosition.xyz;
    v_normal = mat3(u_model) * a_normal;
    v_color = a_color;
    v_uv = a_uv;

    // Calculate light space position for shadow mapping
    v_lightSpacePosition = u_lightSpaceMatrix * worldPosition;

    gl_Position = u_projection * u_view * worldPosition;
}
