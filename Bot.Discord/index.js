const { Client, GatewayIntentBits, MessageType } = require('discord.js');
const axios = require('axios');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Ton URL Webhook
const N8N_WEBHOOK = 'https://n8n.ycautomation.online/webhook/forum';

// --- REGEX POUR DÉTECTER LES ID ---
// Cherche des séquences de 4 chiffres ou plus, ou des formats type "UID:xxxxx"
// Tu peux ajuster selon le format réel de tes IDs de jeu
const ID_REGEX = /\b[A-Z0-9]{4,15}\b/i; 

// 1. GESTION DES NOUVEAUX TICKETS (Création du Post)
client.on('threadCreate', async (thread) => {
  try {
    // Petite pause pour s'assurer que le message est dispo
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const firstMessage = await thread.fetchStarterMessage();
    if (!firstMessage) return;

    await axios.post(N8N_WEBHOOK, {
      type: 'NOUVEAU_TICKET', // Pour n8n : C'est une création
      titre: thread.name,
      contenu: firstMessage.content,
      source: `Discord Forum - #${thread.parent ? thread.parent.name : 'Forum'}`,
      de: thread.ownerId, // ou firstMessage.author.username
      date: thread.createdAt.toISOString(),
      thread_id: thread.id, // Important pour retrouver le ticket plus tard !
      url: thread.url
    });
    console.log(`✅ [TICKET] Nouveau post capturé : ${thread.name}`);
  } catch (error) {
    console.error('❌ Erreur threadCreate:', error.message);
  }
});

// 2. GESTION DES RÉPONSES (Filtrage ID)
client.on('messageCreate', async (message) => {
  // On ignore les bots et les messages hors des Threads (Forums)
  if (message.author.bot || !message.channel.isThread()) return;

  try {
    // --- STOPPER LE DOUBLON ---
    // On vérifie si ce message est celui qui a créé le thread.
    // Si oui, on stop car 'threadCreate' l'a déjà envoyé.
    if (message.id === message.channel.id || message.type === MessageType.ThreadStarterMessage) {
        return; 
    }

    // --- FILTRE INTELLIGENT ---
    // On ne garde que si ça ressemble à un ID ou si une image est jointe (screenshot ID)
    const hasPotentialID = ID_REGEX.test(message.content);
    const hasAttachment = message.attachments.size > 0;

    if (hasPotentialID || hasAttachment) {
        await axios.post(N8N_WEBHOOK, {
          type: 'REPONSE_ID', // Pour n8n : C'est une mise à jour
          titre: `Réponse ID dans ${message.channel.name}`,
          contenu: message.content,
          source: `Discord Forum`,
          de: message.author.username,
          date: message.createdAt.toISOString(),
          thread_id: message.channel.id, // L'ID du ticket parent
          url: message.url,
          has_attachment: hasAttachment,
          attachment_url: hasAttachment ? message.attachments.first().url : null
        });
        console.log(`🔍 [UPDATE] ID ou Image détecté dans une réponse de ${message.author.username}`);
    } else {
        // Optionnel : Log pour voir ce qu'on ignore
        // console.log(`🗑️ Ignoré (Pas d'ID détecté) : ${message.content}`);
    }

  } catch (error) {
    console.error('❌ Erreur messageCreate:', error.message);
  }
});

client.once('ready', () => {
  console.log(`🤖 Bot connecté et prêt : ${client.user.tag}`);
});

const token = process.env.DISCORD_TOKEN; // Ou ta chaîne en dur
client.login(token);
