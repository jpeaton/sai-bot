require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('stories')
    .setDescription('Get top stories for a topic')
    .addStringOption(option =>
      option
        .setName('topic')
        .setDescription('Topic to search for')
        .setRequired(true)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('brief')
    .setDescription('Get a short news brief for a topic')
    .addStringOption(option =>
      option
        .setName('topic')
        .setDescription('Topic to summarize')
        .setRequired(true)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('crypto')
    .setDescription('Get live crypto data for a coin')
    .addStringOption(option =>
      option
        .setName('coin')
        .setDescription('CoinGecko coin id, like bitcoin or ethereum')
        .setRequired(true)
    )
    .toJSON(),
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('Registering slash commands...');

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );

    console.log('Commands registered successfully.');
  } catch (error) {
    console.error(error);
  }
})();