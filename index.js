const Discord = require("discord.js")
const client = new Discord.Client()

client.on("ready", () => {
  console.log("Bot Ready")
});

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

client.on("message", (msg) => {
  if (msg.author.bot) return
  if (!msg.content.startsWith("+")) return;
  var args = msg.content.trim().split(" ")
  var cmd = args.shift().lowercase()
  if (this[cmd]) {
    msg.delete();
    if (this[cmd].owneronly && msg.author.id != 270035320894914560) {
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

client.login(require("./TOKEN.json").TOKEN)
