#version 300 es
precision highp float;
precision highp int;

in vec3 v_color;
in vec3 v_normal;
in vec3 v_worldPosition;
in vec2 v_uv;
in vec4 v_lightSpacePosition;

uniform sampler2D u_shadowMap;
uniform vec3 u_lightPosition;
uniform vec3 u_lightColor;

uniform sampler2D u_texture;
uniform bool u_useTexture;
uniform float u_time;
uniform sampler2D u_noiseTexture;

out vec4 fragColor;

// Sample cloud shadows from pre-computed noise texture
float cloudShadow(vec2 worldPos, float time) {
    // Animate cloud movement by scrolling UV coordinates (massive, very slow-moving clouds)
    vec2 cloudCoord = worldPos * 0.00125 + vec2(time * 0.001, time * 0.00075);

    // Single sample for performance
    float cloudPattern = texture(u_noiseTexture, cloudCoord).r;

    // Map to shadow intensity with sharper threshold for more clustered clouds
    return smoothstep(0.42, 0.58, cloudPattern);
}

float calculateShadow(vec4 lightSpacePos) {
    // Perspective divide
    vec3 projCoords = lightSpacePos.xyz / lightSpacePos.w;

    // Transform to [0,1] range
    projCoords = projCoords * 0.5 + 0.5;

    // Outside shadow map bounds = no shadow
    if (projCoords.z > 1.0 || projCoords.x < 0.0 || projCoords.x > 1.0 ||
        projCoords.y < 0.0 || projCoords.y > 1.0) {
        return 0.0;
    }

    float currentDepth = projCoords.z;
    float bias = 0.005;

    // PCF (Percentage Closer Filtering) for smooth shadow edges
    // Using 5-sample plus pattern for better performance (44% fewer samples than 3x3)
    float shadow = 0.0;
    vec2 texelSize = vec2(1.0) / vec2(1024.0); // Shadow map resolution

    // Plus-pattern PCF kernel: center + 4 cardinal directions
    vec2 offsets[5] = vec2[](
        vec2(0.0, 0.0),   // Center
        vec2(-1.0, 0.0),  // Left
        vec2(1.0, 0.0),   // Right
        vec2(0.0, -1.0),  // Down
        vec2(0.0, 1.0)    // Up
    );

    for(int i = 0; i < 5; i++) {
        vec2 offset = offsets[i] * texelSize;
        float closestDepth = texture(u_shadowMap, projCoords.xy + offset).r;
        shadow += currentDepth - bias > closestDepth ? 1.0 : 0.0;
    }

    // Average the 5 samples
    shadow /= 5.0;

    return shadow;
}

void main() {
    vec3 normal = normalize(v_normal);

    // Get base color from texture or vertex color
    vec3 color = u_useTexture ? texture(u_texture, v_uv).rgb : v_color;

    // Calculate cloud shadow
    float cloudShade = cloudShadow(v_worldPosition.xz, u_time);

    float ambient = 0.2;
    vec3 finalColor = color * ambient;

    // Calculate lighting from single light source
    vec3 lightDir = normalize(u_lightPosition - v_worldPosition);
    float diffuse = max(dot(normal, lightDir), 0.0);
    float shadow = calculateShadow(v_lightSpacePosition);
    finalColor += color * u_lightColor * diffuse * (1.0 - shadow * 0.8);

    // Apply cloud shadows (darken areas under clouds)
    finalColor *= mix(0.5, 1.0, cloudShade);

    fragColor = vec4(finalColor, 1.0);
}
