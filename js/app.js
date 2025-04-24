// DOM
const navbar = document.querySelector('#nav');
const mobo_cont = document.querySelector(".mobo-container");

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
renderer.setSize(window.innerWidth, window.innerHeight);
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
    new THREE.Vector3(0.95, 0.2, 0.2),
    new THREE.Vector3(0.2, 0.95, 0.2),
    new THREE.Vector3(0.2, 0.2, 0.95),
    new THREE.Vector3(0.95, 0.95, 0.2)
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
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
});
