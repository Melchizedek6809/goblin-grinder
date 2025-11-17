#version 300 es

layout(location = 0) in vec3 a_position;
layout(location = 1) in vec3 a_normal;
layout(location = 2) in vec2 a_uv;
layout(location = 3) in vec3 a_color;

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;
uniform mat4 u_lightSpaceMatrix;
uniform float u_time;

out vec3 v_color;
out vec3 v_normal;
out vec3 v_worldPosition;
out vec2 v_uv;
out vec4 v_lightSpacePosition;

void main() {
    // Only sway texels in the bottom quarter of the atlas (uv.y < 0.25)
    float leafMask = 1.0 - smoothstep(0.23, 0.27, a_uv.y);

    // Stronger sway near the top of the mesh
    float heightFactor = smoothstep(0.0, 1.5, a_position.y);

    // Create gentle, directional sway using position-based phase
    vec3 localPosition = a_position;
    float basePhase = u_time * 1.2 + dot(localPosition.xz, vec2(0.35, 0.55));
    float gustPhase = u_time * 0.35 + dot(localPosition.xz, vec2(0.2, -0.15));
    float swayAmount =
        (sin(basePhase) * 0.07 +
         sin(gustPhase) * 0.03) *
        leafMask *
        (0.4 + 0.6 * heightFactor);

    // Add subtle positional variation to break uniformity without blobbing
    swayAmount +=
        (sin(localPosition.x * 0.8 - u_time * 0.6) +
         sin(localPosition.z * 0.7 + u_time * 0.8)) *
        0.015 *
        leafMask;

    // Push leaves sideways with slight lift; stronger near the top (bend-like)
    vec2 windDirection = normalize(vec2(0.65, 1.0));
    float bend = swayAmount * (0.2 + 0.8 * heightFactor * heightFactor);
    localPosition.xz += windDirection * bend;
    localPosition.y += bend * 0.12;

    vec4 worldPosition = u_model * vec4(localPosition, 1.0);
    v_worldPosition = worldPosition.xyz;
    v_normal = mat3(u_model) * a_normal;
    v_color = a_color;
    v_uv = a_uv;

    // Calculate light space position for shadow mapping
    v_lightSpacePosition = u_lightSpaceMatrix * worldPosition;

    gl_Position = u_projection * u_view * worldPosition;
}
