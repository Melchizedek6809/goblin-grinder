#version 300 es

in vec3 a_position;
in vec3 a_normal;
in vec2 a_uv;
in vec3 a_color;
in vec4 a_joints;  // Joint indices
in vec4 a_weights; // Joint weights

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;
uniform mat4 u_lightSpaceMatrix;
uniform mat4 u_jointMatrices[64]; // Max 64 bones

out vec3 v_color;
out vec3 v_normal;
out vec3 v_worldPosition;
out vec2 v_uv;
out vec4 v_lightSpacePosition;

void main() {
    // Calculate skinning matrix
    mat4 skinMatrix =
        a_weights.x * u_jointMatrices[int(a_joints.x)] +
        a_weights.y * u_jointMatrices[int(a_joints.y)] +
        a_weights.z * u_jointMatrices[int(a_joints.z)] +
        a_weights.w * u_jointMatrices[int(a_joints.w)];

    // Apply skinning to position
    vec4 skinnedPosition = skinMatrix * vec4(a_position, 1.0);

    // Apply skinning to normal (use mat3 to ignore translation)
    vec3 skinnedNormal = mat3(skinMatrix) * a_normal;

    // Transform to world space
    vec4 worldPosition = u_model * skinnedPosition;
    v_worldPosition = worldPosition.xyz;
    v_normal = mat3(u_model) * skinnedNormal;

    // Pass through other attributes
    v_color = a_color;
    v_uv = a_uv;

    // Calculate light space position for shadow mapping
    v_lightSpacePosition = u_lightSpaceMatrix * worldPosition;

    // Final position
    gl_Position = u_projection * u_view * worldPosition;
}
