#version 300 es
precision highp float;

in vec4 v_color;

out vec4 fragColor;

void main() {
    // Calculate distance from center of point
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);

    // Discard pixels outside circle (creates round particles)
    if (dist > 0.5) {
        discard;
    }

    // Soft edge falloff
    float alpha = v_color.a * (1.0 - smoothstep(0.3, 0.5, dist));

    fragColor = vec4(v_color.rgb, alpha);
}
