const express = require('express');
const axios = require('axios');
const { text } = require('body-parser');
const WEBHOOK_VERIFY_TOKEN = 'verify-token-sarfraz'; // Replace with your actual verify token
const WHATSAPP_ACCESS_TOKEN = 'EAAR24Vj8ZAzUBPKyFaHorR6gUTZAa5iyzCr0ZBYmJGjdLwBgu3xZBm0QdCrFO4XG079gXo9TOaNXmbcJUrYSZBDPr2suPXaERUipZBK1Oore3Yd6FZC5hZByL4JYdYjC7Pi3co8zBHqbK4MhJG4GU4hfWQZCqfnZABqpznvOWRThuD0WoyjvoWq81gH7XRBIh8TDkU4qyHKA439hkjyWycV8PgshuifWaBVfFV3NTrZA3DSIAZDZD'

const app = express();

app.use(express.json());
app.get('/', (req, res) => {
    res.send('Welcome to the whatsapp webhooks API');
})

app.get('/webhook', (req,res) =>{
    // console.log(req.query);
    // res.send();

    const mode = req.query['hub.mode'];
    const challenge = req.query['hub.challenge'];
    const token = req.query['hub.verify_token'];

    if(mode && token === WEBHOOK_VERIFY_TOKEN) {
        res.status(200).send(challenge);
    }
    else{
        res.sendStatus(403);
    }
})

app.post('/webhook', (req, res) => {
    // console.log(JSON.stringify(req.body, null, 2));
    const {entry} = req.body;
    if(!entry || entry.length === 0){
        return res.status(400).send('No entry found in the request body');
    }

    const changes = entry[0].changes;
    if(!changes || changes.length === 0) {
        return res.status(400).send('No changes found in the entry');
    }

    const statuses = changes[0].value.statuses ? changes[0].value.statuses[0] : null;
    const messages = changes[0].value.messages ? changes[0].value.messages[0] : null;

    if(statuses){
        // handle message status
        console.log(
            `MESSAGE STATUS UPDATE : 
            ID: ${statuses.id},
             STATUS: ${statuses.status}`
        )
    }

    if(messages) {
        // handle recieve messages
        if(messages.type === 'text'){
            if(messages.text.body.toLowerCase() === 'hello'){
                sendMessage(messages.from, 'Hellow I am Bot from QuickKirana');
            }
        }
        console.log(JSON.stringify(messages, null, 2));
        
    }
    res.status(200).send('Webhook processed');
})


async function sendMessage(to, body) {
    await axios({
        url: 'https://graph.facebook.com/v22.0/779968871865078/messages',
        method: 'post',
        headers: {
            'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify({
            messaging_product: 'whatsapp',
            to: to,
            type: 'text',
            text: {
                body
            }
        })
    })
}



app.listen(3000, () => {
    console.log('Server is running on port 3000');
    // sendMessage('917972191115', "Hello from QuickKirana");
})