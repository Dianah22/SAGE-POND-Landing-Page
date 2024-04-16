
const hamburger = document.querySelector('.hamburger')
const list = document.querySelector(".mobo-links ul li")
const navbar = document.querySelector('#nav')
const mobo_cont = document.querySelector(".mobo-container")
window.addEventListener('scroll',e=>{
   var nav = navbar.offsetTop
   if(nav<=window.pageYOffset){
      navbar.classList.add("sticky")
   }
   else{
      navbar.classList.remove('sticky')
   }
})
function  delay(n){
   n=n||2000;
   return new Promise((done)=>{
      setTimeout(()=>{
         done();
      },n)
   })
}
const gsaptl = gsap.timeline({paused:true})
document.addEventListener('DOMContentLoaded',e=>{
   gsap.set('.img',{y:1000})
   gsap.set('.loader-imgs',{x:500})
   gsap.set('.nav-item',{y:25,opacity:0})
   gsap.set('h1,.item',{y:200})
   const tl =gsap.timeline({delay:1})
   tl.to('.img',{
      y:0,
      duration:1.5,
      stagger:0.05,
      ease:'power3.inOut'
   }).to('.loader-imgs',{
      x:0,
      duration:3,
      ease:'power3.inOut'
   },"-=2.5")
   .to('.img:not(#loader-logo)',{
      clipPath:'polygon(0% 0%, 100% 0%,100% 0%,0% 0%)',
      duration:1,
      stagger:0.1,
      ease:'power3.inOut'
   })
   .to('.loader',{
      clipPath:'polygon(0% 0%, 100% 0%,100% 0%,0% 0%)',
      duration:1,
      ease:'power3.inOut'
   },"-=0.5")
   .to('.nav-item, h1,.item',{
      y:0,
      opacity:1,
      duration:1,
      stagger:0.1,
      ease:'power3.inOut'
   },'-=0.5')
})
function setup(){
   let radius = wheel.offsetWidth/2
   let center = wheel.offsetWidth/2
   let total = images.length
   let slice = (2* Math.PI)/total
   images.forEach((item,i)=>{
      let angle = i * slice
      let x = center * radius * Math.sin(angle)
      let y = center * radius * Math.cos(angle)
      gsap.set(item,{
         rotation:angle + '-rad',
         xPercent:-50,
         yPercent:-50,
         x:x,
         y:y
      })
   })
}
const handleOnMouseMOve =e=>{
   const {currentTarget:target} = e;
   const rect = target.getBoundingClientRect();
   x=e.clientX-rect.left
   y=e.clientY-rect.top
   target.style.setProperty('--mouse-x',`${x}px`)
   target.style.setProperty('--mouse-y',`${y}px`)
}
for(const card of document.querySelectorAll('.card')){
   card.onmousemove = e => handleOnMouseMOve(e)
}
const letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ'
document.querySelector('.team').onmouseover = e=>{
   let iterations =0
const interval=setInterval(()=>{
   e.target.innerText = e.target.innerText.split('')
   .map((letter,index)=>{
      if(index<iterations){
         return e.target.dataset.value[index]
      }
      return letters[Math.floor(Math.random()*26)]
})
   .join('')
 if(iterations>=e.target.dataset.value.length) clearInterval(interval)
iterations+=1/2
},30)
}
