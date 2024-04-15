const chatbtn = document.getElementById('new_chat')
const recent = document.getElementById('recent' )
const recent_title = document.getElementById('recent_title')
const chat_window = document.getElementById('chat_window')
const editor = document.getElementById('editor')
const send = document.getElementById('send')

editor.addEventListener('click',e=>{
    if(editor.childElementCount>0){
        send.disabled=false
    }   
})
const chatLinkContainer = document.getElementById('chat-link-container');
const loadingIndicator = document.getElementById('loading-indicator');
chatbtn.addEventListener('click', async () => {
  try {
    const response = await fetch('/create-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}) // You can add data to the chat object if needed
    });
    const data = await response.json();
    if (data.chatLink) {
      const text = 'new chat'

      const new_div = document.createElement('div')
      new_div.innerHTML = `<div class="rchat h-10 rounded-3xl hover:bg-gray-700 transition p-2 m-2">
       <a href ='${data.chatLink}'>${text}</a>
       </div>`
   recent.appendChild(new_div)
          } else {
            alert('Error creating chat. Please try again.');
          }
        } catch (error) {
          console.error(error);
          alert('Error creating chat. Please try again.');
        }
      });


