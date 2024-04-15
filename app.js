
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
let path = document.querySelector('path')
let spanBefore = CSSRulePlugin.getRule('#hamburger span:before')
gsap.set(spanBefore,{background:'#000'})
gsap.set(".menu",{visibility:'hidden'})
function revealMenu(){
   revealMenuItems()
   const hamburger = document.getElementById('hamburger')
   const toggleBtn = document.getElementById('toggle-btn')
   toggleBtn.onclick = function(){
      hamburger.classList.toggle('active')
      gsaptl.reversed(!gsaptl.reversed())
      if(hamburger.className=='active'){
         document.body.style.overflowY='hidden'
      }else{
         document.body.style.overflowY='scroll'
      }
  
   }
   
  
}
revealMenu()
function revealMenuItems(){
   const start ='M0 502S175 272 500 272s500 230 500 230V0H0Z'
   const end ='M0,1005S175,995,500,995s500,5,500,5V0H0Z'
   gsaptl.to(spanBefore,1,{
    background:'#e2e2dc',
    ease:'power2.inOut'
   },'<')
   gsaptl.to(path,0.4,{
    attr:{
       d: end,
    },
    ease:Power2.easeIn,
   },"<").to(path,0.4,{
    attr:{
       d:start
    },
    ease:Power2.easeIn
   },'-0.5')
   gsaptl.to('.menu',1,{
      visibility:'visible',
   },'-=0.5')
   gsaptl.to('.menu-item > a',1,{
    top:0,
    ease:'power3.out',
    stagger:{
       amount:0.5
    }
   },'-=1').reverse()
}

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
const createChatBtn = document.getElementById('create-chat-btn');
const chatLinkDiv = document.getElementById('chat-link');

createChatBtn.addEventListener('click', async () => {
  try {
    const response = await fetch('/new-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();

    if (data.chatId && data.chatLink) {
      chatLinkDiv.innerText = `Your chat link: ${data.chatLink}`;
    } else {
      chatLinkDiv.innerText = 'Error creating chat';
    }
  } catch (error) {
    console.error(error);
    chatLinkDiv.innerText = 'Error creating chat';
  }
});