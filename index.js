console.log("Sai Bot starting...");
require('dotenv').config();

const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const trustedSources = [
  'reuters.com',
  'apnews.com',
  'bloomberg.com',
  'wsj.com',
  'ft.com',
  'cnbc.com',
  'theverge.com',
  'techcrunch.com',
  'coindesk.com',
  'cointelegraph.com',
  'ign.com',
  'espn.com',
  'bbc.com',
  'nytimes.com',
];

const importanceKeywords = [
  'earnings',
  'acquisition',
  'acquire',
  'merger',
  'lawsuit',
  'sues',
  'settlement',
  'launch',
  'released',
  'release',
  'announces',
  'announcement',
  'partnership',
  'investigation',
  'probe',
  'breach',
  'hack',
  'security',
  'layoffs',
  'cuts',
  'surge',
  'drop',
  'plunge',
  'rally',
  'approval',
  'ban',
  'tariff',
  'deal',
  'expansion',
  'funding',
  'raises',
];

const coinAliases = {
  btc: 'bitcoin',
  xbt: 'bitcoin',
  eth: 'ethereum',
  sol: 'solana',
  xrp: 'ripple',
  ada: 'cardano',
  doge: 'dogecoin',
  dot: 'polkadot',
  avax: 'avalanche-2',
  link: 'chainlink',
  matic: 'matic-network',
  uni: 'uniswap',
  ltc: 'litecoin',
  bch: 'bitcoin-cash',
  atom: 'cosmos',
  etc: 'ethereum-classic',
  xlm: 'stellar',
  near: 'near',
  algo: 'algorand',
  vet: 'vechain',
  fil: 'filecoin',
  icp: 'internet-computer',
  apt: 'aptos',
  arb: 'arbitrum',
  op: 'optimism',
  inj: 'injective-protocol',
  aave: 'aave',
  pepe: 'pepe',
  shib: 'shiba-inu',
  trx: 'tron',
  ton: 'the-open-network',
  sui: 'sui',
  hbar: 'hedera-hashgraph',
  cro: 'crypto-com-chain',
  kas: 'kaspa',
  rndr: 'render-token',
  tao: 'bittensor',
  fet: 'fetch-ai',
  tia: 'celestia',
  sei: 'sei-network',
  jup: 'jupiter-exchange-solana',
  wif: 'dogwifcoin',
  bonk: 'bonk',
  floki: 'floki',
  ena: 'ethena',
};

function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}


const saiTone = {
  stories: [
    "Pulled the headlines. It’s giving… ongoing events.",
    "Here’s what the timeline is yapping about right now.",
    "Filtered the noise. Most of it was mid.",
    "These are the stories people are gonna pretend they read.",
    "Sai checked. The lore is evolving again.",
    "Here’s what escaped the content abyss.",
    "Breaking: things are, in fact, happening.",
  ],
  brief: [
    "Condensed it. Your attention span is safe.",
    "Here’s the TLDR before your brain alt-tabs.",
    "Sai read it so you can stay in your scrolling era.",
    "This is the actual gist, minus the NPC dialogue.",
    "Summarized it. You’re welcome, stay focused king.",
    "Here’s the main storyline before it gets retconned.",
    "Pulled the thread so you don’t have to piece the lore together.",
  ],
  crypto: [
    "Sai checked the charts. It’s looking… emotional.",
    "Live market check. Vibes are questionable.",
    "Numbers are moving. Interpret that however you want.",
    "Here’s the coin before someone calls it generational again.",
    "Market status: spiritually volatile.",
    "Checked the coin. It is either cooking or getting cooked.",
    "Crypto continues to be one of the ecosystems of all time.",
  ]
};

const saiReplies = [
  "this just does not get my attention like you thought it would",
  "i expect very little",
  "get a load of this retard",
  "im bracing for impact",
  "ok lil bro",
  "i expect very little and you're still testing that",
  "-10,000 aura",
  "alright man",
  "ok relax",
  "say less. no like actually say less",
  "im gonna need you to tone it down a bit buddy",
  "im unmoved",
  "ok we got it big bro",
  "cornball head ahh",
];

const saiGreetings = [
  "what",
  "you good brodie?",
  "what do you need",
  "bro gave a greeting",
  "you had something to say?",
  "go ahead",
  "this better be something",
  "what is up my guy",
  "i’m listening. for now",
  "don’t start something you can’t finish",
];

let saiRepliesPool = shuffle([...saiReplies]);
let saiGreetingsPool = shuffle([...saiGreetings]);

function getNextReply() {
  if (saiRepliesPool.length === 0) {
    saiRepliesPool = shuffle([...saiReplies]);
  }
  return saiRepliesPool.pop();
}

function getNextGreeting() {
  if (saiGreetingsPool.length === 0) {
    saiGreetingsPool = shuffle([...saiGreetings]);
  }
  return saiGreetingsPool.pop();
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return '';
  }
}

function scoreArticle(article) {
  let score = 0;

  const title = (article.title || '').toLowerCase();
  const description = (article.description || '').toLowerCase();
  const content = `${title} ${description}`;
  const domain = getDomain(article.url);

  if (trustedSources.includes(domain)) {
    score += 3;
  }

  for (const word of importanceKeywords) {
    if (content.includes(word)) {
      score += 2;
    }
  }

  const publishedAt = new Date(article.publishedAt).getTime();
  const now = Date.now();
  const hoursOld = (now - publishedAt) / (1000 * 60 * 60);

  if (hoursOld <= 12) score += 3;
  else if (hoursOld <= 24) score += 2;
  else if (hoursOld <= 48) score += 1;

  return score;
}

function dedupeArticles(articles) {
  const seen = new Set();

  return articles.filter((article) => {
    const normalizedTitle = (article.title || '')
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .trim();

    if (seen.has(normalizedTitle)) {
      return false;
    }

    seen.add(normalizedTitle);
    return true;
  });
}

function buildBrief(topic, articles) {
  const combinedText = articles
    .map(article => `${article.title || ''} ${article.description || ''}`)
    .join(' ')
    .toLowerCase();

  const themes = [];

  if (combinedText.includes('earnings') || combinedText.includes('revenue') || combinedText.includes('profit')) {
    themes.push('financial results');
  }

  if (combinedText.includes('launch') || combinedText.includes('release') || combinedText.includes('announcement')) {
    themes.push('new product or feature announcements');
  }

  if (combinedText.includes('lawsuit') || combinedText.includes('investigation') || combinedText.includes('probe')) {
    themes.push('legal or regulatory developments');
  }

  if (combinedText.includes('hack') || combinedText.includes('breach') || combinedText.includes('security')) {
    themes.push('security-related issues');
  }

  if (combinedText.includes('partnership') || combinedText.includes('deal') || combinedText.includes('acquisition') || combinedText.includes('merger')) {
    themes.push('business deals or partnerships');
  }

  if (combinedText.includes('layoffs') || combinedText.includes('cuts') || combinedText.includes('jobs')) {
    themes.push('workforce or restructuring news');
  }

  if (combinedText.includes('market') || combinedText.includes('stock') || combinedText.includes('shares') || combinedText.includes('surge') || combinedText.includes('drop')) {
    themes.push('market movement');
  }

  let summary = `Sai pulled the strongest recent coverage for **${topic}**, but the stories are pretty mixed right now.`;

  if (themes.length === 1) {
    summary = `Recent coverage around **${topic}** is mainly focused on ${themes[0]}.`;
  } else if (themes.length === 2) {
    summary = `Recent coverage around **${topic}** is mainly focused on ${themes[0]} and ${themes[1]}.`;
  } else if (themes.length >= 3) {
    summary = `Recent coverage around **${topic}** is centered on ${themes[0]}, ${themes[1]}, and ${themes[2]}.`;
  }

  return {
    summary,
  };
}

async function fetchRankedArticles(topic) {
  const apiKey = process.env.GNEWS_API_KEY;

  if (!apiKey) {
    throw new Error('Missing GNews API key in .env');
  }

  const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(topic)}&lang=en&max=10&token=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!data.articles || data.articles.length === 0) {
    return [];
  }

  const cleanedArticles = dedupeArticles(data.articles);

  return cleanedArticles
    .map(article => ({
      ...article,
      score: scoreArticle(article),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function formatUsd(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 1 ? 2 : 6,
  }).format(value);
}

function formatLargeNumber(value) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value);
}

client.once('ready', () => {
  console.log(`Sai Bot is online as ${client.user.tag}`);
  console.log('Bot user ID:', client.user.id);
});

client.on('messageCreate', (message) => {
  if (message.author.bot) return;

  const content = message.content.toLowerCase();
  console.log("message seen:", content);

  const greetingPatterns = [
  /\bhey\b/,
  /\bhi\b/,
  /\bhello\b/,
  /\byo\b/,
  /\bwhat's up\b/,
  /\bsup\b/,
  /\bhey there\b/,
  /\bgreetings\b/,
  /\bsalutations\b/,
  /\bwassup\b/,
  /\bhowdy\b/,
  /\bhiya\b/,
  /\baye\b/,
  /\bhello there\b/,
  /\bhi there\b/,
  /\bhey bot\b/,
  /\bhello bot\b/,
  /\byo bot\b/
];

const isGreeting = greetingPatterns.some((pattern) => pattern.test(content));

if (content.includes("sai")) {
  const reply = isGreeting ? getNextGreeting() : getNextReply();

  setTimeout(() => {
    message.reply(reply);
  }, 2000); // 2000ms = 2 seconds
}
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'stories') {
    const topic = interaction.options.getString('topic');

    await interaction.deferReply();

    try {
      const rankedArticles = await fetchRankedArticles(topic);

      if (rankedArticles.length === 0) {
        await interaction.editReply(`Sai found no major stories for **${topic}** right now.`);
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`Top stories for: ${topic}`)
        .setDescription(pick(saiTone.stories))
        .setTimestamp();

      rankedArticles.forEach((article, index) => {
        const domain = getDomain(article.url);
        embed.addFields({
          name: `${index + 1}. ${article.title}`,
          value: `[Read more](${article.url}) • ${domain}`,
        });
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.editReply('Sai ran into an issue pulling stories.');
    }
  }

  if (interaction.commandName === 'brief') {
    const topic = interaction.options.getString('topic');

    await interaction.deferReply();

    try {
      const rankedArticles = await fetchRankedArticles(topic);

      if (rankedArticles.length === 0) {
        await interaction.editReply(`Sai found no major stories for **${topic}** right now.`);
        return;
      }

      const brief = buildBrief(topic, rankedArticles);

      const embed = new EmbedBuilder()
        .setTitle(`Brief for: ${topic}`)
        .setDescription(`${pick(saiTone.brief)}\n\n${brief.summary}`)
        .addFields({
          name: 'Main headlines',
          value: rankedArticles.map((article, index) => `${index + 1}. ${article.title}`).join('\n'),
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.editReply('Sai ran into an issue building the brief.');
    }
  }

  if (interaction.commandName === 'crypto') {
    const userInput = interaction.options.getString('coin').toLowerCase();
    const coin = coinAliases[userInput] || userInput;
    await interaction.deferReply();

    try {
      const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${encodeURIComponent(coin)}`;

      const response = await fetch(url);
      const data = await response.json();

      if (!Array.isArray(data) || data.length === 0) {
        await interaction.editReply(`Sai couldn't find crypto data for **${userInput}**. Try something like **btc**, **eth**, **sol**, **xrp**, or a full CoinGecko id like **bitcoin**.`);
        return;
      }

      const coinData = data[0];
      const change24h = coinData.price_change_percentage_24h ?? 0;
      const direction = change24h >= 0 ? 'Up' : 'Down';

      const embed = new EmbedBuilder()
        .setTitle(`${coinData.name} (${coinData.symbol.toUpperCase()})`)
        .setDescription(`${pick(saiTone.crypto)}\n\nLive crypto snapshot for **${userInput}**.`)
        .addFields(
          {
            name: 'Price',
            value: formatUsd(coinData.current_price),
            inline: true,
          },
          {
            name: '24h Change',
            value: `${change24h.toFixed(2)}%`,
            inline: true,
          },
          {
            name: 'Status',
            value: direction,
            inline: true,
          },
          {
            name: 'Market Cap',
            value: formatUsd(coinData.market_cap),
            inline: true,
          },
          {
            name: '24h Volume',
            value: formatUsd(coinData.total_volume),
            inline: true,
          },
          {
            name: 'Market Cap Rank',
            value: `#${coinData.market_cap_rank}`,
            inline: true,
          }
        )
        .setTimestamp();
        

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.editReply('Sai ran into an issue pulling crypto data.');
    }
  }
});

client.login(process.env.TOKEN).catch(console.error);