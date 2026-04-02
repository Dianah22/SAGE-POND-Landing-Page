const background = document.getElementById('background');
const screenSize = window.screen.width;
if (screenSize >= 1350) {
  background.src = 'images/1440p.svg';
} else if (screenSize >= 1728) {
  background.src = 'images/1728.svg';
} else if (screenSize >= 1152) {
  background.src = 'images/1152.svg';
} else if (screenSize >= 3280) {
  background.src = 'images/4k.svg';
} else if (screenSize >= 320) {
  background.src = 'images/768p.svg';
}