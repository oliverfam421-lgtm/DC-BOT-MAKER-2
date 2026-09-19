# Rose Bot Maker

Rose Bot Maker lets you configure and run a Discord bot with **real custom slash commands**.

## Command format

Enter one command per line:

```text
/hello - Say hello to the user
/ping - Check if the bot is online
/rules - Show the server rules
```

The app registers those commands with Discord using `discord.js`. The text after `-` becomes the command description shown in Discord, and each command responds with that description. This means the commands are real and usable, although this simple version does not execute custom code or perform actions such as moderation.

## Deploy to Render

1. In Render, choose **New → Blueprint** and select this repository.
2. Render reads `render.yaml`, installs dependencies, and runs `npm start`.
3. Open the generated HTTPS URL.
4. Enter the bot token, bot name, application description, and command list.
5. Click **Start bot and register commands**.
6. Click **Invite bot to your server** and authorize it with the `bot` and `applications.commands` scopes.
7. Use the registered commands in Discord.

Render free services may sleep when inactive; use an always-on plan for continuous bot uptime. The token is held in memory only and is never written to a file or printed in logs. A service restart requires submitting the form again.

Discord allows a maximum of 25 global slash commands in this app. Command names must use lowercase letters, numbers, hyphens, or underscores.
