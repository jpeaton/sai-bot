require("dotenv").config();

const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const commands = [
  new SlashCommandBuilder()
    .setName("build")
    .setDescription("Get a current build for a character")
    .addStringOption((option) =>
      option.setName("game").setDescription("Game name").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("character").setDescription("Character/hero name").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("counter")
    .setDescription("Get counters for a character")
    .addStringOption((option) =>
      option.setName("game").setDescription("Game name").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("target").setDescription("Character to counter").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("coach")
    .setDescription("Get short coaching advice")
    .addStringOption((option) =>
      option.setName("game").setDescription("Game name").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("situation").setDescription("What is happening?").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("patch")
    .setDescription("Summarize the latest patch/meta changes")
    .addStringOption((option) =>
      option.setName("game").setDescription("Game name").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("topic").setDescription("Optional focus area").setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("compare")
    .setDescription("Compare two characters/items/options")
    .addStringOption((option) =>
      option.setName("game").setDescription("Game name").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("option1").setDescription("First option").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("option2").setDescription("Second option").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("brief")
    .setDescription("Give a short explanation or summary")
    .addStringOption((option) =>
      option.setName("topic").setDescription("What to explain briefly").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("story")
    .setDescription("Tell a short story about something")
    .addStringOption((option) =>
      option.setName("topic").setDescription("Topic for the story").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("crypto")
    .setDescription("Give a quick crypto explainer or outlook")
    .addStringOption((option) =>
      option.setName("topic").setDescription("Coin, token, or crypto topic").setRequired(true)
    ),
].map((command) => command.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("Registering slash commands...");

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );

    console.log("Slash commands registered.");
  } catch (error) {
    console.error(error);
  }
})();