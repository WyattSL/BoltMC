// this will be entirely in one file as it has no commands and will not be listening for messages, not much to really cover tbh.

const Discord = require("discord.js");
const client = new Discord.Client();
const { RichEmbed } = require("discord.js");
const express = require("express");
const bp = require("body-parser")
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("data.db")

db.serialize();

const app = express();
app.use(bp.json())
app.use(bp.urlencoded({extended: true});

app.get("/", (req, res) => {
  res.sendFile("/home/Wyatt/bot/views/apply.html")
}

app.post("/submitapply", (req, res) => {
  
});

client.on("ready", () => {
  console.log(`[APPLY BOT] Ready; logged in as ${client.user.tag}!`);
  client.user.setStatus("online");
  client.user.setPresence({
    game: {
      name: "Staff Applications",
      type: "WATCHING"
    }
  });
  client.owner = client.users.find(u => u.id == 270035320894914560);
  client.pending = client.channels.find(ch => ch.id == 728268088671207426);
  client.accepted = client.channels.find(ch => ch.id == 728268104723070987);
  client.denied = client.channels.find(ch => ch.id == 728268115984777227);
});

// return codes
// 0: success
// 1: invalid username/discrim
// 2: insufficent requirements (acc age, perhaps?)
// 3: blocked from applying (Muted role)
// 4: invalid params specified
exports.sendApplication = function(user, age, q1, q2, q3, q4, q5) {
  if (!user || !age || !q1 || !q2 || !q3 || !q4 || !q5) {
    console.log(
      `[APPLY] Return Code 4 Results: User: ${user} Age: ${age} Q1: ${q1} Q2: ${q2} Q3: ${q3} Q4: ${q4} Q5: ${q5}`
    );
    return 4; // invalid params specified!
  }
  var user = client.users.find(u => u.tag == user);
  if (!user) return 1;
  var e = new RichEmbed();
  e.setTitle(`New Application`);
  e.setTimestamp();
  e.setAuthor(user.tag, user.displayAvatarURL);
  e.setFooter(`Kindly made by ${client.owner.tag}`);
  e.setColor(0x0000ff);
  e.setDescription(`<@!${user.id}>`);
  e.addField(`Age`, age);
  e.addField(`What can you do for us?`, q1);
  e.addField(`Why should we accept you?`, q2);
  e.addField(`Why should we pick you, instead of another applicant?`, q3);
  e.addField(`Why are you applying?`, q4);
  e.addField(`What are you applying for?`, q5);
  var id =
    user.id + Number(age) + q1.length + q2.length + q3.length + q4.length; // a semi-unique way of doing it.
  // the EXACT same application (by the same person) will have the same ID
  var q = `INSERT INTO applications ("id", "user", "age", "q1", "q2", "q3", "q4", "q5", "msgid") VALUES (@0, @1, @2, @3, @4, @5, @6, @7, @8)`;
  e.addField(`Application ID`, id);
  client.pending.send(e).then(ms => {
    db.run(q, id, user.id, age, q1, q2, q3, q4, q5, ms.id);
  });
  return 0;
};

client.on("message", msg => {
  if (msg.author.id == client.user.id) {
    setTimeout(function() {
      if (!msg.embeds[0]) {
        msg.delete();
      }
    }, 500)
  }
  if (msg.author.bot) return;
  if (msg.channel.id != client.pending.id) return;
  var args = msg.content.split(" ");
  args.shift(); // remove the command
  if (msg.content.startsWith("accept")) {
    msg.delete();
    var id = Number(args.shift());
    if (!id) {
      msg.channel
        .send(`Usage\naccept <id> <role:name>\ndeny <id> <reason>`)
        .then(m => {
          setTimeout(function() {
            m.delete();
          }, 5000);
        });
      return;
    }
    var role = msg.guild.roles.find(r => r.name == args.join(" "));
    if (!role) {
      msg.channel.send(`Role not found! :x:`);
      return;
    }
    if (role.position > msg.member.highestRole.position) {
      msg.channel.send(`:x: This role is higher than your current role!`);
      return;
    }
    var q = `SELECT * FROM applications WHERE id=?`;
    db.all(q, id, function(err, res) {
      if (err) throw err;
      if (res[0]) {
        var user = msg.guild.members.find(m => m.user.id == res[0].user);
        if (!user) {
          msg.channel.send(
            `I was unable to find the applying user. Perhaps they left the guild?`
          );
          return;
        } else {
          user.send(
            `Your application has been accepted. You have been given ${role.name}.`
          );
          msg.channel
            .send(
              `You have accepted <@!${user.user.id}>'s application. They have been given ${role.name}.`
            )
            .then(m => {
              setTimeout(function() {
                m.delete();
              }, 5000);
            });
          user.addRole(role);
          var e = new RichEmbed();
          e.setTitle("New Application");
          e.setAuthor(user.user.tag, user.user.avatarUrl);
          e.setDescription(`<@!${user.user.id}>`);
          e.setFooter(`Kindly made by ${client.owner.tag}`);
          e.addField(`Age`, res[0].age);
          e.addField(`What can you do for us?`, res[0].q1);
          e.addField(`Why should we accept you?`, res[0].q2);
          e.addField(
            `Why should we pick you, instead of another applicant?`,
            res[0].q3
          );
          e.addField(`Why are you applying?`, res[0].q4);
          e.addField(`What are you applying for?`, res[0].q5);
          e.addField(`Accepted By`, `<@!${msg.author.id}>`);
          e.addField(`Role Given`, `${role.name}`);
          e.setColor(0x00ff00);
          client.accepted.send(e);
          var m = msg.channel.messages.find(ms => ms.id == res[0].msgid);
          m.edit("Application Accepted.");
          setTimeout(function() {
            m.delete();
          }, 2000);
          db.run(`DELETE FROM applications WHERE id=?`, id);
        }
      } else {
        msg.channel.send(`Application not found! :x:`);
      }
    });
  } else if (msg.content.startsWith("deny")) {
    msg.delete();
    var id = Number(args.shift());
    var reason = args.join(" ");
    if (!id || !reason) {
      msg.channel
        .send(`Usage\naccept <id> <role:name>\ndeny <id> <reason>`)
        .then(m => {
          setTimeout(function() {
            m.delete();
          }, 5000);
        });
      return;
    }
    var q = `SELECT * FROM applications WHERE id=?`;
    db.all(q, id, function(err, res) {
      if (err) throw err;
      if (res[0]) {
        var user = msg.guild.members.find(m => m.user.id == res[0].user);
        if (!user) {
          msg.channel.send(
            `I was unable to find the applying user. Perhaps they left the guild?`
          );
          return;
        }
        user.send(`Your application has been denied. Reason: ${reason}`);
        msg.channel
          .send(`You have denied <@!${user.user.id}>'s application for ${reason}.`)
          .then(m => {
            setTimeout(function() {
              m.delete();
            }, 5000);
          });
        var e = new RichEmbed();
        e.setTitle("New Application");
        e.setAuthor(user.user.tag, user.user.avatarUrl);
        e.setDescription(`<@!${user.user.id}>`);
        e.setFooter(`Kindly made by ${client.owner.tag}`);
        e.addField(`Age`, res[0].age);
        e.addField(`What can you do for us?`, res[0].q1);
        e.addField(`Why should we accept you?`, res[0].q2);
        e.addField(`Why should we pick you, instead of another applicant?`,res[0].q3);
        e.addField(`Why are you applying?`, res[0].q4);
        e.addField(`What are you applying for?`, res[0].q5);
        e.addField(`Denied By`, `<@!${msg.author.id}>`);
        e.addField(`Reason`, `${reason}`);
        e.setColor(0xff0000);
        client.denied.send(e);
        var m = msg.channel.messages.find(ms => ms.id == res[0].msgid);
        m.edit("Application Denied.");
        setTimeout(function() {
          m.delete();
        }, 2000);
        db.run(`DELETE FROM applications WHERE id=?`, id)
      } else {
        msg.channel.send(`Application not found :x:`);
      }
    });
  } else {
    msg.delete();
  }
});

client.login(require("./TOKEN.json").APPLY);
