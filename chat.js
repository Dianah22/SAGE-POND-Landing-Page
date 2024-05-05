const chatbtn = document.getElementById('new_chat')
const recent = document.getElementById('recent' )
const recent_title = document.getElementById('recent_title')
const chat_window = document.getElementById('chat_window')
const editor = document.getElementById('editor')
const send = document.getElementById('send')
const query_div = document.querySelector('.query')
const menuBtn = document.querySelector('.menuButton')
const content = document.querySelector('.chatarea')
const nav = document.querySelector('.nav')
const side_btn = document.querySelector('.side-button')
const side_b = document.querySelector('.side-b')
const chat_history = document.querySelector('.chat_history')
const recents = document.querySelector('.recent')
const history = document.querySelector('.chat_history')
const welcome_screen = document.querySelector('.welcome_screen')
send.disabled = true
editor.addEventListener('input',e=>{
    const content = editor.textContent.trim(); // Get the text content and trim any whitespace
    e.preventDefault()
        if (content.length > 0) {
            send.disabled=false;
        }else{
          send.disabled=true
        }
})
let clickCount = 0;
send.addEventListener('click',e=>{
  clickCount++
    const message = editor.textContent
    if(clickCount==1){
      fetchCreateChat(sanitizeInput(message))
    }else{
      msend(sanitizeInput(message))
    }
})
const msend = async(message)=>{
  const chatId = window.location.pathname.split('/')[2]
  try{
    const response = await fetch('/send-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({message,chatId}) 
  });
  const data = await response.json();
  if (data.success) {
    const pdiv=document.createElement('div')
    pdiv.innerHTML
     = `<div class="user_query h-[100px]">
    <div class="image-container">
      <img src="images/caleb.jpg" class="w-10 rounded-full">
    </div>
    <div class="info text-ellipsis text-xl">
      <h2>${sanitizeInput(editor.textContent)}</h2>
    </div>`
    query_div.classList.remove('hidden')
    query_div.classList.add('flex')
    history.classList.add('hidden')
    query_div.appendChild(pdiv)
    editor.innerHTML='' 
  } else {
    console.error('Error sending message:', data.error);
  }
  }catch(e){
    console.log(e)
  }
  
}
editor.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevent default behavior (line break)
        document.execCommand('insertHTML', false, '<p><br></p>'); // Insert a paragraph
    }
});
    const placeholder = editor.dataset.placeholder;
    // Set the initial content to the placeholder value
    editor.textContent = placeholder;
    // Add a class when the div is focused to mimic the placeholder behavior
    editor.addEventListener('focus', function() {
        if (editor.textContent === placeholder) {
            editor.textContent = '';
        }
    });

    editor.addEventListener('blur', function() {
        if (editor.textContent === '') {
            editor.textContent = placeholder;
        }
    });
    // Toggle menu visibility when menu button is clicked
    let isMenuOpen = false;
    menuBtn.addEventListener('click', toggleMenu);
    function toggleMenu() {
      const calc = 100-25
      if (!isMenuOpen && window.innerWidth>768) {
        gsap.to(nav, { duration: 0.3, ease: "power3.inOut", x:"0%" });
        gsap.to(content,{duration:0.3,ease:'power3.inOut',left:"25%",width:`${calc}%`})
        gsap.to(side_b,{duration:0.3,ease:'power2.inOut',width:'100%'})
        gsap.to(side_btn,{duration:0.3,ease:'power2.inOut',width:'100%'})
        gsap.to(recents,{duration:0.3,ease:'power2.inOut',width:'50%'})
      } else if (isMenuOpen==true && window.innerWidth>768){
        gsap.to(nav, { duration: 0.3, ease: "power3.inOut", width: "50%" })
        gsap.to(side_b,{duration:0.3,ease:'Power3.inOut',width:'45px'})
        gsap.to(content,{duration:0.3,ease:'power3.inOut',left:"5%",width:'95%'})
        gsap.to(recents,{duration:0.3,ease:'power2.inOut',width:'25%'})
      } else if(window.innerWidth<=768 && isMenuOpen==true){
        gsap.to(side_btn,{duration:0.1,ease:'power2.inOut',width:'0%',display:'none',opacity:'0'})
        gsap.to(content,{duration:0.2,left:"0%",width:'100%'})
        gsap.to(nav, { duration: 0.3, ease: "power3.inOut", width: "0%" })
        gsap.to(recents,{duration:0.05,ease:'power2.inOut',width:'0%'})
      } else if(window.innerWidth<=768 && isMenuOpen==false){
        gsap.to(nav, { duration: 0.3, ease: "power3.inOut", width:"70%" });
        gsap.to(content,{duration:0.3,ease:'power3.inOut',left:"0%",width:`100%`})
        gsap.to(side_btn,{duration:0.2,ease:'power2.inOut',width:'100%',display:'grid',opacity:'1'})
        gsap.to(recents,{duration:0.3,ease:'power2.inOut',width:'100%'})
      }
      isMenuOpen = !isMenuOpen;
     
    }
    function sanitizeInput(userInput) {
      const allowedTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6','b','em','i']; // Adjust as needed
      const allowedAttributes = ['class', 'style']; // Optional: Allow specific attributes
    
      const config = {
        ALLOWED_TAGS: allowedTags,
        ALLOWED_ATTR: allowedAttributes // Optional: If allowing attributes
      };
    
      return DOMPurify.sanitize(userInput, config);
    }
    window.addEventListener('load', function() {
      if (window.innerWidth > 768) {
        isMenuOpen = true; // Set menu as open for larger screens
      }
    });
      const fetchCreateChat = async (message) => {
        clickCount++
        try {
            const response = await fetch('/create-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({message}) // You can add data to the chat object if needed
            });
            const data = await response.json();
              if (data.chatId) {
                const text = 'new chat';
                const new_div = document.createElement('div');
                new_div.innerHTML = `<div class="rchat h-10 rounded-3xl hover:bg-gray-700 transition p-2 m-2 flex">
                <span class="material-symbols-outlined">
chat_bubble
</span>
                    <button data-chat-id=${data.chatId}>${text}</button>
                    <div class='menu h-[24px] w-[24px] pt-[5px]'>
                    
                    </div
                </div>`;
                recent.appendChild(new_div);
                const chatDetailsResponse = await fetch(`/app/${data.chatId}`);
                const chatDetails = await chatDetailsResponse.json();
                console.log("Chat details:", chatDetails);
                const newUrl = `app/${data.chatId}`;
                window.history.pushState({}, 'Unveyl', newUrl);
            }else {
              alert('Error creating chat. Please try again.');
          }
        } catch (error) {
            console.error(error);
            alert('Error creating chat. Please try again.');
        }
    };
recents.addEventListener('click',async (e)=>{
  const chatItem = e.target;
  const chatId = chatItem.dataset.chatId;
  if(chatId){
    const chatDetailsResponse = await fetch(`/app/${chatId}`);
    const chatDetails = await chatDetailsResponse.json();
    console.log("Chat details:", chatDetails.messages);
    chatDetails.messages.forEach(message=>{
      const x =  document.createElement('div')
      welcome_screen.style.display='none'
      x.innerHTML=`<div class="user_query h-[100px]">
    <div class="image-container">
      <img src="images/caleb.jpg" class="w-10 rounded-full">
    </div>
    <div class="info text-ellipsis text-xl">
      <h2>${message.content}</h2>
    </div>`
    history.appendChild(x)
    })
    const newUrl = `app/${chatId}`;
    window.history.pushState({}, 'Unveyl', newUrl);
  }else{
  
  }
})
   async function fetchData() {
    try {
        const response = await fetch('/app/5800e6037eb1f8b5');
        const data = await response.json();
        console.log(data.messages);
        // Update the DOM or use the data in your frontend application
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

fetchData()
    const renderChatMessages = (messages) => {
      chat_window.innerHTML = '';
      messages.forEach(message => {
        chat_window += `
        <div class="user_query h-[100px]">
        <div class="image-container">
          <img src="images/caleb.jpg" class="w-10 rounded-full">
        </div>
        <div class="info text-ellipsis text-xl">
          <h2>${message}</h2>
        </div>
        `;
      });
      chat_window.innerHTML = chatWindowContent;
    };
      const fetchChatIds = async () => {
        const response = await fetch('/chatIds', {
            method: 'POST'
        });
        if (response.ok) {
            const data = await response.json();
            const text = 'new chat';
            data.chatIds.forEach(item => {
                const di = document.createElement("div");
                di.innerHTML = `<div class="rchat h-10 rounded-3xl hover:bg-gray-700 transition p-2 m-2">
                <button data-chat-id=${item}>${text}</button>
                </div>`;
                recent.append(di);
            });
        } else {
            console.error('Error fetching chat IDs:', response.statusText);
            // Handle errors
        }
    };
window.addEventListener('load',fetchChatIds)
window.addEventListener('load',e=>{
  if(window.innerWidth<=768){
    isMenuOpen=false
    nav.style.width='0%'
    content.style.width='100%'
    content.style.left='0%'
    side_btn.style.display='none'
  }
})