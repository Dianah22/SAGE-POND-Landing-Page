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
const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
});
renderer.setClearColor(0x1E2A78, 1);

// Set initial size and handle resizing
function updateCanvasSize() {
    // Get the viewport width
    const width = window.innerWidth;
    const height = 600; // Fixed height of 600px
    
    // Set renderer size
    renderer.setSize(width, height);
    
    // Set renderer pixel ratio for better mobile display
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Position the canvas
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '600px';
    renderer.domElement.style.zIndex = '-1';
    renderer.domElement.style.pointerEvents = 'none';
}

// Initial setup
updateCanvasSize();
document.body.insertBefore(renderer.domElement, document.body.firstChild);

// Add resize listener
window.addEventListener('resize', () => {
    updateCanvasSize();
}, false);

// Add orientation change listener for mobile
window.addEventListener('orientationchange', () => {
    setTimeout(updateCanvasSize, 100);
});

// Clock
const clock = new THREE.Clock();

// Shader Loader
Promise.all([
  fetch('gradient.vert').then(res => res.text()),
  fetch('output.frag').then(res => res.text())
]).then(([vertexShaderSource, fragmentShaderSource]) => {

  // Uniform values
  const colourPalette = [
    new THREE.Vector3(0.65, 0.25, 0.75), // purple-pink
    new THREE.Vector3(0.25, 0.65, 0.85), // cyan-blue
    new THREE.Vector3(0.95, 0.75, 0.35), // warm yellow
    new THREE.Vector3(0.85, 0.45, 0.95)  // magenta
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
    material.uniforms.uTime.value = elapsedTime * 0.45;
    renderer.render(scene, camera);
  }

  animate();
});
gsap.registerPlugin(ScrollTrigger);
const unveyl = document.getElementById('unveyl')
gsap.to(unveyl, {
  scrollTrigger: {
    trigger: '.herod',
     start:"top 30%",
    scrub:2,
    pin: '.herod', 
    toggleActions: "restart pause reverse pause",  
  },
  x: -1900,
  duration: 3.2
});