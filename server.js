const express = require('express');
const cron = require('node-cron');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

// Initial Boss Database grouped by interval hours
let bosses = [
  // EVERY 10H
  { id: 1, name: 'Viorent', level: 65, location: 'Gill Stream', intervalHours: 10, lastKilled: new Date(Date.now() - 9.6 * 3600 * 1000).toISOString() },
  { id: 2, name: 'Venatus', level: 60, location: 'Gill Stream', intervalHours: 10, lastKilled: new Date(Date.now() - 9.5 * 3600 * 1000).toISOString() },
  
  // EVERY 18H
  { id: 3, name: 'Lady Dalia', level: 68, location: 'Misty Swamp', intervalHours: 18, lastKilled: new Date(Date.now() - 8 * 3600 * 1000).toISOString() },
  
  // EVERY 21H
  { id: 4, name: 'Ego', level: 70, location: 'Highland', intervalHours: 21, lastKilled: new Date(Date.now() - 2 * 3600 * 1000).toISOString() },
  
  // EVERY 24H
  { id: 5, name: 'Livera', level: 72, location: 'Red Canyon', intervalHours: 24, lastKilled: new Date(Date.now() - 23.5 * 3600 * 1000).toISOString() },
  { id: 6, name: 'Araneo', level: 71, location: 'Red Canyon', intervalHours: 24, lastKilled: new Date(Date.now() - 22 * 3600 * 1000).toISOString() },
  { id: 7, name: 'Undomiel', level: 73, location: 'Red Canyon', intervalHours: 24, lastKilled: new Date(Date.now() - 21 * 3600 * 1000).toISOString() },

  // EVERY 29H
  { id: 8, name: 'General Aquleus', level: 75, location: 'Ruins', intervalHours: 29, lastKilled: new Date(Date.now() - 25 * 3600 * 1000).toISOString() },
  { id: 9, name: 'Amentis', level: 74, location: 'Ruins', intervalHours: 29, lastKilled: new Date(Date.now() - 25 * 3600 * 1000).toISOString() },

  // EVERY 32H
  { id: 10, name: 'Baron Braudmore', level: 78, location: 'Castle', intervalHours: 32, lastKilled: new Date(Date.now() - 10 * 3600 * 1000).toISOString() },
  { id: 11, name: 'Gareth', level: 77, location: 'Castle', intervalHours: 32, lastKilled: new Date(Date.now() - 10 * 3600 * 1000).toISOString() }
];

async function sendDiscordAlert(boss, alertType) {
  if (!DISCORD_WEBHOOK_URL) return;

  const nextSpawnTime = new Date(new Date(boss.lastKilled).getTime() + boss.intervalHours * 3600 * 1000);
  const isWarning = alertType === 'WARNING';

  const embed = {
    title: isWarning ? `⚠️ Boss Spawning Soon: ${boss.name}` : `⚔️ Boss Defeated: ${boss.name}`,
    description: `**Level:** Lv.${boss.level}\n**Location:** ${boss.location}\n**Next Spawn:** <t:${Math.floor(nextSpawnTime.getTime() / 1000)}:R>`,
    color: isWarning ? 16753920 : 3066993,
    timestamp: new Date().toISOString()
  };

  try {
    await axios.post(DISCORD_WEBHOOK_URL, {
      username: "ASTRA Tracker",
      embeds: [embed]
    });
  } catch (err) {
    console.error("Error posting to Discord:", err.message);
  }
}

app.get('/api/bosses', (req, res) => {
  res.json(bosses);
});

app.post('/api/bosses/:id/kill', (req, res) => {
  const bossId = parseInt(req.params.id);
  const boss = bosses.find(b => b.id === bossId);

  if (boss) {
    boss.lastKilled = new Date().toISOString();
    sendDiscordAlert(boss, 'KILLED');
    res.json({ success: true, boss });
  } else {
    res.status(404).json({ error: "Boss not found" });
  }
});

// Cron job checking for 15-minute warnings
cron.schedule('* * * * *', () => {
  const now = new Date();
  bosses.forEach(boss => {
    const nextSpawn = new Date(new Date(boss.lastKilled).getTime() + boss.intervalHours * 3600 * 1000);
    const diffMinutes = Math.floor((nextSpawn - now) / (1000 * 60));

    if (diffMinutes === 15) {
      sendDiscordAlert(boss, 'WARNING');
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ASTRA Server running on port ${PORT}`));
