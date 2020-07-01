const Discord = require("discord.js")
const client = new Discord.Client()

client.on("ready", () => {
  console.log("Bot Ready")
});

client.login(require("./TOKEN.json").TOKEN)
