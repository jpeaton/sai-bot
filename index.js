require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
} = require("discord.js");
const OpenAI = require("openai");
const fetch = require("node-fetch");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const WAKE_PREFIXES = ["hey sai", "sai", "@sai"];

/* =========================
   WAKE PHRASE HELPERS
========================= */

function shouldTrigger(content) {
  const text = content.trim().toLowerCase();
  return WAKE_PREFIXES.some((prefix) => text.startsWith(prefix));
}

function stripWakePhrase(content) {
  let text = content.trim();

  for (const prefix of WAKE_PREFIXES) {
    const regex = new RegExp(`^${prefix}[,!: ]*`, "i");
    if (regex.test(text)) {
      return text.replace(regex, "").trim();
    }
  }

  return text;
}

/* =========================
   AI PROMPTS
========================= */

function buildPrompt({ mode, game, question, extra = {} }) {
  const gameName = game || "the game the user is asking about";

  const modeInstructions = {
    build: `
You are Sai, a sharp Discord gaming advisor.
The user wants the BEST CURRENT BUILD.
Reply in SHORT Discord-friendly format:
1) One-line verdict
2) Core build/items
3) Why it works
4) Optional alternate build
Keep it under 140 words unless necessary.
If current info matters, prioritize recent live/meta info.
`,

    counter: `
You are Sai, a sharp Discord gaming advisor.
The user wants COUNTERS / matchup advice.
Reply in SHORT format:
1) Best counters
2) Why they work
3) One practical tip
Keep it under 140 words unless necessary.
If current meta matters, prioritize recent live info.
`,

    coach: `
You are Sai, a practical gaming coach in Discord.
The user wants improvement advice.
Reply in SHORT format:
1) Most likely issue
2) 2-3 fixes
3) One build/playstyle adjustment
Be direct, useful, slightly confident, not cringe.
Keep it under 160 words.
`,

    patch: `
You are Sai, a gaming patch-note explainer.
Reply in SHORT format:
1) What changed
2) What matters most
3) Who/what got better or worse
Keep it under 160 words.
Prioritize live/current info.
`,

    compare: `
You are Sai, a gaming advisor comparing two options.
Reply in SHORT format:
1) Quick winner
2) When to pick each
3) Simple recommendation
Keep it under 150 words.
`,

    brief: `
You are Sai.
Give a very short, clear, Discord-friendly explanation.
Usually under 80 words.
`,

    story: `
You are Sai.
Tell a short funny or entertaining story about the user's topic.
Keep it readable and not too long.
Usually under 140 words.
`,

    general: `
You are Sai, a Discord gaming advisor.
Only answer as a SHORT practical gaming helper.
Do not ramble.
Prefer bullets or very short sections.
If the question depends on current meta, patch state, balance, builds, tier lists, or recent updates, use live info.
Keep it under 160 words.
`,
  };

  return `
${modeInstructions[mode] || modeInstructions.general}

Game: ${gameName}
User question: ${question}

Extra context:
${JSON.stringify(extra, null, 2)}

Style:
- concise
- practical
- Discord-friendly
- slight attitude is okay
- no fake certainty
- if live info is weak or mixed, say so briefly
`;
}

async function askSai({ mode = "general", game, question, extra = {} }) {
  const prompt = buildPrompt({ mode, game, question, extra });

  const liveInfoNeeded =
    /(meta|current|right now|latest|patch|updated|best build|counter|tier|buff|nerf|guide|build order|matchup)/i.test(
      question
    );

  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    tools: liveInfoNeeded ? [{ type: "web_search" }] : [],
    input: prompt,
  });

  return response.output_text?.trim() || "Sai came back blank.";
}

/* =========================
   CRYPTO HELPERS
========================= */

const COIN_MAP = {
  btc: { id: "bitcoin", name: "Bitcoin", symbol: "BTC" },
  eth: { id: "ethereum", name: "Ethereum", symbol: "ETH" },
  sol: { id: "solana", name: "Solana", symbol: "SOL" },
  xrp: { id: "ripple", name: "XRP", symbol: "XRP" },
  doge: { id: "dogecoin", name: "Dogecoin", symbol: "DOGE" },
  ada: { id: "cardano", name: "Cardano", symbol: "ADA" },
  avax: { id: "avalanche-2", name: "Avalanche", symbol: "AVAX" },
};

function formatMoney(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "N/A";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function getStatus(change) {
  if (change === null || change === undefined || Number.isNaN(change)) {
    return "Unknown";
  }
  if (change > 0.5) return "Up";
  if (change < -0.5) return "Down";
  return "Flat-ish";
}

async function getCryptoSnapshot(symbolInput) {
  const symbol = symbolInput.toLowerCase().trim();
  const coin = COIN_MAP[symbol];

  if (!coin) {
    throw new Error(
      `Unsupported coin: ${symbol}. Supported: ${Object.keys(COIN_MAP).join(", ")}`
    );
  }

  const apiKey = process.env.COINGECKO_API_KEY;
  if (!apiKey) {
    throw new Error("Missing COINGECKO_API_KEY in Railway variables.");
  }

  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coin.id}&price_change_percentage=24h`;

  const response = await fetch(url, {
    headers: {
      "x-cg-demo-api-key": apiKey,
      accept: "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`CoinGecko failed: ${response.status} ${body}`);
  }

  const data = await response.json();
  const item = data[0];

  if (!item) {
    throw new Error(`No CoinGecko data found for ${coin.id}`);
  }

  return {
    inputSymbol: symbol,
    name: coin.name,
    symbol: coin.symbol,
    price: item.current_price,
    change24h: item.price_change_percentage_24h,
    marketCap: item.market_cap,
    volume24h: item.total_volume,
    rank: item.market_cap_rank,
    receivedAt: new Date(),
  };
}

async function getCryptoNews(symbolInput, coinName) {
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) return null;

  const q = encodeURIComponent(`${coinName} OR ${symbolInput.toUpperCase()} crypto`);
  const url = `https://gnews.io/api/v4/search?q=${q}&lang=en&max=1&apikey=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (!data.articles || !data.articles.length) return null;

    return data.articles[0];
  } catch (error) {
    console.error("GNews error:", error);
    return null;
  }
}

async function buildCryptoMessage(symbolInput) {
  const snapshot = await getCryptoSnapshot(symbolInput);
  const news = await getCryptoNews(symbolInput, snapshot.name);

  return [
    `**${snapshot.name} (${snapshot.symbol})**`,
    `Numbers are moving. Interpret that however you want.`,
    ``,
    `**Live crypto snapshot for ${snapshot.inputSymbol}.**`,
    ``,
    `**Price:** ${formatMoney(snapshot.price)}`,
    `**24h Change:** ${formatPercent(snapshot.change24h)}`,
    `**Status:** ${getStatus(snapshot.change24h)}`,
    `**Market Cap:** ${formatMoney(snapshot.marketCap)}`,
    `**24h Volume:** ${formatMoney(snapshot.volume24h)}`,
    `**Market Cap Rank:** #${snapshot.rank ?? "N/A"}`,
    `**Date/time received:** ${snapshot.receivedAt.toLocaleString("en-US")}`,
    news ? `**News:** ${news.title}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

/* =========================
   DISCORD EVENTS
========================= */

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Sai Bot is online as ${readyClient.user.tag}`);
  console.log(`Bot user ID: ${readyClient.user.id}`);
});

client.on(Events.MessageCreate, async (message) => {
  try {
    if (message.author.bot) return;
    if (!shouldTrigger(message.content)) return;

    const userQuestion = stripWakePhrase(message.content);

    if (!userQuestion) {
      await message.reply("yeah?");
      return;
    }

    await message.channel.sendTyping();

    const answer = await askSai({
      mode: "general",
      game: "video games / likely Deadlock, CS2, or similar multiplayer titles",
      question: userQuestion,
      extra: {
        source: "natural chat trigger",
        user: message.author.username,
      },
    });

    await message.reply(answer);
  } catch (error) {
    console.error("Message handler error:", error);
    await message.reply("Sai bricked the lookup. Try again in a sec.");
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    await interaction.deferReply();

    let answer = "";

    if (interaction.commandName === "build") {
      const game = interaction.options.getString("game");
      const character = interaction.options.getString("character");

      answer = await askSai({
        mode: "build",
        game,
        question: `What is the best current build for ${character} in ${game}?`,
        extra: { character },
      });

      await interaction.editReply(answer);
      return;
    }

    if (interaction.commandName === "counter") {
      const game = interaction.options.getString("game");
      const target = interaction.options.getString("target");

      answer = await askSai({
        mode: "counter",
        game,
        question: `What are the best current counters to ${target} in ${game}?`,
        extra: { target },
      });

      await interaction.editReply(answer);
      return;
    }

    if (interaction.commandName === "coach") {
      const game = interaction.options.getString("game");
      const situation = interaction.options.getString("situation");

      answer = await askSai({
        mode: "coach",
        game,
        question: `Coach me in ${game}. Situation: ${situation}`,
        extra: { situation },
      });

      await interaction.editReply(answer);
      return;
    }

    if (interaction.commandName === "patch") {
      const game = interaction.options.getString("game");
      const topic =
        interaction.options.getString("topic") || "latest patch/meta changes";

      answer = await askSai({
        mode: "patch",
        game,
        question: `Summarize the latest important patch/meta changes for ${game}. Focus on ${topic}.`,
        extra: { topic },
      });

      await interaction.editReply(answer);
      return;
    }

    if (interaction.commandName === "compare") {
      const game = interaction.options.getString("game");
      const option1 = interaction.options.getString("option1");
      const option2 = interaction.options.getString("option2");

      answer = await askSai({
        mode: "compare",
        game,
        question: `Compare ${option1} vs ${option2} in ${game}. Which is better right now and when should each be picked?`,
        extra: { option1, option2 },
      });

      await interaction.editReply(answer);
      return;
    }

    if (interaction.commandName === "brief") {
      const topic = interaction.options.getString("topic");

      answer = await askSai({
        mode: "brief",
        question: `Explain briefly: ${topic}`,
        extra: { topic },
      });

      await interaction.editReply(answer);
      return;
    }

    if (interaction.commandName === "story") {
      const topic = interaction.options.getString("topic");

      answer = await askSai({
        mode: "story",
        question: `Tell a short story about: ${topic}`,
        extra: { topic },
      });

      await interaction.editReply(answer);
      return;
    }

    if (interaction.commandName === "crypto") {
      const coin = interaction.options.getString("coin");
      const cryptoMessage = await buildCryptoMessage(coin);

      await interaction.editReply(cryptoMessage);
      return;
    }

    await interaction.editReply("Sai loaded in but forgot the strat.");
  } catch (error) {
  console.error("Interaction error:", error);

  const msg = error?.message
    ? `Sai hit an error: ${error.message}`
    : "Sai hit an unknown error.";

  if (interaction.deferred || interaction.replied) {
    await interaction.editReply(msg);
  } else {
    await interaction.reply({
      content: msg,
      ephemeral: true,
    });
  }
}
});

client.login(process.env.DISCORD_TOKEN);