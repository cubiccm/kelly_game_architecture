const ws = new WebSocket("ws://localhost:1019");
const instr_queue = new Array();

ws.addEventListener("open", (event) => {
  console.log("open");
  ws.send("reg client");
  showMask("Receiving Data...");
});

ws.addEventListener("message", (event) => {
  try {
    const data = JSON.parse(event.data);
    instr_queue.push(data);
  } catch (e) {
    console.log("Failed to parse server data");
    return;
  }
});

ws.addEventListener("close", (event) => {
  console.log("Connection closed");
});

ws.addEventListener("error", (event) => {
  console.log("Error in connection");
  console.log(event);
});

function showMask(content) {
  document.getElementById("gameboard-mask-title").innerText = content;
  document.getElementsByClassName("gameboard-mask")[0].style["display"] = "flex";
}

function hideMask() {
  document.getElementsByClassName("gameboard-mask")[0].style["display"] = "none";
}

function appendColumn(prob = 0.5) {
  const a_per = parseInt(prob * 100);
  const b_per = 100 - a_per;
  html = `
  <div class="round__container">
    <div class="round-column b" style="height: ${b_per}%;">
      <span class="round-column-num">${b_per}</span>
    </div>
    <div class="round-column a" style="height: ${a_per}%;">
      <span class="round-column-num">${a_per}</span>
    </div>
  </div>
  `;
  document.querySelector(".rounds").insertAdjacentHTML("beforeend", html);
}

let init_balance, prob_seq;
let last_data;
function initBoard(data = last_data) {
  last_data = data;
  init_balance = data["init_balance"];
  setBalance(init_balance);
  prob_seq = data["seq"];
  document.querySelector(".rounds").innerHTML = "";
  for (const prob of prob_seq) {
    appendColumn(prob);
  }
}

function setBalance(balance) {
  document.getElementById("balance-a").innerText = balance[0];
  document.getElementById("balance-b").innerText = balance[1];
}

function setTime(time) {
  document.getElementById("timer-a").innerText = `Time elapsed: ${time[0].toFixed(2)}s`;
  document.getElementById("timer-b").innerText = `Time elapsed: ${time[1].toFixed(2)}s`;
}

let hide_result_timer = -1;
function showResult(player, title) {
  window.clearInterval(hide_result_timer);
  document.getElementsByClassName("game-result")[0].style["display"] = "flex";
  document.getElementsByClassName("game-result-name")[0].innerText = player;
  document.getElementsByClassName("game-result-title")[0].innerText = title;
  hide_result_timer = window.setTimeout(hideResult, 4000);
}

function hideResult() {
  document.getElementsByClassName("game-result")[0].style["display"] = "none";
}

const player_names = Array(2);
function setPlayer(data) {
  if (data["side"] == "A") {
    document.getElementById("name-a").innerText = data["name"];
    document.getElementById("timer-a").innerText = `Ready`;
    player_names[0] = data["name"];
  } else if (data["side"] == "B") {
    document.getElementById("name-b").innerText = data["name"];
    document.getElementById("timer-b").innerText = `Ready`;
    player_names[1] = data["name"];
  }
}

function setBet(data) {
  const round = data["round"];
  const side = data["side"].toLowerCase();
  const amount = data["amount"];
  const target = document.querySelector(`.round__container:nth-child(${round + 1}) > .${side}`).getElementsByClassName("round-column-num")[0];
  target.classList.add("round-column-bet");
  target.classList.remove("round-column-num");
  if (amount < 1000) {
    target.innerHTML = amount;
  } else {
    target.classList.add("thousand");
    target.innerHTML = `${parseInt(amount / 1000)}<span>${String(amount % 1000).padStart(3, 0)}</span>`;
  }
  setScroll(round);
}

let target_scroll = 0;
function setScroll(round) {
  target_scroll = round * 70;
}

const scroll_timer = window.setInterval(() => {
  const target = document.querySelector(".rounds");
  const current_scroll = target.scrollLeft;
  if (Math.abs(target_scroll - current_scroll) > 10) {
    target.scrollTo((target_scroll + current_scroll) / 2, 0);
  } else {
    target.scrollTo(target_scroll, 0);
  }
}, 20);

function setResult(data) {
  const round = data["round"];
  const winner = data["winner"].toLowerCase();
  const loser = winner == "a" ? "b" : "a";
  const result = data["result"];
  const balance = data["balance"];
  setBalance(balance);
  setTime(data["time"]);
  // const column = document.querySelector(`.round__container:nth-child(${round + 1})`);
  // column.insertAdjacentHTML("beforeend", `
  //   <div class="round-decider" style="bottom: calc(${parseInt(result * 80)}% + 40px);">${result.toFixed(2)}</div>
  // `);
  const loser_column = document.querySelector(`.round__container:nth-child(${round + 1}) > .${loser}`);
  loser_column.classList.add("gray");
  setScroll(round);
}

function switchSides(balance_diff) {
  window.setTimeout(() => {
    showMask("Switching Sides...");
    setScroll(0);
    document.getElementById("name-a").style.opacity = 0;
    document.getElementById("name-b").style.opacity = 0;
    document.getElementById("timer-a").innerText = "";
    document.getElementById("timer-b").innerText = "";
    window.setTimeout(() => {
      document.getElementById("name-a").innerText = player_names[1];
      document.getElementById("name-b").innerText = player_names[0];
      document.getElementById("name-a").style.opacity = 1;
      document.getElementById("name-b").style.opacity = 1;
    }, 500);
    if (balance_diff > 0) {
      document.getElementById("lead-count-a").innerText = balance_diff;
      document.querySelector(".player-extension.a").style["bottom"] = "-46px";
    } else if (balance_diff < 0) {
      document.getElementById("lead-count-b").innerText = -balance_diff;
      document.querySelector(".player-extension.b").style["top"] = "-46px";
    } else {
      showResult("First Set", "DRAW");
    }
    [init_balance[0], init_balance[1]] = [init_balance[1], init_balance[0]];
    initBoard();
    window.setTimeout(() => {
      hideMask();
    }, 1000);
  }, 2000);
}

function endGame(data) {
  if (data["winner"] != "") {
    showResult(data["winner"], "WINS");
  } else {
    showResult("Final Result", "DRAW");
  }
  document.getElementsByClassName("current-match")[0].innerHTML = `
    <table>
      <tr>
        <td>${data["names"][0]}</td>
        <td>
          <div style="display: flex;">
            <svg xmlns="http://www.w3.org/2000/svg" width="60px" height="60px" viewBox="0 0 125 125">
              <circle cx="62.5" cy="62.5" r="50" fill="#FF6319"/>
              <polygon points="83.8,36.9 73.5,36.9 62.6,76.2 51.8,36.9 41.4,36.9 56.1,87.3 69.1,87.3" fill="#FFF"/>
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" width="60px" height="60px" viewBox="0 0 125 125">
              <title>NYCS Bullet, Standard Set - Shuttles</title>
              <circle cx="62.5" cy="62.5" r="50" fill="#808183"/>
              <path d="M84,71.9c0-4.4-1.5-7.767-4.5-10.1c-2.2-1.733-5.567-3.133-10.1-4.2l-6.1-1.4c-3.6-0.8-5.7-1.333-6.3-1.6c-2.467-1-3.7-2.5-3.7-4.5c0-1.6,0.85-2.883,2.55-3.85c1.7-0.967,3.883-1.45,6.55-1.45c6.133,0,10.5,2.467,13.1,7.4l8.2-6.2c-5.133-6.867-12.2-10.3-21.2-10.3c-5.133,0-9.533,1.267-13.2,3.8c-4.2,2.933-6.3,6.933-6.3,12c0,4.2,1.533,7.467,4.6,9.8c2.2,1.733,5.7,3.167,10.5,4.3l5.6,1.3c3.733,0.867,6.233,1.633,7.5,2.3c1.667,0.933,2.5,2.267,2.5,4c0,2.067-1.133,3.667-3.4,4.8c-1.867,0.867-4.167,1.3-6.9,1.3c-6.533,0-11.533-2.533-15-7.6l-8.3,6c2.4,3.467,5.567,6.133,9.5,8c3.933,1.867,8.067,2.8,12.4,2.8c5.933,0,10.9-1.233,14.9-3.7C81.633,81.867,84,77.567,84,71.9z" fill="#FFF"/>
            </svg>
          </div>
        </td>
        <td>${data["names"][1]}</td>
      </tr>
      <tr>
        <td class="money">${data["score"][0][0]}</td>
        <td>1st Set</td>
        <td class="money">${data["score"][0][1]}</td>
      </tr>
      <tr>
        <td class="money">${data["score"][1][0]}</td>
        <td>2nd Set</td>
        <td class="money">${data["score"][1][1]}</td>
      </tr>
      <tr>
        <td class="money">${data["score"][0][0] + data["score"][1][0]}</td>
        <td>Total</td>
        <td class="money">${data["score"][0][1] + data["score"][1][1]}</td>
      </tr>
    </table>
  `;
  function boldif(name, winner) {
    if (name == winner) {
      return `<span class="history-winner">${name}</span>`;
    } else {
      return name;
    }
  }
  document.getElementsByClassName("save-button")[0].addEventListener("click", (e) => {
    let history = localStorage.getItem("match_history_html") || "";
    if (data["winner"] != "") {
      history = `
      <div class="history-record">
        ${boldif(data["names"][0], data["winner"])} v. ${boldif(data["names"][1], data["winner"])} (${data["winner"]} leads by \$${data["leadsby"]})
      </div>` + history;
    } else {
      history = `
      <div class="history-record">
        ${data["names"][0]} v. ${data["names"][1]} (DRAW)
      </div>` + history;
    }
    localStorage.setItem("match_history_html", history);
    window.location.reload();
  });
  document.getElementsByClassName("save-button")[0].style["display"] = "block";
}

let timeout = window.setTimeout(processInstr, 30);

function processInstr() {
  let ms = 100;
  window.clearTimeout(timeout);
  if (instr_queue.length) {
    let instr = instr_queue[0];
    instr_queue.shift();
    switch (instr["type"]) {
      case "info":
        initBoard(instr["data"]);
        hideMask();
        break;
      case "playerjoin":
        setPlayer(instr["data"]);
        ms = 1000;
        break;
      case "bet":
        setBet(instr["data"]);
        if (instr["data"]["round"] > 25) ms = 2;
        break;
      case "result":
        setResult(instr["data"]);
        if (instr["data"]["balance"][0] * instr["data"]["balance"][1] == 0) {
          ms = 4;
        }
        break;
      case "switchsides":
        ms = 3500;
        switchSides(instr["data"]);
        break;
      case "gameover":
        window.clearInterval(scroll_timer);
        endGame(instr["data"]);
        break;
    }
  }
  timeout = window.setTimeout(processInstr, ms);
}