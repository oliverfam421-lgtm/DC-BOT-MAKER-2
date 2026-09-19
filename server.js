const express = require('express');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 3000;
const discordApi = 'https://discord.com/api/v10';

app.disable('x-powered-by');
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(express.json({ limit: '10kb' }));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests. Please wait a few minutes and try again.'
}));

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function page(message = '', error = false, inviteUrl = '') {
  const safeMessage = escapeHtml(message);
  const safeInviteUrl = escapeHtml(inviteUrl);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Rose Bot Maker</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, system-ui, sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; background: radial-gradient(circle at top, #3b1d55, #120d1d 60%); color: #f8f4ff; }
    main { width: min(100%, 560px); padding: 32px; border: 1px solid #6e4a83; border-radius: 22px; background: rgba(25, 15, 36, .92); box-shadow: 0 20px 70px #0008; }
    h1 { margin: 0 0 8px; font-size: 2rem; } h1 span { color: #f3a6d5; }
    p { color: #c9bfd0; line-height: 1.5; } label { display: block; margin: 20px 0 8px; font-weight: 700; }
    input, textarea { width: 100%; border: 1px solid #735785; border-radius: 10px; padding: 13px; color: white; background: #170e20; font: inherit; }
    textarea { min-height: 120px; resize: vertical; } input:focus, textarea:focus { outline: 2px solid #e28dc1; border-color: transparent; }
    button, .invite { display: block; width: 100%; margin-top: 24px; padding: 14px; border: 0; border-radius: 10px; text-align: center; text-decoration: none; color: #241229; background: linear-gradient(90deg, #f3a6d5, #c89cff); font-weight: 800; font-size: 1rem; cursor: pointer; }
    button:hover, .invite:hover { filter: brightness(1.1); } .notice { margin-top: 20px; padding: 13px; border-radius: 10px; background: ${error ? '#5c202f' : '#193e36'}; color: #fff; }
    small { display: block; margin-top: 18px; color: #a99cae; } code { color: #f3a6d5; }
  </style>
</head>
<body><main>
  <h1>🌹 <span>Rose Bot Maker</span></h1>
  <p>Update your Discord bot's application name and description, then invite it to your server.</p>
  ${message ? `<div class="notice" role="status">${safeMessage}</div>` : ''}
  ${safeInviteUrl ? `<a class="invite" href="${safeInviteUrl}" target="_blank" rel="noopener noreferrer">➕ Invite bot to your server</a>` : ''}
  <form method="post" action="/create">
    <label for="token">Discord bot token</label>
    <input id="token" name="token" type="password" required autocomplete="off" placeholder="Paste your bot token" maxlength="200">
    <label for="name">Bot name</label>
    <input id="name" name="name" type="text" required maxlength="32" placeholder="My Rose Bot">
    <label for="description">Bot description</label>
    <textarea id="description" name="description" required maxlength="400" placeholder="Describe what your bot does"></textarea>
    <button type="submit">Save bot details</button>
  </form>
  <small>Your token is sent to Discord over HTTPS and is never stored or logged. Rose Bot Maker updates the existing application; it does not create commands or make the bot respond automatically. Use the invite button after saving to add it to a server.</small>
</main></body></html>`;
}

app.get('/', (_req, res) => res.type('html').send(page()));

app.post('/create', async (req, res) => {
  const token = typeof req.body.token === 'string' ? req.body.token.trim() : '';
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
  if (!token || !name || !description || name.length > 32 || description.length > 400) {
    return res.status(400).type('html').send(page('Enter a valid token, a name up to 32 characters, and a description up to 400 characters.', true));
  }

  try {
    const headers = { Authorization: `Bot ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'RoseBotMaker/1.0' };
    const meResponse = await fetch(`${discordApi}/users/@me`, { headers });
    if (!meResponse.ok) return res.status(meResponse.status === 401 ? 401 : 502).type('html').send(page('Discord rejected that token. Check it and try again.', true));
    const bot = await meResponse.json();

    const applicationResponse = await fetch(`${discordApi}/applications/@me`, { headers });
    if (!applicationResponse.ok) return res.status(502).type('html').send(page('The token works, but Discord did not return its application. Make sure this is a bot token.', true));
    const application = await applicationResponse.json();
    const updateResponse = await fetch(`${discordApi}/applications/${application.id}`, {
      method: 'PATCH', headers, body: JSON.stringify({ name, description })
    });
    if (!updateResponse.ok) {
      const detail = await updateResponse.text();
      console.error(`Discord update failed with status ${updateResponse.status}: ${detail.slice(0, 200)}`);
      return res.status(502).type('html').send(page('Discord could not update this application. Check that the token belongs to the bot you want to edit.', true));
    }

    // This link uses the application ID returned by Discord, so no client ID input is needed.
    // bot + applications.commands lets users invite the bot and authorize slash commands.
    const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(application.id)}&scope=bot%20applications.commands&permissions=0`;
    return res.type('html').send(page(`Saved! ${name} is now configured for ${bot.username || 'your bot'}.`, false, inviteUrl));
  } catch (error) {
    console.error(`Request failed: ${error.message}`);
    return res.status(502).type('html').send(page('Could not reach Discord right now. Please try again.', true));
  }
});

app.listen(port, () => console.log(`Rose Bot Maker listening on port ${port}`));
