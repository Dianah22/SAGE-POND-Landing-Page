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
    new THREE.Vector3(0.9647, 0.5176, 0.4039),//#F68467
    new THREE.Vector3(0.6118, 0.7490, 0.9451), // 9CBFF1
    new THREE.Vector3(0.7294, 0.1608, 0.7843), // BA29C8
    new THREE.Vector3(1.0, 0.2, 0.2392), // #FF333D
    new THREE.Vector3(0.6902, 0.3922, 0.8667),//B064DD
   // new THREE.Vector3(0.9216, 0.3843, 0.4667)//EB6277
  ];

  const material = new THREE.ShaderMaterial({
    vertexShader: vertexShaderSource,
    fragmentShader: fragmentShaderSource,
    uniforms: {
      uTime: { value: 0.0 },
      uScrollProgress: { value: 0.0 },
      uColourPalette: { value: colourPalette },
      uUvScale: { value: 1.0 },
      uUvDistortionIterations: { value: 2.0 },
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
    material.uniforms.uTime.value = elapsedTime * 0.47;
    renderer.render(scene, camera);
  }

  animate();
});

// Window Resize Handling
