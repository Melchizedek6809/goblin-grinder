#version 300 es
precision highp float;

in vec3 v_color;
in vec3 v_normal;
in vec3 v_worldPosition;
in vec2 v_uv;
in vec4 v_lightSpacePositions[4];

uniform sampler2D u_shadowMaps[4];
uniform vec3 u_lightPositions[4];
uniform vec3 u_lightColors[4];
uniform int u_numLights;

uniform sampler2D u_texture;
uniform bool u_useTexture;

out vec4 fragColor;

float calculateShadow(vec4 lightSpacePos, int lightIndex) {
    // Perspective divide
    vec3 projCoords = lightSpacePos.xyz / lightSpacePos.w;

    // Transform to [0,1] range
    projCoords = projCoords * 0.5 + 0.5;

    // Outside shadow map bounds = no shadow
    if (projCoords.z > 1.0 || projCoords.x < 0.0 || projCoords.x > 1.0 ||
        projCoords.y < 0.0 || projCoords.y > 1.0) {
        return 0.0;
    }

    // Get depth from shadow map - must use constant index
    float closestDepth = 0.0;
    if (lightIndex == 0) closestDepth = texture(u_shadowMaps[0], projCoords.xy).r;
    else if (lightIndex == 1) closestDepth = texture(u_shadowMaps[1], projCoords.xy).r;
    else if (lightIndex == 2) closestDepth = texture(u_shadowMaps[2], projCoords.xy).r;
    else if (lightIndex == 3) closestDepth = texture(u_shadowMaps[3], projCoords.xy).r;

    float currentDepth = projCoords.z;

    // Shadow bias to prevent shadow acne
    float bias = 0.005;
    float shadow = currentDepth - bias > closestDepth ? 1.0 : 0.0;

    return shadow;
}

void main() {
    vec3 normal = normalize(v_normal);

    // Get base color from texture or vertex color
    vec3 color = u_useTexture ? texture(u_texture, v_uv).rgb : v_color;

    float ambient = 0.2;
    vec3 finalColor = color * ambient;

    // Calculate contribution from each light (unrolled to allow constant sampler indexing)
    if (u_numLights > 0) {
        vec3 lightDir = normalize(u_lightPositions[0] - v_worldPosition);
        float diffuse = max(dot(normal, lightDir), 0.0);
        float shadow = calculateShadow(v_lightSpacePositions[0], 0);
        finalColor += color * u_lightColors[0] * diffuse * (1.0 - shadow * 0.8);
    }

    if (u_numLights > 1) {
        vec3 lightDir = normalize(u_lightPositions[1] - v_worldPosition);
        float diffuse = max(dot(normal, lightDir), 0.0);
        float shadow = calculateShadow(v_lightSpacePositions[1], 1);
        finalColor += color * u_lightColors[1] * diffuse * (1.0 - shadow * 0.8);
    }

    if (u_numLights > 2) {
        vec3 lightDir = normalize(u_lightPositions[2] - v_worldPosition);
        float diffuse = max(dot(normal, lightDir), 0.0);
        float shadow = calculateShadow(v_lightSpacePositions[2], 2);
        finalColor += color * u_lightColors[2] * diffuse * (1.0 - shadow * 0.8);
    }

    if (u_numLights > 3) {
        vec3 lightDir = normalize(u_lightPositions[3] - v_worldPosition);
        float diffuse = max(dot(normal, lightDir), 0.0);
        float shadow = calculateShadow(v_lightSpacePositions[3], 3);
        finalColor += color * u_lightColors[3] * diffuse * (1.0 - shadow * 0.8);
    }

    fragColor = vec4(finalColor, 1.0);
}
