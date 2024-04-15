const chatbtn = document.getElementById('new_chat')
const recent = document.getElementById('recent')
const recent_title = document.getElementById('recent_title')
const chat_window = document.getElementById('chat_window')
const editor = document.getElementById('editor')
const send = document.getElementById('send')
chatbtn.addEventListener('click',e=>{
    const text = 'new chat'
    const new_div = document.createElement('div')
    new_div.innerHTML = `<div class="rchat h-10 rounded-3xl hover:bg-gray-700 transition p-2 m-2">
    <a href = "#">${text}</a>
   </div>`
   recent.appendChild(new_div)
})
editor.addEventListener('click',e=>{
    if(editor.childElementCount>0){
        send.disabled=false
        console.log(send.disabled)
    } 
})
const createChatButton = document.getElementById('create-chat-button');
const chatLinkContainer = document.getElementById('chat-link-container');
const loadingIndicator = document.getElementById('loading-indicator');
createChatButton.addEventListener('click', async () => {
  try {
    loadingIndicator.style.display = 'block'; // Show loading indicator
    const response = await fetch('/create-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}) // You can add data to the chat object if needed
    });
    const data = await response.json();
    if (data.chatLink) {
      const chatLink = document.createElement('a');
      chatLink.href = data
      chatLink.href = data.chatLink;
      chatLink.textContent = 'Join Chat';
      chatLinkContainer.textContent = '';
      chatLinkContainer.appendChild(chatLink);
      loadingIndicator.style.display = 'none'; // Hide loading indicator after success
          } else {
            alert('Error creating chat. Please try again.');
            loadingIndicator.style.display = 'none'; // Hide loading indicator after error
          }
        } catch (error) {
          console.error(error);
          alert('Error creating chat. Please try again.');
          loadingIndicator.style.display = 'none'; // Hide loading indicator after error
        }
      });


