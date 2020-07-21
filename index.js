const Discord = require("discord.js")
const client = new Discord.Client()
const { RichEmbed } = require("discord.js");
const shell = require("shelljs")
const nodeactyl = require("nodeactyl")
const express = require("express")
const bp = require("body-parser")
const fs = require("fs")
const priv = fs.readFileSync('/etc/letsencrypt/live/panel.boltmc.net/privkey.pem').toString();
const cert = fs.readFileSync('/etc/letsencrypt/live/panel.boltmc.net/cert.pem').toString();
const w = express();
const https = require("https");
const os = require("os");
const applys = require("./apply.js"); // start the applybot
const got = require("got")
const sqlite3 = require("sqlite3").verbose();
const mysql = require("mysql")
const db = new sqlite3.Database("data.db")
const decode64 = require("Base64").atob;
const Encode64 = require("Base64").btoa;

db.serialize()

w.use(bp.json())
w.use(bp.urlencoded({extended: true}))

w.get("/", (req, res) => { // ensure the web server is operational
  res.sendStatus(200)
});

w.post("/trello", (req, res) => {
  console.log("Trello Webhook Request");
  console.log(JSON.stringify(req.body));
  var action = req.body.action.type;
  if (!action) {
    res.status(400).end();
    return;
  }
  switch (action) {
    case "commentCard":
      var e = new RichEmbed;
      e.setTitle(req.body.action.data.card.name);
      e.setAuthor(req.body.action.memberCreator.fullName);
      e.setTimestamp(req.body.action.date);
      e.setDescription(req.body.action.data.text)
      client.trello.send(`Comment Added`, e);
      break;
    default:
      res.status(400).end();
      return;
  };
  res.sendStatus(200);
});

w.get("/trello", (req, res) => {
  res.sendStatus(200)
});

w.post("/players", (req, res) => {
  if (req.query.server && req.body.players) {
    db.run(`DELETE FROM players WHERE server=?`, req.query.server);
    var i;
    var p = JSON.parse(req.body.players)
    for (i=0;i<p.length;i++) {
      db.run(`INSERT INTO players ("server", "player") VALUES (@0, @1)`, req.query.server, p[i]);
    }
    res.sendStatus(200)
  } else {
    res.status(400).end("server or players invalid")
  }
});

w.get("/products", (req, res) => {
  db.all(`SELECT * FROM products`, function(err, rows) {
    if (err) throw err;
    res.set("Access-Control-Allow-Origin", "*").json(rows);
  });                                  
});                                                                                                       

w.get("/manage", (req, res) => {
  if (!req.headers.authorization) {
    res.set("WWW-Authenticate", "Basic").sendStatus(401);
    return;                                                           
  }
  var auth = decode64(req.headers.authorization.split(" ")[1]);
  if (require("./TOKEN.json").ACCS.includes(auth)) {
    res.sendFile("/home/Wyatt/bot/views/manage.html")
  } else {
    res.sendStatus(403);
  }
});

w.post("/shop/add", (req, res) => {
  if (!req.headers.authorization) {
    res.set("WWW-Authenticate", "Basic").sendStatus(401);
    return;                                                           
  }
  var auth = decode64(req.headers.authorization.split(" ")[1]);
  if (require("./TOKEN.json").ACCS.includes(auth)) {
    db.run(`INSERT INTO products ("name", "category", "price", "description", "method", "methodparam") VALUES (@0, @1, @2, @3, @4, @5)`, req.body.name, req.body.category, req.body.price, req.body.description);
    res.redirect("/manage")
  } else {
    res.sendStatus(403);
  }
});

w.post("/shop/del", (req, res) => {
  if (!req.headers.authorization) {
    res.set("WWW-Authenticate", "Basic").sendStatus(401);
    return;                                                           
  }
  var auth = decode64(req.headers.authorization.split(" ")[1]);
  if (require("./TOKEN.json").ACCS.includes(auth)) {
    db.run(`DELETE FROM products WHERE name=?`, req.body.name);
    res.redirect("/manage")
  } else {
    res.sendStatus(403);
  }
});

w.options("/payment", (req, res) => {
  res.set("Access-Control-Allow-Origin", "*").set("Access-Control-Allow-Methods", "POST, OPTIONS").set("Access-Control-Allow-Headers", "Content-Type").sendStatus(204);
});

function payment(details, row) {
  if (!details || !row) return false;
  var embed = new RichEmbed;
  var fn = details.payer.name.given_name || "<No Name Specified>"
  var ln = details.payer.name.surname || ""
  embed.setAuthor(`${fn} ${ln}`);
  embed.setTitle(`Purchase of ${details.product.name}`);
  embed.addField(`Spent`, details.product.price);
  var d = new Date(details.create_time)
  embed.setTimestamp(d);
  embed.setFooter(`Wonderful Bot + Payment Handling by WyattL#3477`)
  embed.addField(`Username`, details.Username);
  embed.addField(`Transaction ID`, details.id);
  client.channels.find(ch => ch.name.includes("purchases")).send(embed);
  switch (row.method) {
    case "None": 
      // Awesome! Don't do anything!
      break;
    case "Rank":
      // Get the UUID of the user.
      var pool = mysql.createConnection({host: "api.boltmc.net", user: "luckperms", password: require("./TOKEN.json").lpdb, database: "luckperms"})
        pool.connect(err => {
          if (err) {
            console.log(`Error while connecting to SQL: ${err}`);
            client.channels.find(ch => ch.name.includes("purchases")).send(`Error while connecting to SQL: ${err}. Rank not applied.`);
            return false;
          } else {
            console.log(`Connected to LuckPerms SQL`)
            var q = `SELECT * FROM luckperms_players WHERE username=?`
            pool.query(q, details.Username, (err, rows) => {
              if (err) {
                client.channels.find(ch => ch.name.includes("purchases")).send("SQL error whilst applying rank to " + details.Username + ", attempted to find UUID. Error: " + err + ". Rank not applied.");
                throw err;
              }
              if (!rows || !rows[0]) {
                client.channels.find(ch => ch.name.includes("purchases")).send("Unable to find UUID for user " + details.Username + ". Rank not applied.");
                return false;
              }
              rows = rows[0]
              console.log(`Found UUID for ${details.Username}: ${rows.uuid}!`);
              var q = `INSERT INTO luckperms_user_permissions (uuid, permission, value, server, world, expiry, contexts) VALUES ("${rows.uuid}", "group.${row.methodparam}", "1", "global", "global", "0", "{}")`
              pool.query(q, function(error) {
                if (error) {
                  client.channels.find(ch => ch.name.includes("purchases")).send("SQL error whilst applying their rank: " + error + ". Rank not applied.");
                  throw error;
                }
              });
              client.channels.find(ch => ch.name.includes("purchases")).send(row.methodparam + " should of been added to " + details.Username + ". Hopefully.");
            });
          };
        });
      break;
    default:
      client.channels.find(ch => ch.name.includes("purchases")).send(`There was a issue whilst applying the above purchase. Application Method Unknown`);
      break;
  }
}

w.post("/payment", (req, res) => {
  if (!req.body.details && !req.body.id) {
    res.set("Access-Control-Allow-Origin", "*").end("There were issues with your request. [5]");
    return;
  }
  var details = req.body;
  var item = details.product;
  var product = item;
  var paid = details.purchase_units[0].amount.value;
  var cur = details.purchase_units[0].amount.currency;
  if (cur == "USD" && (product.price != paid)) {
    res.set("Access-Control-Allow-Origin", "*").end(`There were issues verifying your payment. [1]`);
    return;
  }
  db.get(`SELECT * FROM products WHERE name=@0 AND price=@1`, product.name, product.price, function(err, row) {
    if (err) {
      res.set("Access-Control-Allow-Origin", "*").end(`[2] SQL ERROR: ${err}`);
      throw err;
    }
    if (!row) {
      res.set("Access-Control-Allow-Origin", "*").end(`There were issues verifying your payment. [3]`);
      return;
    }
    var ID = require("./TOKEN.json").PAYID;
    var SEC = require("./TOKEN.json").PAYSEC;
    var auth = Encode64(`${ID}:${SEC}`);
    var url = `https://api.sandbox.paypal.com/v1/oauth2/token`;
    var r = got.post(url, {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": `x-www-form-urlencoded`
      },
      body: {
        "grant_type": "client_credentials"
      }
    }).then(r => {
      console.log(r.body);
      console.log(r.status);
      console.log(r.statusCode);
      console.log(r.statusText);
      var token = JSON.parse(r.body).access_token;
      console.log(token);
      var url = details.links[0].href;
      var r = got.get(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }).then(r => {
        var data = JSON.parse(r.body);
        if (data && r.statusCode == 200) {
          res.set("Access-Control-Allow-Origin", "*").end(`Success. [0]`);
          payment(details, row);
        }
      });
    });
  });
});

client.on("ready", () => {
  console.log("Bot Ready");
  client.trello = client.channels.find(ch => ch.name.includes("trello"));
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

function c_dball(msg, args) {
  var code = args.join(" ");
  var x = "```"
  msg.channel.send(`${x}sql\n${code}${x}`)
  db.all(code, function(err, rows) {
    if (err) {
      var x = "``"
      msg.channel.send(`Execution error: ${x}\nfix${err}${x}`);
    } else {
      if (rows && rows[0]) {
        var x = "```";
        msg.channel.send(`${x}json\n${JSON.stringify(rows)}${x}`);
      } else {
        msg.channel.send(`No results.`)
      }
    }
  });
};

this.dball = {};
this.dball.function = c_dball;
this.db.usage = "+dball <code>"
this.db.owneronly = true;
this.db.description = "Queries SQLite3"

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
  msg.channel.send(`Pulling files from github...`).then(ms => {
    shell.exec("git pull Github")
    ms.edit("Restarting...");
    setTimeout(function() {
      process.exit(0)
    }, 2500);
  });
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
    var target = `/srv/daemon-data/${server.uuid}${dir}`
    var o = shell.exec(`wget -P ${target} ${url}`)
    var x = "``";
    msg.channel.send(`Downloading ${x}${url}${x} to ${x}${target}${x}.`)
  });
}

this.upload = {}
this.upload.function = c_upload
this.upload.usage = "upload <server> <dir> <url>"
this.upload.description = "Upload a file to the directory of a server."
this.upload.owneronly = true

function c_install(msg, args) {
  var name = args.shift();
  var plugin = args.join(" ");
  if (!name || !plugin) { msg.channel.send(`Incorrect Usage`); return; }
  app.getAllServers().then(servers => {
    var server = servers.filter(function(s) {
      if (s.attributes.name == name) {
        return true;
      } else {
        return false;
      }
    })
    if (!server[0]) {
      msg.channel.send(`Failed to find server: ${name}`)
      return
    } else {
      server=server[0].attributes
    }
    got(`https://api.spiget.org/v2/search/resources/${plugin}?field=name&size=30&page=1`).then(req => {
      var res = JSON.parse(req.body);
      var plugins = res.sort(function(a, b) {
        return a.downloads-b.downloads
      });
      var e = new RichEmbed;
      e.setTitle("Spigot Plugin Listing")
      e.setDescription("Please select which plugin you want to install.");
      var options = {};
      var reactions = [
        "🟣", // 1
        "🔵", // 2
        "🟢", // 3
        "🔴", // 4
        "🟡" // 5
      ]
      for (i=0;i<5;i++) {
        var p = plugins[i];
        if (!p) break;
        e.addField(`[${reactions[i]}] ${p.name}`, `${p.tag}`);
        options[reactions[i]] = p;
      }
      e.setFooter("Bot courtesy of WyattL#3477");
      msg.channel.send(e).then(ms => {
        var i;
        for (i=0;i<reactions.length;i++) {
          if (!options[reactions[i]]) break;
          ms.react(reactions[i])
        }
        const filter = (reaction, user) => user.id == msg.author.id;
        const collector = ms.createReactionCollector(filter, { time: 15000 });
        collector.on('collect', r => {
          if (true) {
            if (true) {
              ms.clearReactions()
              collector.stop()
              if (options[r.emoji.name]) {
                ms.edit("Please wait...");
                var url = options[r.emoji.name].file.url;
                var name = options[r.emoji.name].name;
                var { CloudKicker } = require("cloudkicker");
                var request = require("request");
                const cloudkicker = new CloudKicker();
                cloudkicker.get("https://spigotmc.org").then(index => {
                  const options = {
                    encoding: "utf-8",
                    jar: cloudkicker.cookieJar,
                    method: "GET",
                    url: `https://spigotmc.org/${url}`,
                  };
                  request(options).pipe(fs.createWriteStream(`/srv/daemon-data/${server.uuid}/plugins/${name}.jar`));
                  ms.edit(`${name} has been installed!`)
                });
              } else {
                ms.edit("Invalid Plugin Selection")
              }
            } else {
              r.remove(r.user);
            }
          }
        });
        collector.on('end', collected => {
          if (collected < 1) {
            ms.clearReactions();
            ms.edit("You did not react in time.");
          }
        });
      });
    });
  });
};
  
this.install = {};
this.install.function = c_install;
this.install.usage = "install <server> <plugin>"
this.install.description = "Install a plugin onto a server."
this.install.owneronly = true

function c_plugins(msg, args) {
  app.getAllServers().then(servers => {
    var server = servers.filter(function(s) {
      if (s.attributes.name == args[0]) {
        return true
      } else {
        return false
      }
    });
    if (!server || !server[0]) {
      msg.channel.send(`Failed to find server: ${args[0]}`)
      return;
    }
    server=server[0].attributes;
    var out = shell.exec(`ls /srv/daemon-data/${server.uuid}/plugins/*.jar`)
    var re = new RegExp(`/srv/daemon-data/${server.uuid}/plugins/`, 'g');
    out=out.replace(re, "")
    var re = new RegExp(`.jar`, 'g');
    out=out.replace(re, "");
    var x = "```";
    msg.channel.send(`Plugins on ${server.name}: ${x}${out}${x}`);
  });
};

this.plugins = {};
this.plugins.function = c_plugins;
this.plugins.owneronly = true;
this.plugins.description = "List plugins on a server."
this.plugins.usage = "plugins <server>"

function c_start(msg, args) {
  app.getAllServers().then(servers => {
    var server = servers.filter(function(s) {
      if (s.attributes.name == args[0]) {
        return true
      } else {
        return false
      }
    });
    if (!server || !server[0]) {
      msg.channel.send(`Failed to find server: ${args[0]}`)
      return;
    }
    server=server[0]
    panel.getServerStatus(server.attributes.identifier).then(status => {
      if (status == "on") {
        msg.channel.send(`${args[0]} is already online!`)
        return;
      } else {
        msg.channel.send(`Starting ${args[0]}...`);
        panel.startServer(server.attributes.identifier)
      }
    });
  });
};

this.start = {};
this.start.function = c_start;
this.start.usage = "start <server>"
this.start.description = "Start a server."
this.start.role = "Trainee"

function c_blacklist(msg, args) {
  var word = args.join(" ");
  if (!word) {
    msg.channel.send(`Invalid Syntax`)
    return;
  }
  msg.channel.send(`Added ${word} to the database.`)
  db.run(`INSERT INTO blacklist ("word") VALUES (?)`, word);
}

this.blacklist = {};
this.blacklist.function = c_blacklist;
this.blacklist.usage = "blacklist <word>"
this.blacklist.description = "Blacklist a word."
this.blacklist.permission = ["MANAGE_MESSAGES"]

function swearCheck(client, msg) {
  db.all(`SELECT * FROM blacklist`, function(err, list) {
    if (err) throw err;
    var i;
    var replacetext;
    for (i = 0; i < list.length; i++) {
      if (msg.content.includes(list[i].word)) {
        if (msg.deletable && !msg.deleted) msg.delete();
        if (!replacetext) replacetext = msg.content;
        var x = "";
        var y;
        for (y=0;y<list[i].word.length;y++) {
          x=x+"#"
        }
        var reg = new RegExp(list[i].word, "g");
        replacetext = replacetext.replace(reg, x);
      }
    }
    if (replacetext) {
      var name = msg.member.displayName;
      var av = msg.author.displayAvatarURL;
      msg.channel.createWebhook(name, av, "Swear Filter").then(Webhook => {
        Webhook.send(replacetext);
        setTimeout(function() {
          Webhook.delete("Swear Filter : Cleanup");
        }, 500)
      });
    }
  });
}

client.on("message", (msg) => {
  if (msg.author.bot) return
  if (!msg.content.startsWith("+") && !msg.member.hasPermission("MANAGE_MESSAGES")) swearCheck(client, msg)
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
    if (this[cmd].role && this[cmd].role) {
      var i;
      var role = client.guilds.first().roles.find(r => r.name.includes(this[cmd].role));
      if (role.position > msg.member.highestRole.position) {
          msg.channel.send("You do not have the required roles to use this command.")
          return;
      };
    };
    console.log(`Executing ${cmd} [${args}] by @${msg.author.tag} in #${msg.channel.name}`);
    this[cmd].function(msg, args);
  } else {
    msg.react("❌");
    console.log(`Command ${cmd} [${args}] by @${msg.author.tag} in #${msg.channel.name} not found!`);
  }
});

function updateStatus(id, name) {
  if (name == "BungeeCord") name = "Proxy"
  var channel = client.guilds.first().channels.find(ch => ch && ch.name && (ch.name.split("』 ")[1] && ch.name.split("』 ")[1].split(" 『")[0] == name ) || ch.name == name)
  if (!channel) return;
  panel.getServerStatus(id).then(status => {
    if (status == "on") { // 『 』
      channel.setName(`『🟢』 ${name}`)
    } else if (status == "off") {
      channel.setName(`『🔴』 ${name}`)
    } else if (status == "starting") {
      channel.setName(`『🟡』 ${name}`)
    } else if (status == "stopping") {
      channel.setName(`『🟤』 ${name}`)
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


https.createServer({
  key: priv,
  cert: cert
}, w).listen(3000, function () {
  console.log('API is now listening for requests.')
})

w.listen(3001);
