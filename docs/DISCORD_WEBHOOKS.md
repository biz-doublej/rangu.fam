Discord Webhooks

- Env var: `DISCORD_WEBHOOK_URL` (set in `.env.local`)
- Code: `src/services/discordWebhookService.ts`

Styles

- Available styles: `standard`, `compact`, `card`, `minimal`.
- Generic sender: `DiscordWebhookService.sendEmbedStyled(username, avatarUrl, baseEmbed, style)`
- Existing notice/event/test senders now use styled sending internally.

