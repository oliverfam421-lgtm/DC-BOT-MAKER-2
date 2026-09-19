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

function parseCommands(input) {
  const commands = [];
  for (const raw of String(input || '').split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const match = line.match(/^\/?([a-z0-9_-]{1,32})\s*(?:[-:]\s*|\s+)(.{1,100})$/i);
    if (!match) throw new Error(`Invalid command: ${line}. Use one command per line like /hello - Say hello.`);
    const name = match[1].toLowerCase();
    if (!/^[a-z0-9_-]+$/.test(name)) throw new Error(`Invalid command name: ${name}`);
    commands.push({ name, description: match[2].trim() });
  }
  if (!commands.length) throw new Error('Add at least one command.');
  if (new Set(commands.map(c => c.name)).size !== commands.length) throw new Error('Each command name must be unique.');
  if (commands.length > 25) throw new Error('Discord allows up to 25 global slash commands in this app.');
  return commands;
}

function page(message = '', error = false, inviteUrl = '') {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Rose Bot Maker</title><style>
:root{color-scheme:dark;font-family:Inter,system-ui,sans-serif}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at top,#3b1d55,#120d1d 60%);color:#f8f4ff}main{width:min(100%,600px);padding:32px;border:1px solid #6e4a83;border-radius:22px;background:#190f24eb;box-shadow:0 20px 70px #0008}h1{margin:0 0 8px}h1 span{color:#f3a6d5}p{color:#c9bfd0;line-height:1.5}label{display:block;margin:20px 0 8px;font-weight:700}input,textarea{width:100%;border:1px solid #735785;border-radius:10px;padding:13px;color:white;background:#170e20;font:inherit}textarea{min-height:120px;resize:vertical}button,.invite{display:block;width:100%;margin-top:24px;padding:14px;border:0;border-radius:10px;text-align:center;text-decoration:none;color:#241229;background:linear-gradient(90deg,#f3a6d5,#c89cff);font-weight:800;font-size:1rem;cursor:pointer}button:hover,.invite:hover{filter:brightness(1.1)}.notice{margin-top:20px;padding:13px;border-radius:10px;background:${error ? '#5c202f' : '#193e36'}}small{display:block;margin-top:18px;color:#a99cae}code{color:#f3a6d5}</style></head><body><main>
<h1>🌹 <span>Rose Bot Maker</span></h1><p>Enter commands below and Rose Bot Maker will register them as real Discord slash commands.</p>${message ? `<div class="notice" role="status">${esc(message)}</div>` : ''}${inviteUrl ? `<a class="invite" href="${esc(inviteUrl)}" target="_blank" rel="noopener noreferrer">➕ Invite bot to your server</a>` : ''}
<form method="post" action="/create"><label for="token">Discord bot token</label><input id="token" name="token" type="password" required autocomplete="off" maxlength="200" placeholder="Paste your bot token"><label for="name">Bot name</label><input id="name" name="name" type="text" required maxlength="32" placeholder="My Rose Bot"><label for="description">Bot description</label><textarea id="description" name="description" required maxlength="400" placeholder="What does your bot do?"></textarea><label for="commands">Commands — one per line</label><textarea id="commands" name="commands" required maxlength="5000" placeholder="/hello - Say hello\n/ping - Check if the bot is online\n/rules - Show the server rules"></textarea><button type="submit">Start bot and register commands</button></form><small>Command descriptions become the descriptions shown in Discord. Each command replies with its description, so they are real working slash commands. Format: <code>/name - Description</code>. Tokens are used in memory only.</small></main></body></html>`;
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
    if (command) await interaction.reply(`**${botName}**\n${command.description}`);
  });
  await client.login(token);
  activeClient = client;
}

app.get('/', (_req, res) => res.type('html').send(page()));
app.post('/create', async (req, res) => {
  const token = typeof req.body.token === 'string' ? req.body.token.trim() : '';
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
  let commands;
  try { commands = parseCommands(req.body.commands); } catch (error) { return res.status(400).type('html').send(page(error.message, true)); }
  if (!token || !name || !description || name.length > 32 || description.length > 400) return res.status(400).type('html').send(page('Enter a valid token, name, and description.', true));
  try {
    const headers = { Authorization: `Bot ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'RoseBotMaker/1.2' };
    const meResponse = await fetch(`${discordApi}/users/@me`, { headers });
    if (!meResponse.ok) return res.status(401).type('html').send(page('Discord rejected that token.', true));
    const bot = await meResponse.json();
    const applicationResponse = await fetch(`${discordApi}/applications/@me`, { headers });
    if (!applicationResponse.ok) return res.status(502).type('html').send(page('Discord did not return the bot application.', true));
    const application = await applicationResponse.json();
    const updateResponse = await fetch(`${discordApi}/applications/${application.id}`, { method: 'PATCH', headers, body: JSON.stringify({ name, description }) });
    if (!updateResponse.ok) return res.status(502).type('html').send(page('Discord could not update this application.', true));
    await startBot(token, application.id, name, commands);
    const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(application.id)}&scope=bot%20applications.commands&permissions=0`;
    return res.type('html').send(page(`Started ${name} (${bot.username || 'your bot'}) and registered ${commands.length} real slash command${commands.length === 1 ? '' : 's'}.`, false, inviteUrl));
  } catch (error) { console.error(`Request failed: ${error.message}`); return res.status(502).type('html').send(page(`Could not start the bot: ${error.message}`, true)); }
});
app.listen(port, () => console.log(`Rose Bot Maker listening on port ${port}`));
