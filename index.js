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

function c_upload(msg, args) {
  var name = args[0]
  var dir = args[1]
  var url = args[2];
  if (!name || !dir || !url) { msg.channel.send("Incorrect Usage"); return; }
  app.getAllServers().then(servers => {
    var server = servers.filter(function(s) {
      if (s.attributes.name == name) {
        return true
      } else {
        return false
      }
    })
    if (!server[0]) {
      msg.channel.send(`Failed to find server: ${name}`)
      return
    } else {
      server=server[0].attributes;
    }
    if (!dir.startsWith("/")) dir = "/"+dir;
    shell.exec(`cd /srv/daemon/${server.id}${dir}`);
    var o = shell.exec(`wget ${url}`).stdout;
    var x = "```";
    msg.channel.send(`Downloading ${url} to /srv/daemon/${server.id}${dir}.`)
    msg.channel.send(`Download Logs: ${x}${o}${x}`);
  });
}

this.upload = {}
this.upload.function = c_upload
this.upload.usage = "upload <server> <dir> <url>"
this.upload.description = "Upload a file to the directory of a server."
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

function updateStatus(id, name) {
  if (name == "BungeeCord") name = "Proxy"
  var channel = client.guilds.first().channels.find(ch => ch && ch.name && ch.name.split(" ")[1] && ch.name.split(" ")[1].split(" ")[0] == name)
  panel.getServerStatus(id).then(status => {
    if (status == "on") {
      channel.setName(`🟢 ${name} 🟢`)
    } else if (status == "off") {
      channel.setName(`🔴 ${name} 🔴`)
    } else if (status == "starting") {
      channel.setName(`🟡 ${name} 🟡`)
    } else if (status == "stopping") {
      channel.setName(`🟤 ${name} 🟤`)
    } else {
      channel.setName(`❓ ${name} ❓`)
    }
  });
}

setInterval(function() { // 🟢 🔴 🟡 🟤 ❓
  app.getAllServers().then(servers => {
    var i;
    for (i=0;i<servers.length;i++) {
      let id = servers[i].attributes.identifier;
      let name = servers[i].attributes.name;
      updateStatus(id, name)
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
