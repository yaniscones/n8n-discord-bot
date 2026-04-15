const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

const TARGET_CHANNEL_ID = "1379835906160201728"; 
const N8N_WEBHOOK = process.env.N8N_WEBHOOK_URL;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.on('threadCreate', async (thread) => {
  if (!thread.parent || thread.parent.id !== TARGET_CHANNEL_ID) return;
  
  console.log(`✅ New Discord Thread detected: ${thread.name}`);
  
  try {
    let firstMessage = null;
    for (let i = 0; i < 3; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      firstMessage = await thread.fetchStarterMessage().catch(() => null);
      if (firstMessage) break;
    }

    if (!firstMessage) {
        console.log(`⚠️ Unable to fetch the original message of the thread: ${thread.name}`);
        return;
    }

    await axios.post(N8N_WEBHOOK, {
      type: 'NOUVEAU_BUG', 
      titre: thread.name,
      contenu: firstMessage.content,
      auteur: firstMessage.author.username,
      nom_salon: thread.parent.name,
      date: thread.createdAt.toISOString(),
      thread_id: thread.id,
      url: thread.url
    });
    
    console.log(`🚀 Data from thread "${thread.name}" successfully sent to n8n.`);

  } catch (error) {
    console.error(`❌ Error processing Discord thread: ${error.message}`);
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.channel.isThread()) return;
  if (message.channel.parentId !== TARGET_CHANNEL_ID) return;
  if (message.id === message.channel.id) return;
  if (message.author.id !== message.channel.ownerId) {
    console.log(`🔒 Message ignored: posted by ${message.author.username} (not the thread creator)`);
    return;
  }

  console.log(`💬 New response from the creator detected in the thread: ${message.channel.name}`);

  try {
    await axios.post(N8N_WEBHOOK, {
      type: 'NOUVELLE_REPONSE', 
      titre: message.channel.name,
      contenu: message.content,
      auteur: message.author.username,
      nom_salon: message.channel.parent.name,
      date: message.createdAt.toISOString(),
      thread_id: message.channel.id,
      url: message.url
    });
    
    console.log(`🚀 Response from ${message.author.username} successfully sent to n8n.`);

  } catch (error) {
    console.error(`❌ Error sending response to n8n: ${error.message}`);
  }
});

client.once('ready', () => {
  console.log(`🤖 Discord Bot operational! Logged in as: ${client.user.tag}`);
});

client.login(DISCORD_TOKEN);
