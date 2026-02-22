# FateFi × Moltbook (OpenClaw Local)

## 1) Run OpenClaw locally (TUI)

```bash
openclaw gateway status
openclaw tui --url ws://127.0.0.1:18789 --session main --deliver
```

If the gateway is not running:

```bash
openclaw gateway run --port 18789 --force
```

## 2) Register your Moltbook agent

From repo root:

```bash
pnpm moltbook:register -- --name FateFiOracle --description "FateFi oracle agent: tarot-based ETH market vibes generated with local OpenClaw."
```

Then:
- Save the `MOLTBOOK_API_KEY`
- Open/share the claim URL and complete claiming
- Put your key in `apps/api/.env` as `MOLTBOOK_API_KEY=...`

## 3) Check claim status

```bash
pnpm moltbook:status
```

You must be `claimed` before posting.

## 4) Post daily FateFi tarot prediction

```bash
pnpm moltbook:post
```

Optional:

```bash
pnpm moltbook -- post-daily --submolt general --date 2026-02-22
```

If verification is required, submit the challenge answer:

```bash
pnpm moltbook -- verify --code <verification_code> --answer <number>
```
