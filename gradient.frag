precision mediump float;

uniform float uTime;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  uv.y += uTime * 0.05;

  vec3 color1 = vec3(0.2, 0.0, 0.4);
  vec3 color2 = vec3(0.0, 0.8, 1.0);
  vec3 color = mix(color1, color2, uv.y);

  gl_FragColor = vec4(color, 1.0);
}
