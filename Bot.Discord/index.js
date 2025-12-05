const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const N8N_WEBHOOK = 'https://n8n.ycautomation.online/webhook/forum';
const LOCAL_ID_REGEX = /;local-[a-zA-Z0-9]+/;

client.on('threadCreate', async (thread) => {
  try {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const firstMessage = await thread.fetchStarterMessage();
    if (!firstMessage) return;

    const hasAttachment = firstMessage.attachments.size > 0;
    const attachmentUrl = hasAttachment ? firstMessage.attachments.first().url : null;

    await axios.post(N8N_WEBHOOK, {
      type: 'NOUVEAU_TICKET',
      titre: thread.name,
      contenu: firstMessage.content,
      source: `Discord Forum - #${thread.parent ? thread.parent.name : 'Forum'}`,
      de: firstMessage.author.username,
      date: thread.createdAt.toISOString(),
      thread_id: thread.id,
      url: thread.url,
      attachment_url: attachmentUrl
    });
    console.log(`✅ [TICKET] Nouveau post capturé : ${thread.name}`);
  } catch (error) {
    console.error(`❌ Erreur lors de la capture du thread : ${error.message}`);
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.channel.isThread()) return;

  try {
    if (message.id === message.channel.id) return;

    const content = message.content;
    const matchLocal = LOCAL_ID_REGEX.test(content);
    const hasAttachment = message.attachments.size > 0;

    if (matchLocal || hasAttachment) {
      await axios.post(N8N_WEBHOOK, {
        type: 'REPONSE_ID',
        titre: `Mise à jour ID - ${message.channel.name}`,
        contenu: content,
        source: `Discord Forum`,
        de: message.author.username,
        thread_id: message.channel.id,
        url: message.url,
        attachment_url: hasAttachment ? message.attachments.first().url : null
      });
      console.log(`🎯 [UPDATE] ID local ou Image détecté de : ${message.author.username}`);
    }
  } catch (error) {
    console.error(`❌ Erreur lors de la mise à jour : ${error.message}`);
  }
});

client.once('ready', () => {
  console.log(`🤖 Bot connecté et prêt à l'action : ${client.user.tag}`);
});

const token = process.env.DISCORD_TOKEN;
client.login(token);
