function id(id) {
  if (!id) return false;
  return document.getElementById(id);
}

// faster way of doing thigns
const error = id("error");
const errmsg = id("errormsg");
const finished = id("finish");
const form = id("form");

error.style.display = "none";
finished.style.display = "none";

function err(msg) {
  error.style.display = "inherit";
  errmsg.innerHTML = msg;
}

if (localStorage.getItem("username") && localStorage.getItem("discriminator")) {
  var list = document.getElementsByClassName("inpuser");
  var i;
  for (i=0;i<list.length;i++) {
    list[i].value = `${localStorage.getItem("username")}#${localStorage.getItem("discriminator")}`
  }
}

// return codes
// 0: success
// 1: invalid username/discrim
// 2: insufficent requirements (acc age, perhaps?)
// 3: blocked from applying (Muted role)
// 4: invalid params specified

form.onsubmit = function(event) { // don't reload the page; or navigate away
  event.preventDefault();
  var req = new XMLHttpRequest;
  req.onreadystatechange = function() {
    if (this.readyState == 4) {
      if (this.status == 200) {
        var code = this.responseText;
        if (!code || code == "0") {
          form.style.display = "none";
          finished.style.display = "inherit";
          error.style.display = "none";
        } else if (code == "1") {
          err(`The specified user was not found. Please ensure all capitalization is correct. If you have any Unicode characters, be sure to include them.`);
        } else if (code == "2") {
          err(`Your account does not meet the requirements to apply.`)
        } else if (code == "3") {
          err(`Your account is currently blocked from applying.`);
        } else if (code == "4") {
          err(`There was a internal error whilst submitting your application. Please DM me.`)
        } else {
          err(`Unknown non-HTTP error code returned: ${code}`);
        }
      } else {
        err(`[HTTP] ${this.status} [${this.statusText}] whilst attempting to submit application.`)
      }
    }
  }
  var u = id("user").value.replace("#", "^")
  var q1 = id('age').value;
  var q2 = id('q1').value;
  var q3 = id('q2').value;
  var q4 = id('q3').value;
  var q5 = id('q4').value;
  var q6 = id('q5').value;
  var q = `user=${u}&q1=${q1}&q2=${q2}&q3=${q3}&q4=${q4}&q5=${q5}&q6=${q6}`;
  req.open("GET", `/submitapply?${q}`);
  req.send();
}
