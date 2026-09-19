# Rose Bot Maker

A small Render-ready web app for updating a Discord bot's application name and description. It does **not** store bot tokens and it does not create Discord applications; it updates the application associated with the token you provide.

After a successful update, the app displays an **Invite bot to your server** button. The generated Discord OAuth2 URL includes the `bot` and `applications.commands` scopes with no permissions selected by default. Choose additional permissions later in the Discord Developer Portal if your bot needs them.

## Deploy to Render

1. Sign in to [Render](https://render.com).
2. Click **New** → **Blueprint**.
3. Connect GitHub and select `oliverfam421-lgtm/DC-BOT-MAKER-2`.
4. Render reads `render.yaml` and creates the `rose-bot-maker` web service.
5. Choose a plan and click **Apply**.
6. Open the service URL after deployment.
7. Enter your Discord bot token, name, and description, then click **Save bot details**.
8. Click **Invite bot to your server**, choose a server, and authorize it.

Render automatically provides `PORT`; no environment variables are required.

## Important limitation

The description field changes the Discord application's description. It does not define slash commands or make the bot respond to messages. Commands require bot code using a Discord library such as discord.js or discord.py. This project only updates application metadata and creates the invite link.

## Security

Use the HTTPS Render URL, never paste a token into an issue or chat, and rotate the token in the Discord Developer Portal if you think it was exposed. Requests are rate-limited and tokens are not written to disk or logs.
