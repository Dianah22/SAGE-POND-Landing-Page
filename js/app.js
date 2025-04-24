// DOM
const navbar = document.querySelector('#nav');
const mobo_cont = document.querySelector(".mobo-container");
const heroSection = document.querySelector(".hero");

// Sticky Nav Scroll Event
window.addEventListener('scroll', () => {
  var nav = navbar.offsetTop;
  if (nav < window.pageYOffset) {
    navbar.classList.add("sticky");
  }
});

// Three.js Setup: Scene, Camera, Renderer
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setClearColor(0x1E2A78, 1)
// Set initial size
function updateCanvasSize() {
  const heroHeight = heroSection.offsetHeight;
  renderer.setSize(window.innerWidth, '600');
}

updateCanvasSize();
document.body.appendChild(renderer.domElement);

// Clock
const clock = new THREE.Clock();

// Shader Loader
Promise.all([
  fetch('gradient.vert').then(res => res.text()),
  fetch('output.frag').then(res => res.text())
]).then(([vertexShaderSource, fragmentShaderSource]) => {

  // Uniform values
  const colourPalette = [
    new THREE.Vector3(0.117, 0.164, 0.471), // Deep Blue
    new THREE.Vector3(0.0, 0.784, 1.0),     // Cyan
    new THREE.Vector3(0.631, 0.619, 1.0),   // Soft Purple
    new THREE.Vector3(0.518, 0.953, 0.816), // Pale Teal
    new THREE.Vector3(0.659, 0.333, 0.969), // Purple
    new THREE.Vector3(0.980, 0.800, 0.082), // Yellow
    new THREE.Vector3(0.231, 0.510, 0.965), // Bright Blue
    new THREE.Vector3(0.937, 0.267, 0.267)  // Soft Red
  ];

  const material = new THREE.ShaderMaterial({
    vertexShader: vertexShaderSource,
    fragmentShader: fragmentShaderSource,
    uniforms: {
      uTime: { value: 0.0 },
      uScrollProgress: { value: 0.0 },
      uColourPalette: { value: colourPalette },
      uUvScale: { value: 1.0 },
      uUvDistortionIterations: { value: 4.0 },
      uUvDistortionIntensity: { value: 0.2 }
    }
  });

  // Fullscreen Quad Geometry
  const geometry = new THREE.PlaneGeometry(2, 2);
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // Update resize handler
  window.addEventListener('resize', () => {
    updateCanvasSize();
  });

  // Animate Loop
  function animate() {
    requestAnimationFrame(animate);

    const elapsedTime = clock.getElapsedTime();

    // Update uniforms
    material.uniforms.uTime.value = elapsedTime;
    material.uniforms.uScrollProgress.value = window.scrollY / (document.body.scrollHeight - window.innerHeight);

    renderer.render(scene, camera);
  }

  animate();
});

// Window Resize Handling
