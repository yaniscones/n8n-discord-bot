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
