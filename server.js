const express = require('express');
const rateLimit = require('express-rate-limit');
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');

const app = express();
const port = process.env.PORT || 3000;
const discordApi = 'https://discord.com/api/v10';
let activeClient;

app.disable('x-powered-by');
app.use(express.urlencoded({ extended: false, limit: '20kb' }));
app.use(express.json({ limit: '20kb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false }));

const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function inferCommands(input) {
  const commands = [];
  const lines = String(input || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  for (const line of lines) {
    let match = line.match(/^\/?([a-z0-9_-]{1,32})\s*(?:command)?\s*(?:[-:]|that|to)\s*(.+)$/i);
    if (!match) match = line.match(/(?:make|create|add|have)\s+(?:a\s+)?\/?([a-z0-9_-]{1,32})\s+command\s+(?:that|to)\s+(.+)$/i);
    if (!match) continue;
    const name = match[1].toLowerCase();
    let instruction = match[2].trim().replace(/[.!]+$/, '');
    let reply = instruction;
    const replyMatch = instruction.match(/(?:reply|respond|say|says?)\s+(?:with|:)?\s*["“]?(.+?)["”]?$/i);
    if (replyMatch) reply = replyMatch[1].trim();
    else if (/\bping\b/i.test(name)) reply = 'Pong!';
    else if (/\bhello|hi|greet\b/i.test(name)) reply = 'Hello!';
    commands.push({ name, description: instruction.slice(0, 100), reply: reply.slice(0, 1900) });
  }
  if (!commands.length) throw new Error('Describe at least one command, for example: Make a ping command that replies Pong.');
  if (new Set(commands.map(c => c.name)).size !== commands.length) throw new Error('Each command name must be unique.');
  if (commands.length > 25) throw new Error('Discord allows up to 25 commands in this app.');
  return commands;
}

function page(message = '', error = false, inviteUrl = '') {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Rose Bot Maker</title><style>
:root{color-scheme:dark;font-family:Inter,system-ui,sans-serif}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at top,#3b1d55,#120d1d 60%);color:#f8f4ff}main{width:min(100%,600px);padding:32px;border:1px solid #6e4a83;border-radius:22px;background:#190f24eb;box-shadow:0 20px 70px #0008}h1{margin:0 0 8px}h1 span{color:#f3a6d5}p{color:#c9bfd0;line-height:1.5}label{display:block;margin:20px 0 8px;font-weight:700}input,textarea{width:100%;border:1px solid #735785;border-radius:10px;padding:13px;color:white;background:#170e20;font:inherit}textarea{min-height:170px;resize:vertical}button,.invite{display:block;width:100%;margin-top:24px;padding:14px;border:0;border-radius:10px;text-align:center;text-decoration:none;color:#241229;background:linear-gradient(90deg,#f3a6d5,#c89cff);font-weight:800;font-size:1rem;cursor:pointer}button:hover,.invite:hover{filter:brightness(1.1)}.notice{margin-top:20px;padding:13px;border-radius:10px;background:${error ? '#5c202f' : '#193e36'}}small{display:block;margin-top:18px;color:#a99cae}code{color:#f3a6d5}</style></head><body><main>
<h1>🌹 <span>Rose Bot Maker</span></h1><p>Describe the commands you want in plain English. Rose Bot Maker turns them into real slash commands.</p>${message ? `<div class="notice" role="status">${esc(message)}</div>` : ''}${inviteUrl ? `<a class="invite" href="${esc(inviteUrl)}" target="_blank" rel="noopener noreferrer">➕ Invite bot to your server</a>` : ''}
<form method="post" action="/create"><label for="token">Discord bot token</label><input id="token" name="token" type="password" required autocomplete="off" maxlength="200" placeholder="Paste your bot token"><label for="name">Bot name</label><input id="name" name="name" type="text" required maxlength="32" placeholder="My Rose Bot"><label for="description">Bot description and commands</label><textarea id="description" name="description" required maxlength="6000" placeholder="Make a ping command that replies Pong.\nMake a hello command that says Hello and welcomes the user.\nMake a rules command that replies Be respectful."></textarea><button type="submit">Start bot and create commands</button></form><small>Write one command per line using plain English. Examples: <code>Make a ping command that replies Pong</code> or <code>Create a rules command that says Be respectful</code>. The command name and response are extracted and registered with Discord.</small></main></body></html>`;
}

async function startBot(token, applicationId, botName, commands) {
  if (activeClient) { try { await activeClient.destroy(); } catch (_) {} }
  const slashCommands = commands.map(command => new SlashCommandBuilder().setName(command.name).setDescription(command.description).toJSON());
  const rest = new REST({ version: '10' }).setToken(token);
  await rest.put(Routes.applicationCommands(applicationId), { body: slashCommands });
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  client.once('ready', () => console.log(`Rose Bot Maker started ${client.user.tag}`));
  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const command = commands.find(item => item.name === interaction.commandName);
    if (command) await interaction.reply(command.reply);
  });
  await client.login(token);
  activeClient = client;
}

app.get('/', (_req, res) => res.type('html').send(page()));
app.post('/create', async (req, res) => {
  const token = typeof req.body.token === 'string' ? req.body.token.trim() : '';
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const descriptionInput = typeof req.body.description === 'string' ? req.body.description.trim() : '';
  if (!token || !name || !descriptionInput || name.length > 32) return res.status(400).type('html').send(page('Enter a valid token, bot name, and command description.', true));
  let commands;
  try { commands = inferCommands(descriptionInput); } catch (error) { return res.status(400).type('html').send(page(error.message, true)); }
  try {
    const headers = { Authorization: `Bot ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'RoseBotMaker/1.4' };
    const meResponse = await fetch(`${discordApi}/users/@me`, { headers });
    if (!meResponse.ok) return res.status(401).type('html').send(page('Discord rejected that token.', true));
    const bot = await meResponse.json();
    const applicationResponse = await fetch(`${discordApi}/applications/@me`, { headers });
    if (!applicationResponse.ok) return res.status(502).type('html').send(page('Discord did not return the bot application.', true));
    const application = await applicationResponse.json();
    const updateResponse = await fetch(`${discordApi}/applications/${application.id}`, { method: 'PATCH', headers, body: JSON.stringify({ name, description: descriptionInput.slice(0, 400) }) });
    if (!updateResponse.ok) return res.status(502).type('html').send(page('Discord could not update this application.', true));
    await startBot(token, application.id, name, commands);
    const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(application.id)}&scope=bot%20applications.commands&permissions=0`;
    return res.type('html').send(page(`Started ${name} and registered ${commands.length} real slash command${commands.length === 1 ? '' : 's'}.`, false, inviteUrl));
  } catch (error) { console.error(`Request failed: ${error.message}`); return res.status(502).type('html').send(page(`Could not start the bot: ${error.message}`, true)); }
});
app.listen(port, () => console.log(`Rose Bot Maker listening on port ${port}`));
