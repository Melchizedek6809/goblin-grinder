#version 300 es

layout(location = 0) in vec3 a_position;
layout(location = 4) in vec4 a_joints;
layout(location = 5) in vec4 a_weights;

uniform mat4 u_model;
uniform mat4 u_lightSpaceMatrix;
uniform mat4 u_jointMatrices[64];

void main() {
    mat4 skinMatrix =
        a_weights.x * u_jointMatrices[int(a_joints.x)] +
        a_weights.y * u_jointMatrices[int(a_joints.y)] +
        a_weights.z * u_jointMatrices[int(a_joints.z)] +
        a_weights.w * u_jointMatrices[int(a_joints.w)];

    vec4 skinnedPosition = skinMatrix * vec4(a_position, 1.0);
    vec4 worldPosition = u_model * skinnedPosition;
    gl_Position = u_lightSpaceMatrix * worldPosition;
}
