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
  console.log(`✅ Nouveau Thread Discord : ${thread.name}`);
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
    console.error(`❌ Erreur Discord : ${error.message}`);
  }
});

async function checkStores() {
    console.log(`🔍 [${new Date().toLocaleTimeString()}] Vérification des avis Play Store & App Store...`);
    try {
        // --- Google Play Store ---
        const playReviews = await gplay.reviews({
            appId: STORES_CONFIG.playStoreId,
            sort: gplay.sort.NEWEST,
            num: 5 // On en prend 5 au cas où plusieurs tombent en même temps
        });

        if (playReviews.data && playReviews.data.length > 0) {
            const reviews = playReviews.data.reverse(); // Du plus vieux au plus récent
            for (const review of reviews) {
                if (lastStoreIds.play && review.id !== lastStoreIds.play) {
                    await sendReviewToN8n('Play Store', review.userName, review.text, `Avis ${review.score}⭐ - Google Play`, review.url);
                }
                lastStoreIds.play = review.id;
            }
        }

        // --- App Store ---
        const appleReviews = await appStore.reviews({
            id: STORES_CONFIG.appStoreId,
            sort: appStore.sort.RECENT,
            page: 1
        });

        if (appleReviews && appleReviews.length > 0) {
            const aReviews = appleReviews.reverse();
            for (const review of aReviews) {
                if (lastStoreIds.apple && review.id !== lastStoreIds.apple) {
                    await sendReviewToN8n('App Store', review.userName, review.text, review.title, `https://apps.apple.com/app/id${STORES_CONFIG.appStoreId}`);
                }
                lastStoreIds.apple = review.id;
            }
        }
        console.log("✨ Vérification terminée. Tout est à jour.");
    } catch (err) {
        console.error("❌ Erreur lors du scan des stores :", err.message);
    }
}

async function sendReviewToN8n(source, auteur, contenu, titre, url) {
    console.log(`📥 NOUVEAU RETOUR détecté sur ${source} ! Envoi à n8n...`);
    try {
        await axios.post(N8N_WEBHOOK, {
            type: 'STORE_REVIEW',
            nom_salon: source,
            auteur: auteur,
            contenu: contenu,
            titre: titre,
            url: url,
            date: new Date().toISOString()
        });
    } catch (e) {
        console.error(`❌ Échec de l'envoi à n8n : ${e.message}`);
    }
}

client.once('ready', () => {
  console.log(`🤖 Bot prêt et connecté : ${client.user.tag}`);
  // Lancer la première vérification immédiatement
  checkStores();
  // Puis toutes les 30 minutes
  setInterval(checkStores, 30 * 60 * 1000);
});

client.login(DISCORD_TOKEN);
