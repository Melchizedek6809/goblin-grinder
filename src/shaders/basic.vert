#version 300 es

in vec3 a_position;
in vec3 a_normal;
in vec2 a_uv;
in vec3 a_color;

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;
uniform mat4 u_lightSpaceMatrices[4];

out vec3 v_color;
out vec3 v_normal;
out vec3 v_worldPosition;
out vec2 v_uv;
out vec4 v_lightSpacePositions[4];

void main() {
    vec4 worldPosition = u_model * vec4(a_position, 1.0);
    v_worldPosition = worldPosition.xyz;
    v_normal = mat3(u_model) * a_normal;
    v_color = a_color;
    v_uv = a_uv;

    // Calculate light space positions for each light
    for (int i = 0; i < 4; i++) {
        v_lightSpacePositions[i] = u_lightSpaceMatrices[i] * worldPosition;
    }

    gl_Position = u_projection * u_view * worldPosition;
}
