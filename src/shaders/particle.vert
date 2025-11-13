#version 300 es

// Per-instance attributes
in vec3 a_position;  // Particle position
in vec4 a_color;     // Particle color with alpha
in float a_size;     // Particle size

out vec4 v_color;

uniform mat4 u_view;
uniform mat4 u_projection;

void main() {
    v_color = a_color;

    // Transform particle position to clip space
    vec4 viewPos = u_view * vec4(a_position, 1.0);
    gl_Position = u_projection * viewPos;

    // Set point size (size in pixels)
    gl_PointSize = a_size;
}
