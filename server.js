const express = require('express')
const path = require('path')

const app = express()
let initial_path = __dirname
const port = process.env.PORT || 4000
app.use(express.static(initial_path))
app.get('/', (req, res) => {
    const chatId = uuid.v4();
    console.log(chatId)
    res.sendFile(path.join(initial_path, "index.html"));
  });
  app.get('/about',(req,res)=>{
    console.log(req)
  res.sendFile(path.join(initial_path,"about.html"))
  })
  app.get('/app',(req,res)=>{
    res.sendFile(path.join(initial_path,"chat.html"))
  })
  app.use((req,res)=>{
    res.send('404')
  })
  
  app.listen(port,()=>{
    console.log(`listening on Port ${port}`)
  })