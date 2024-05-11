
const navbar = document.querySelector('#nav')
const mobo_cont = document.querySelector(".mobo-container")
window.addEventListener('scroll',e=>{
   var nav = navbar.offsetTop
   if(nav<window.pageYOffset){
      navbar.classList.add("sticky")
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
  
})
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
