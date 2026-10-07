JavaScript
const express = require('express');
const cron = require('node-cron');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Retrieve Discord Webhook secret key from environment variables
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

// Initial Boss Data Configuration
let bosses = [
  { id: 1, name: 'Viorent', level: 65, location: 'Gill Stream', intervalHours: 10, nextSpawn: new Date(Date.now() + 10 * 3600 * 1000).toISOString() },
  { id: 2, name: 'Venatus', level: 60, location: 'Dark Forest', intervalHours: 18, nextSpawn: new Date(Date.now() + 18 * 3600 * 1000).toISOString() }
];

// Helper Function: Send Discord Webhook
async function sendDiscordAlert(boss, alertType) {
  if (!DISCORD_WEBHOOK_URL) return;

  const isWarning = alertType === 'WARNING';
  const embed = {
    title: isWarning ? `⚠️ Boss Spawning Soon: ${boss.name}` : `⚔️ Boss Defeated: ${boss.name}`,
    description: `**Level:** ${boss.level}\n**Location:** ${boss.location}\n**Next Spawn:** <t:${Math.floor(new Date(boss.nextSpawn).getTime() / 1000)}:R>`,
    color: isWarning ? 16766720 : 3066993, // Yellow for warning, Green for kill reset
    timestamp: new Date().toISOString()
  };

  try {
    await axios.post(DISCORD_WEBHOOK_URL, {
      username: "ASTRA Tracker",
      embeds: [embed]
    });
  } catch (err) {
    console.error("Error sending webhook:", err.message);
  }
}

// API Routes
app.get('/api/bosses', (req, res) => {
  res.json(bosses);
});

app.post('/api/bosses/:id/kill', (req, res) => {
  const bossId = parseInt(req.params.id);
  const boss = bosses.find(b => b.id === bossId);

  if (boss) {
    const nextDate = new Date(Date.now() + boss.intervalHours * 3600 * 1000);
    boss.nextSpawn = nextDate.toISOString();
    sendDiscordAlert(boss, 'KILLED');
    res.json({ success: true, boss });
  } else {
    res.status(404).json({ error: "Boss not found" });
  }
});

// Cron job running every minute to check spawn alerts
cron.schedule('* * * * *', () => {
  const now = new Date();
  bosses.forEach(boss => {
    const spawnTime = new Date(boss.nextSpawn);
    const diffMinutes = Math.floor((spawnTime - now) / (1000 * 60));

    // Send warning exactly 15 minutes before spawn
    if (diffMinutes === 15) {
      sendDiscordAlert(boss, 'WARNING');
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
