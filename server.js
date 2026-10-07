const express = require('express');
const cron = require('node-cron');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

// Base spawn time anchor set to today at 16:30 (4:30 PM)
const today1630 = new Date();
today1630.setHours(16, 30, 0, 0);

// Boss configurations using 24-hour timestamps
let bosses = [
  // EVERY 10H
  { id: 1, name: 'Viorent', level: 65, location: 'Gill Stream', intervalHours: 10, nextSpawn: today1630.toISOString() },
  { id: 2, name: 'Venatus', level: 60, location: 'Gill Stream', intervalHours: 10, nextSpawn: new Date(today1630.getTime() + 4 * 60 * 1000).toISOString() }, // 16:34
  
  // EVERY 18H
  { id: 3, name: 'Lady Dalia', level: 68, location: 'Misty Swamp', intervalHours: 18, nextSpawn: new Date(today1630.getTime() + 9 * 3600 * 1000 + 49 * 60 * 1000).toISOString() }, // 02:19
  
  // EVERY 21H
  { id: 4, name: 'Ego', level: 70, location: 'Highland', intervalHours: 21, nextSpawn: new Date(today1630.getTime() + 18 * 3600 * 1000 + 54 * 60 * 1000).toISOString() },
  
  // EVERY 24H
  { id: 5, name: 'Livera', level: 72, location: 'Red Canyon', intervalHours: 24, nextSpawn: new Date(today1630.getTime() + 4 * 3600 * 1000 + 46 * 60 * 1000).toISOString() },
  { id: 6, name: 'Araneo', level: 71, location: 'Red Canyon', intervalHours: 24, nextSpawn: new Date(today1630.getTime() + 4 * 3600 * 1000 + 51 * 60 * 1000).toISOString() },
  { id: 7, name: 'Undomiel', level: 73, location: 'Red Canyon', intervalHours: 24, nextSpawn: new Date(today1630.getTime() + 4 * 3600 * 1000 + 50 * 60 * 1000).toISOString() },

  // EVERY 29H
  { id: 8, name: 'General Aquleus', level: 75, location: 'Ruins', intervalHours: 29, nextSpawn: new Date(today1630.getTime() + 3 * 3600 * 1000 + 43 * 60 * 1000).toISOString() },
  { id: 9, name: 'Amentis', level: 74, location: 'Ruins', intervalHours: 29, nextSpawn: new Date(today1630.getTime() + 3 * 3600 * 1000 + 47 * 60 * 1000).toISOString() },

  // EVERY 32H
  { id: 10, name: 'Baron Braudmore', level: 78, location: 'Castle', intervalHours: 32, nextSpawn: new Date(today1630.getTime() + 5 * 3600 * 1000 + 55 * 60 * 1000).toISOString() },
  { id: 11, name: 'Gareth', level: 77, location: 'Castle', intervalHours: 32, nextSpawn: new Date(today1630.getTime() + 5 * 3600 * 1000 + 58 * 60 * 1000).toISOString() }
];

async function sendDiscordAlert(boss, alertType) {
  if (!DISCORD_WEBHOOK_URL) return;

  const spawnTime = new Date(boss.nextSpawn);
  const isWarning = alertType === 'WARNING';

  // 24-hour formatted time string for Discord Embed
  const hours24 = String(spawnTime.getHours()).padStart(2, '0');
  const mins = String(spawnTime.getMinutes()).padStart(2, '0');
  const time24Str = `${hours24}:${mins}`;

  const embed = {
    title: isWarning ? `⚠️ Boss Spawning Soon: ${boss.name}` : `⚔️ Boss Defeated: ${boss.name}`,
    description: `**Level:** Lv.${boss.level}\n**Location:** ${boss.location}\n**Next Spawn (24h):** ${time24Str}\n**Countdown:** <t:${Math.floor(spawnTime.getTime() / 1000)}:R>`,
    color: isWarning ? 16753920 : 3066993,
    timestamp: new Date().toISOString()
  };

  try {
    await axios.post(DISCORD_WEBHOOK_URL, {
      username: "ASTRA Tracker",
      embeds: [embed]
    });
  } catch (err) {
    console.error("Error sending Discord webhook:", err.message);
  }
}

app.get('/api/bosses', (req, res) => {
  res.json(bosses);
});

app.post('/api/bosses/:id/kill', (req, res) => {
  const bossId = parseInt(req.params.id);
  const boss = bosses.find(b => b.id === bossId);

  if (boss) {
    // Reset next spawn time based on boss interval
    const nextDate = new Date(Date.now() + boss.intervalHours * 3600 * 1000);
    boss.nextSpawn = nextDate.toISOString();
    sendDiscordAlert(boss, 'KILLED');
    res.json({ success: true, boss });
  } else {
    res.status(404).json({ error: "Boss not found" });
  }
});

// Cron job checking every minute for 15-min warnings
cron.schedule('* * * * *', () => {
  const now = new Date();
  bosses.forEach(boss => {
    const spawnTime = new Date(boss.nextSpawn);
    const diffMinutes = Math.floor((spawnTime - now) / (1000 * 60));

    if (diffMinutes === 15) {
      sendDiscordAlert(boss, 'WARNING');
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`ASTRA Server running on port ${PORT}`));
