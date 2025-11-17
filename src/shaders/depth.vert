#version 300 es

layout(location = 0) in vec3 a_position;
layout(location = 2) in vec2 a_uv;

uniform mat4 u_model;
uniform mat4 u_lightSpaceMatrix;
uniform float u_time;

void main() {
    // Only sway texels in the bottom quarter of the atlas (uv.y < 0.25)
    float leafMask = 1.0 - smoothstep(0.23, 0.27, a_uv.y);

    // Stronger sway near the top of the mesh
    float heightFactor = smoothstep(0.0, 1.5, a_position.y);

    vec3 localPosition = a_position;
    float basePhase = u_time * 1.2 + dot(localPosition.xz, vec2(0.35, 0.55));
    float gustPhase = u_time * 0.35 + dot(localPosition.xz, vec2(0.2, -0.15));
    float swayAmount =
        (sin(basePhase) * 0.07 +
         sin(gustPhase) * 0.03) *
        leafMask *
        (0.4 + 0.6 * heightFactor);

    swayAmount +=
        (sin(localPosition.x * 0.8 - u_time * 0.6) +
         sin(localPosition.z * 0.7 + u_time * 0.8)) *
        0.015 *
        leafMask;

    vec2 windDirection = normalize(vec2(0.65, 1.0));
    float bend = swayAmount * (0.2 + 0.8 * heightFactor * heightFactor);
    localPosition.xz += windDirection * bend;
    localPosition.y += bend * 0.12;

    gl_Position = u_lightSpaceMatrix * u_model * vec4(localPosition, 1.0);
}
