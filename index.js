const Discord = require("discord.js")
const client = new Discord.Client()
const shell = require("shelljs")
const nodeactyl = require("nodeactyl")

client.on("ready", () => {
  console.log("Bot Ready")
});


const app = nodeactyl.Application
const panel = nodeactyl.Client

function c_db(msg, args) {
  var code = args.join(" ")
  var x = "```"
  msg.channel.send(`${x}sql\n${code}${x}`);
  db.run(code, function(err) {
    var x = "``"
    if (err) {
      msg.channel.send(`Execution error: ${x}\nfix${err}${x}`)
    } else {
      msg.channel.send(`Success.`)
    }
  });
}

this.db = {}
this.db.function = c_db
this.db.usage = "+db <code>"
this.db.owneronly = true
this.db.description = "Executes SQLite3."

function c_eval(msg, args) {
  var code = args.join(" ");
  var x = "```"
  msg.channel.send(`${x}js\n${code}${x}`)
  try {
    eval(`var y = ${code}`)
    if (y) {
      msg.channel.send(`Success! Output: ${y}`)
    } else {
      msg.channel.send(`Success! No output.`)
    }
  } catch(err) {
    msg.channel.send(`Error! ${x}fix\n${err}${x}`)
  }
}

this.eval = {}
this.eval.function = c_eval
this.eval.usage = "+eval <code>"
this.eval.owneronly = true
this.eval.description = "Executes JS code."

function c_exec(msg, args) {
  var cmd = args.join(" ")
  var x = "``"
  msg.channel.send(`Executing ${x}${cmd}${x}`)
  var o = shell.exec(cmd).stdout
  msg.channel.send(`Output: ${x}\`${o}${x}\``);
}

this.exec = {};
this.exec.function = c_exec
this.exec.usage = "+exec <code>"
this.exec.owneronly = true
this.exec.description = "Execute a shell command."

function c_update(msg, args) {
  msg.channel.send(`Pulling files from github...`);
  shell.exec("git pull Github")
  setTimeout(function() {
    msg.channel.send(`Restarting...`);
    process.exit(0)
  }, 2500);
}

this.update = {}
this.update.function = c_update
this.update.usage = "update"
this.update.description = "Update the bot to the latest release on github."
this.update.owneronly = true

client.on("message", (msg) => {
  if (msg.author.bot) return
  if (!msg.content.startsWith("+")) return;
  var args = msg.content.trim().split(" ")
  var cmd = args.shift().split("+")[1]
  if (this[cmd]) {
    msg.delete();
    if (this[cmd].owneronly && (msg.author.id != 270035320894914560 && msg.author.id != 388676076294897667)) {
      msg.channel.send("You do not have access to this command!")
      return
    }
    if (this[cmd].permission && this[cmd].permission[0]) {
      var i;
      for (i=0;i<this[cmd].permission.length;i++) {
        var p = this[cmd].permission[i]
        if (!msg.member.hasPermission(p, false, true, true)) {
          msg.channel.send("You do not have permission to use this command.")
          return;
        }
      }
    }
    this[cmd].function(msg, args);
  }
});


setInterval(function() { // 🟢 🔴 🟡 🟤 ❓
  app.getAllServers().then(servers => {
    var statuses = {}
    var i;
    for (i=0;i<servers.length;i++) {
      panel.getServerStatus(servers[i].attributes.identifier).then(status => {
        statuses[servers[i].attributes.name]
      });
    }
    var Bungee = client.guilds.first().channels.find(ch => ch.id == 728016432192946236)
    if (statuses["BungeeCord"] == "on") {
      Bungee.setName("🟢 Proxy 🟢")
    } else if (statuses["BungeeCord"] == "off") {
      Bungee.setName("🔴 Proxy 🔴")
    } else if (statuses["BungeeCord"] == "starting") {
      Bungee.setName("🟡 Proxy 🟡")
    } else if (statuses["BungeeCord"] == "stopping") {
      Bungee.setName("🟤 Proxy 🟤")
    } else {
      Bungee.setName("❓ Proxy ❓")
    }
  });
}, 20500);


client.login(require("./TOKEN.json").TOKEN);
app.login('https://panel.boltmc.net', require("./TOKEN.json").API, (ready, msg) => {
  if (msg) {
    console.warn("Error whilst logging in to admin: " + msg)
  }
  if (ready) {
    console.log("Nodeactyl Admin ready!")
  }
});
panel.login('https://panel.boltmc.net', require("./TOKEN.json").PANEL, (ready, msg) => {
  if (msg) {
    console.warn("Error whilst logging in to client: " + msg)
  }
  if (ready) {
    console.log("Nodeactyl Client ready!")
  }
});
