const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
const gplay = require('google-play-scraper');
const appStore = require('app-store-scraper');

const TARGET_CHANNEL_ID = "1379835906160201728"; 
const N8N_WEBHOOK = process.env.N8N_WEBHOOK_URL;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

const STORES_CONFIG = {
    playStoreId: 'com.fortress.merge.idle.tower.defense',
    appStoreId: '6462846473' 
};

let lastStoreIds = { play: null, apple: null };

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent]
});

client.on('threadCreate', async (thread) => {
  if (!thread.parent || thread.parent.id !== TARGET_CHANNEL_ID) return;

  console.log(`✅ Nouveau Thread dans ${thread.parent.name} : ${thread.name}`);

  try {
    let firstMessage = null;
    for (let i = 0; i < 3; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      firstMessage = await thread.fetchStarterMessage().catch(() => null);
      if (firstMessage) break;
    }

    if (!firstMessage) return;

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

  } catch (error) {
    console.error(`Erreur Discord : ${error.message}`);
  }
});

async function checkStores() {
    try {
        const playReviews = await gplay.reviews({
            appId: STORES_CONFIG.playStoreId,
            sort: gplay.sort.NEWEST,
            num: 1
        });
        const lastPlay = playReviews.data[0];
        if (lastPlay && lastPlay.id !== lastStoreIds.play) {
            if (lastStoreIds.play) await sendReviewToN8n('Play Store', lastPlay.userName, lastPlay.text, `Avis ${lastPlay.score}⭐ - Google Play`, lastPlay.url);
            lastStoreIds.play = lastPlay.id;
        }

        const appleReviews = await appStore.reviews({
            id: STORES_CONFIG.appStoreId,
            sort: appStore.sort.RECENT,
            page: 1
        });
        const lastApple = appleReviews[0];
        if (lastApple && lastApple.id !== lastStoreIds.apple) {
            if (lastStoreIds.apple) await sendReviewToN8n('App Store', lastApple.userName, lastApple.text, lastApple.title, `https://apps.apple.com/app/id${STORES_CONFIG.appStoreId}`);
            lastStoreIds.apple = lastApple.id;
        }
    } catch (err) {
        console.error("❌ Erreur Stores :", err.message);
    }
}

async function sendReviewToN8n(source, auteur, contenu, titre, url) {
    console.log(`📥 Nouveau retour sur ${source} : ${titre}`);
    await axios.post(N8N_WEBHOOK, {
        type: 'STORE_REVIEW',
        nom_salon: source,
        auteur: auteur,
        contenu: contenu,
        titre: titre,
        url: url,
        date: new Date().toISOString()
    });
}

client.once('ready', () => {
  console.log(`🤖 Connecté : ${client.user.tag}`);
  setInterval(checkStores, 30 * 60 * 1000);
  checkStores(); 
});

client.login(DISCORD_TOKEN);
