(() => {
  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");
  const progressCount = document.getElementById("progress-count");
  const timerDisplay = document.getElementById("elapsed-time");
  const interactionPrompt = document.getElementById("interaction-prompt");
  const startScreen = document.getElementById("start-screen");
  const questionScreen = document.getElementById("question-screen");
  const endingScreen = document.getElementById("ending-screen");
  const answerInput = document.getElementById("answer-input");
  const answerFeedback = document.getElementById("answer-feedback");
  const toast = document.getElementById("toast");

  const WORLD = { width: 1400, height: 800 };
  const PLAYER_SPEED = 190;
  const PLAYER_RADIUS = 12;
  const ROOM_WIDTH = 230;
  const ROOM_GAP = 20;
  const ROOM_START_X = 70;
  const lowerRoomNames = ["음악실", "급식실", "컴퓨터실", "준비실", "보건실"];
  const roomNames = ["교장실", "교무실", "도서관", "과학실", "미술실"];
  const rooms = roomNames.map((name, index) => ({
    name,
    x: ROOM_START_X + index * (ROOM_WIDTH + ROOM_GAP),
    width: ROOM_WIDTH,
    center: ROOM_START_X + index * (ROOM_WIDTH + ROOM_GAP) + ROOM_WIDTH / 2
  }));
  const questions = QUESTIONS.map((question, index) => {
    if (index < 5) {
      const room = rooms[index];
      return { ...question, index, room: room.name, x: room.center, y: 170, complete: false };
    }
    if (index < 10) {
      const room = rooms[index - 5];
      return {
        ...question,
        index,
        room: lowerRoomNames[index - 5],
        x: room.center,
        y: 622,
        complete: false
      };
    }
    const hallwayIndex = index - 10;
    return {
      ...question,
      index,
      room: "중앙 복도",
      x: 180 + hallwayIndex * 245,
      y: hallwayIndex % 2 === 0 ? 365 : 440,
      complete: false
    };
  });
  const exit = { x: 1334, y: 397 };
  const obstacles = [];
  const keysDown = new Set();
  const player = { x: 145, y: 396, face: "down", walk: 0 };
  let activeQuestion = null;
  let toastTimer = 0;
  let lastTime = 0;
  let running = false;
  let gameStartedAt = null;
  let finalElapsedMs = 0;
  let activeTarget = null;

  function formatElapsed(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${minutes}분 ${seconds}초`;
  }

  function updateTimer() {
    if (gameStartedAt !== null) {
      timerDisplay.textContent = formatElapsed(Date.now() - gameStartedAt);
    }
  }

  function addWall(x, y, width, height) {
    obstacles.push({ x, y, width, height });
  }

  function buildMap() {
    addWall(48, 55, 1304, 16);
    addWall(48, 730, 1304, 16);
    addWall(48, 55, 16, 691);
    addWall(1336, 55, 16, 691);

    rooms.forEach((room) => {
      const gapStart = room.center - 34;
      const roomEnd = room.x + room.width;
      addWall(room.x, 278, gapStart - room.x, 18);
      addWall(room.center + 34, 278, roomEnd - (room.center + 34), 18);
      addWall(room.x, 500, gapStart - room.x, 18);
      addWall(room.center + 34, 500, roomEnd - (room.center + 34), 18);
      addWall(room.x, 70, 9, 208);
      addWall(roomEnd - 9, 70, 9, 208);
      addWall(room.x, 518, 9, 212);
      addWall(roomEnd - 9, 518, 9, 212);
    });

    // Classroom furniture stays clear of the clue stations and doorways.
    rooms.forEach((room, index) => {
      addWall(room.x + 25, 96, 42, 18);
      addWall(room.x + room.width - 67, 96, 42, 18);
      if (lowerRoomNames[index] !== "급식실") {
        addWall(room.x + 25, 552, 42, 18);
        addWall(room.x + room.width - 67, 552, 42, 18);
      }
      if (room.name === "도서관") {
        [room.x + 14, room.x + 48, room.x + 156, room.x + 190].forEach((x) => addWall(x, 128, 26, 105));
      }
      if (room.name === "과학실") {
        addWall(room.x + 14, 146, 70, 24);
        addWall(room.x + 146, 146, 70, 24);
      }
      if (room.name === "미술실") {
        addWall(room.x + 22, 135, 28, 52);
        addWall(room.x + 180, 135, 28, 52);
      }

      const lowerName = lowerRoomNames[index];
      if (lowerName === "음악실") {
        addWall(room.x + 27, 632, 30, 30);
        addWall(room.x + 173, 632, 30, 30);
      }
      if (lowerName === "급식실") {
        [565, 665].forEach((y) => {
          addWall(room.x + 18, y, 82, 20);
          addWall(room.x + 130, y, 82, 20);
        });
      }
      if (lowerName === "컴퓨터실") {
        addWall(room.x + 25, 652, 42, 18);
        addWall(room.x + room.width - 67, 652, 42, 18);
      }
      if (lowerName === "준비실") {
        addWall(room.x + 15, 594, 32, 104);
        addWall(room.x + room.width - 47, 594, 32, 104);
      }
      if (lowerName === "보건실") {
        addWall(room.x + 18, 635, 78, 38);
        addWall(room.x + room.width - 62, 600, 44, 58);
      }
    });
  }

  function drawDesk(x, y, width = 42) {
    ctx.fillStyle = "rgba(91, 62, 35, .18)";
    ctx.fillRect(x + 3, y + 10, width, 5);
    ctx.fillStyle = "#916640";
    ctx.fillRect(x + 4, y + 5, 4, 12);
    ctx.fillRect(x + width - 4, y + 5, 4, 12);
    ctx.fillStyle = "#b68a59";
    ctx.fillRect(x, y, width, 8);
    ctx.fillStyle = "#d4ae7c";
    ctx.fillRect(x + 2, y + 1, width - 4, 3);
    ctx.fillStyle = "#875d3c";
    ctx.fillRect(x + 2, y + 8, width - 4, 2);
  }

  function drawComputer(x, y) {
    ctx.fillStyle = "#665b4c";
    ctx.fillRect(x + 3, y + 1, 18, 13);
    ctx.fillStyle = "#d2c4a8";
    ctx.fillRect(x + 5, y + 3, 14, 9);
    ctx.fillStyle = "#8ab5b0";
    ctx.fillRect(x + 6, y + 4, 12, 7);
    ctx.fillStyle = "#71614e";
    ctx.fillRect(x + 11, y + 14, 3, 4);
    ctx.fillRect(x + 8, y + 17, 9, 2);
    ctx.fillStyle = "#8f7658";
    ctx.fillRect(x + 5, y + 20, 15, 3);
  }

  function drawBookcase(x, y, width, height, seed) {
    ctx.fillStyle = "#79583b";
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = "#a77a4d";
    ctx.fillRect(x + 2, y + 2, width - 4, 3);
    const colors = ["#c36e4b", "#d3ad60", "#6f9582", "#71869e", "#d39a67", "#9277a1"];
    const rows = 4;
    for (let row = 0; row < rows; row += 1) {
      const rowY = y + 8 + row * ((height - 13) / rows);
      const bookWidth = Math.max(3, (width - 7) / 5);
      for (let book = 0; book < 5; book += 1) {
        const bookHeight = 8 + ((seed + row + book) % 3) * 2;
        ctx.fillStyle = colors[(seed + row * 2 + book) % colors.length];
        ctx.fillRect(x + 3 + book * bookWidth, rowY + 13 - bookHeight, bookWidth - 1, bookHeight);
        ctx.fillStyle = "rgba(255,255,255,.35)";
        ctx.fillRect(x + 4 + book * bookWidth, rowY + 14 - bookHeight, 1, bookHeight - 2);
      }
      ctx.fillStyle = "#c39a68";
      ctx.fillRect(x + 1, rowY + 13, width - 2, 2);
    }
  }

  function drawComputerDesk(room, y, xOffset) {
    const x = room.x + xOffset;
    drawDesk(x, y, 48);
    drawComputer(x + 12, y - 19);
    ctx.fillStyle = "#8a7257";
    ctx.fillRect(x + 17, y + 8, 12, 3);
  }

  function drawLunchTray(x, y) {
    ctx.fillStyle = "#d6d1bc";
    ctx.fillRect(x, y, 22, 13);
    ctx.fillStyle = "#f3ead4";
    ctx.fillRect(x + 2, y + 2, 18, 9);
    ctx.fillStyle = "#d88b58";
    ctx.fillRect(x + 3, y + 3, 6, 4);
    ctx.fillStyle = "#75a36d";
    ctx.fillRect(x + 11, y + 3, 6, 3);
    ctx.fillStyle = "#e7c56e";
    ctx.fillRect(x + 11, y + 7, 7, 2);
  }

  function drawRoom(room, y, tint, name) {
    ctx.fillStyle = tint;
    ctx.fillRect(room.x, y, room.width, 208);
    ctx.fillStyle = "rgba(181, 135, 78, .08)";
    ctx.fillRect(room.x + 10, y + 10, room.width - 20, 188);
    ctx.fillStyle = "#8b6845";
    ctx.fillRect(room.center - 34, y + 11, 68, 23);
    ctx.fillStyle = "#e9d8b8";
    ctx.fillRect(room.center - 31, y + 14, 62, 16);
    ctx.fillStyle = "#bf9870";
    ctx.fillRect(room.center - 25, y + 18, 12, 8);
    ctx.fillStyle = "#7b9b88";
    ctx.fillRect(room.center - 8, y + 17, 15, 2);
    ctx.fillStyle = "#c98a63";
    ctx.fillRect(room.center + 13, y + 16, 11, 9);
    ctx.fillStyle = "#c6aa80";
    ctx.fillRect(room.x + 18, y + 44, room.width - 36, 2);

    if (name === "급식실") {
      [y + 45, y + 145].forEach((tableY) => {
        [[room.x + 18, 82], [room.x + 130, 82]].forEach(([tableX, width]) => {
          ctx.fillStyle = "rgba(91, 62, 35, .18)";
          ctx.fillRect(tableX + 3, tableY + 17, width, 5);
          ctx.fillStyle = "#a8784f";
          ctx.fillRect(tableX + 5, tableY + 9, 5, 14);
          ctx.fillRect(tableX + width - 10, tableY + 9, 5, 14);
          ctx.fillStyle = "#c79765";
          ctx.fillRect(tableX, tableY, width, 11);
          ctx.fillStyle = "#e0b880";
          ctx.fillRect(tableX + 2, tableY + 1, width - 4, 3);
          for (let tray = 0; tray < 3; tray += 1) drawLunchTray(tableX + 5 + tray * 25, tableY - 5);
        });
      });
      return;
    }

    drawDesk(room.x + 24, y + 25);
    drawDesk(room.x + room.width - 66, y + 25);
    if (name === "교장실" || name === "교무실") {
      drawComputer(room.x + 34, y + 6);
      drawComputer(room.x + room.width - 56, y + 6);
      ctx.fillStyle = "#d8c49e";
      ctx.fillRect(room.x + 18, y + 64, 34, 20);
      ctx.fillStyle = "#b79b70";
      ctx.fillRect(room.x + 21, y + 67, 28, 2);
      ctx.fillRect(room.x + 21, y + 72, 22, 2);
      ctx.fillRect(room.x + 21, y + 77, 25, 2);
    } else if (name === "도서관") {
      drawBookcase(room.x + 14, y + 58, 26, 126, 0);
      drawBookcase(room.x + 48, y + 58, 26, 126, 2);
      drawBookcase(room.x + room.width - 74, y + 58, 26, 126, 3);
      drawBookcase(room.x + room.width - 40, y + 58, 26, 126, 5);
    } else if (name === "과학실") {
      [[room.x + 14, y + 76], [room.x + 146, y + 76]].forEach(([benchX, benchY]) => {
        drawDesk(benchX, benchY, 70);
        ctx.fillStyle = "#89aaa1";
        ctx.fillRect(benchX + 12, benchY - 17, 6, 17);
        ctx.fillRect(benchX + 30, benchY - 21, 8, 21);
        ctx.fillStyle = "#c3dfcf";
        ctx.beginPath();
        ctx.arc(benchX + 15, benchY - 17, 5, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(benchX + 31, benchY - 21, 6, 12);
        ctx.fillStyle = "#d8bd72";
        ctx.fillRect(benchX + 13, benchY - 10, 4, 3);
        ctx.fillStyle = "#7b7160";
        ctx.fillRect(benchX + 47, benchY - 12, 3, 10);
        ctx.fillRect(benchX + 44, benchY - 14, 9, 3);
      });
      ctx.fillStyle = "#708c82";
      ctx.fillRect(room.center - 27, y + 53, 54, 4);
      ctx.fillRect(room.center - 20, y + 57, 3, 10);
      ctx.fillRect(room.center + 17, y + 57, 3, 10);
    } else if (name === "미술실") {
      [[room.x + 24, y + 72], [room.x + room.width - 52, y + 72]].forEach(([easelX, easelY], index) => {
        ctx.fillStyle = "#8e6945";
        ctx.fillRect(easelX + 7, easelY + 24, 3, 32);
        ctx.fillRect(easelX + 23, easelY + 24, 3, 32);
        ctx.fillRect(easelX + 4, easelY + 19, 27, 3);
        ctx.fillStyle = index ? "#e5aa72" : "#b8c98a";
        ctx.fillRect(easelX + 2, easelY, 30, 23);
        ctx.fillStyle = "#f3e7d0";
        ctx.fillRect(easelX + 5, easelY + 3, 24, 17);
        ctx.fillStyle = index ? "#c97565" : "#7799aa";
        ctx.beginPath();
        ctx.arc(easelX + 15, easelY + 11, 5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = "#e4d4b8";
      ctx.fillRect(room.center - 18, y + 116, 36, 16);
      ["#cc6f61", "#e0bb68", "#719785", "#7189a6"].forEach((color, index) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(room.center - 11 + index * 7, y + 124, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (name === "음악실") {
      ctx.fillStyle = "#8d6340";
      ctx.fillRect(room.x + 17, y + 61, room.width - 34, 28);
      ctx.fillStyle = "#d4b17f";
      ctx.fillRect(room.x + 19, y + 63, room.width - 38, 3);
      for (let tube = 0; tube < 7; tube += 1) {
        const tubeX = room.x + 29 + tube * 25;
        const tubeHeight = 15 + (tube % 3) * 5;
        ctx.fillStyle = tube % 2 ? "#b97748" : "#d1a96c";
        ctx.fillRect(tubeX, y + 85 - tubeHeight, 4, tubeHeight);
        ctx.fillStyle = "rgba(255,255,255,.42)";
        ctx.fillRect(tubeX + 1, y + 87 - tubeHeight, 1, tubeHeight - 3);
      }
      ctx.fillStyle = "#6e4935";
      ctx.beginPath();
      ctx.ellipse(room.x + 48, y + 127, 19, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#d7a767";
      ctx.beginPath();
      ctx.ellipse(room.x + 48, y + 124, 16, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#7a5034";
      ctx.fillRect(room.x + 44, y + 125, 8, 3);
      ctx.fillRect(room.x + 42, y + 135, 12, 2);
      ctx.fillStyle = "#8a573a";
      ctx.beginPath();
      ctx.ellipse(room.x + room.width - 45, y + 128, 15, 17, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e0c397";
      ctx.beginPath();
      ctx.ellipse(room.x + room.width - 45, y + 128, 12, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#9c6945";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(room.x + room.width - 45, y + 128, 7, 12, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#78523b";
      ctx.font = "9px 'Malgun Gothic', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("리코더 · 단소", room.center, y + 55);
      ctx.fillText("장구 · 북", room.center, y + 154);
    } else if (name === "컴퓨터실") {
      drawComputerDesk(room, y + 135, 22);
      drawComputerDesk(room, y + 135, room.width - 70);
      drawComputer(room.x + 35, y + 6);
      drawComputer(room.x + room.width - 55, y + 6);
    } else if (name === "준비실") {
      drawBookcase(room.x + 15, y + 74, 32, 104, 1);
      drawBookcase(room.x + room.width - 47, y + 74, 32, 104, 4);
      ctx.fillStyle = "#c39b68";
      [[room.center - 22, y + 93], [room.center + 2, y + 112], [room.center - 16, y + 140]].forEach(([boxX, boxY]) => {
        ctx.fillRect(boxX, boxY, 21, 19);
        ctx.fillStyle = "#e2c89b";
        ctx.fillRect(boxX + 2, boxY + 3, 17, 2);
        ctx.fillStyle = "#c39b68";
      });
    } else if (name === "보건실") {
      ctx.fillStyle = "#faf5e8";
      ctx.fillRect(room.x + 18, y + 115, 78, 31);
      ctx.fillStyle = "#d69b8a";
      ctx.fillRect(room.x + 22, y + 119, 68, 23);
      ctx.fillStyle = "#f8efe0";
      ctx.fillRect(room.x + 26, y + 121, 21, 11);
      ctx.fillStyle = "#9b7955";
      ctx.fillRect(room.x + 19, y + 146, 5, 7);
      ctx.fillRect(room.x + 91, y + 146, 5, 7);
      ctx.fillStyle = "#a87b53";
      ctx.fillRect(room.x + room.width - 62, y + 80, 44, 55);
      ctx.fillStyle = "#e8d5b6";
      ctx.fillRect(room.x + room.width - 58, y + 84, 36, 20);
      ctx.fillRect(room.x + room.width - 58, y + 108, 36, 23);
      ctx.fillStyle = "#d46e62";
      ctx.fillRect(room.x + room.width - 44, y + 88, 8, 12);
      ctx.fillRect(room.x + room.width - 47, y + 91, 14, 6);
    }
  }

  function drawMap() {
    ctx.fillStyle = "#f4e4c4";
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    // Warm plank flooring fills the broad central hallway.
    ctx.fillStyle = "#c99862";
    ctx.fillRect(55, 298, 1290, 202);
    for (let y = 304; y < 497; y += 24) {
      ctx.fillStyle = y % 48 === 16 ? "#d4a875" : "#c28f5b";
      ctx.fillRect(60, y, 1280, 2);
      for (let x = 76 + (y % 48 === 16 ? 0 : 90); x < 1340; x += 180) {
        ctx.fillStyle = "rgba(116, 72, 39, .16)";
        ctx.fillRect(x, y - 21, 1, 21);
      }
    }

    rooms.forEach((room, index) => {
      const tint = index % 2 === 0 ? "#f5ebd7" : "#efe3ce";
      drawRoom(room, 70, tint, room.name);
      drawRoom(room, 520, index % 2 === 0 ? "#f2e7d2" : "#ebdfca", lowerRoomNames[index]);
    });

    ctx.fillStyle = "#825a35";
    ctx.font = "bold 11px 'Malgun Gothic', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("2F · EAST WING", 68, 294);
    ctx.fillText("2F · WEST WING", 68, 514);
    ctx.textAlign = "center";

    obstacles.forEach((wall) => {
      const isOuter = wall.width > 1000 || wall.height > 400;
      ctx.fillStyle = isOuter ? "#e5d1ad" : "#dec8a3";
      ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
      ctx.fillStyle = "rgba(255, 255, 255, .48)";
      if (wall.width < 100 || wall.height < 30) {
        ctx.fillRect(wall.x, wall.y, wall.width, 2);
      }
    });
    drawDoors();
    drawQuestionStations();
    drawExit();
    drawPlayer();
  }

  function drawDoors() {
    rooms.forEach((room) => {
      [278, 500].forEach((y) => {
        const label = y === 278 ? room.name : lowerRoomNames[rooms.indexOf(room)];
        ctx.fillStyle = "#7a5434";
        ctx.font = "bold 11px 'Malgun Gothic', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(label, room.center, y - 9);
        ctx.fillStyle = "#b87b47";
        ctx.fillRect(room.center - 29, y + 1, 58, 15);
        ctx.fillStyle = "#d49a60";
        ctx.fillRect(room.center - 26, y + 3, 52, 10);
        ctx.strokeStyle = "#885b39";
        ctx.lineWidth = 2;
        ctx.strokeRect(room.center - 29, y + 1, 58, 15);
        ctx.fillStyle = "#76502f";
        ctx.beginPath();
        ctx.arc(room.center + 18, y + 9, 2, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  }

  function drawQuestionStations() {
    const time = performance.now() / 1000;
    questions.forEach((question) => {
      const pulse = 1 + Math.sin(time * 3 + question.index) * 0.12;
      ctx.globalAlpha = question.complete ? 1 : 0.95;
      ctx.fillStyle = question.complete ? "#5da977" : "#754b2f";
      ctx.beginPath();
      ctx.ellipse(question.x, question.y + 8, 13 * pulse, 5 * pulse, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(question.x, question.y);
      ctx.rotate(-0.15);
      ctx.fillStyle = question.complete ? "#48a76a" : "#9b563e";
      ctx.beginPath();
      ctx.roundRect(-9, -12, 19, 23, 2);
      ctx.fill();
      ctx.fillStyle = question.complete ? "#b9e3bd" : "#edc879";
      ctx.fillRect(-6, -9, 1, 17);
      ctx.fillStyle = "rgba(255,255,255,.55)";
      ctx.fillRect(-3, -8, 9, 1);
      ctx.fillRect(-3, -5, 7, 1);
      ctx.fillStyle = "#fff8e9";
      ctx.font = "bold 7px 'Malgun Gothic', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(question.complete ? "✓" : String(question.index + 1).padStart(2, "0"), 1, 4);
      ctx.restore();
      ctx.globalAlpha = 1;
    });
  }

  function drawExit() {
    const unlocked = questions.every((question) => question.complete);
    ctx.fillStyle = unlocked ? "#71ae78" : "#a8774d";
    ctx.fillRect(exit.x - 19, exit.y - 27, 38, 55);
    ctx.fillStyle = unlocked ? "#c1e3a8" : "#dcb17a";
    ctx.fillRect(exit.x - 15, exit.y - 23, 30, 47);
    ctx.fillStyle = "#8b6240";
    ctx.fillRect(exit.x - 10, exit.y - 18, 19, 38);
    ctx.fillStyle = unlocked ? "#9de0b0" : "#e6c37c";
    ctx.beginPath();
    ctx.arc(exit.x + 5, exit.y + 1, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#704c2e";
    ctx.font = "bold 10px 'Malgun Gothic', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("정문", exit.x, exit.y + 43);
  }

  function drawPlayer() {
    const bob = Math.sin(player.walk) * 1.5;
    const x = player.x;
    const y = player.y + bob;
    ctx.fillStyle = "rgba(85, 63, 39, .24)";
    ctx.beginPath();
    ctx.ellipse(x, y + 10, 11, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#405c75";
    ctx.fillRect(x - 8, y + 1, 6, 11);
    ctx.fillRect(x + 2, y + 1, 6, 11);
    ctx.fillStyle = "#4e8d73";
    ctx.fillRect(x - 10, y - 10, 20, 14);
    ctx.fillStyle = "#efc69a";
    ctx.fillRect(x - 7, y - 21, 14, 14);
    ctx.fillStyle = "#654b37";
    ctx.fillRect(x - 8, y - 22, 16, 5);
    ctx.fillRect(x - 8, y - 18, 3, 3);
    const eyeY = player.face === "up" ? y - 15 : y - 13;
    if (player.face !== "up") {
      ctx.fillStyle = "#44392e";
      ctx.fillRect(x - 4, eyeY, 2, 2);
      ctx.fillRect(x + 2, eyeY, 2, 2);
    }
    ctx.fillStyle = "#e6bd8b";
    ctx.fillRect(x - 12, y - 9, 3, 9);
    ctx.fillRect(x + 9, y - 9, 3, 9);
  }

  function blocked(x, y) {
    return obstacles.some((wall) =>
      x + PLAYER_RADIUS > wall.x &&
      x - PLAYER_RADIUS < wall.x + wall.width &&
      y + PLAYER_RADIUS > wall.y &&
      y - PLAYER_RADIUS < wall.y + wall.height
    );
  }

  function movePlayer(dx, dy, delta) {
    let moveX = dx;
    let moveY = dy;
    if (moveX && moveY) {
      moveX *= Math.SQRT1_2;
      moveY *= Math.SQRT1_2;
    }
    if (moveX || moveY) {
      player.walk += delta * 11;
      if (Math.abs(moveX) > Math.abs(moveY)) player.face = moveX > 0 ? "right" : "left";
      else player.face = moveY > 0 ? "down" : "up";
    }
    const nextX = player.x + moveX * PLAYER_SPEED * delta;
    if (!blocked(nextX, player.y)) player.x = nextX;
    const nextY = player.y + moveY * PLAYER_SPEED * delta;
    if (!blocked(player.x, nextY)) player.y = nextY;
  }

  function draw() {
    const pixelRatio = window.devicePixelRatio || 1;
    const viewPixelWidth = canvas.clientWidth;
    const viewPixelHeight = canvas.clientHeight;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, viewPixelWidth, viewPixelHeight);
    const scale = Math.max(viewPixelWidth / WORLD.width, viewPixelHeight / WORLD.height);
    const viewWidth = viewPixelWidth / scale;
    const viewHeight = viewPixelHeight / scale;
    const cameraX = Math.max(0, Math.min(WORLD.width - viewWidth, player.x - viewWidth / 2));
    const cameraY = Math.max(0, Math.min(WORLD.height - viewHeight, player.y - viewHeight / 2));
    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(-cameraX, -cameraY);
    drawMap();
    ctx.restore();
  }

  function resizeCanvas() {
    const pixelRatio = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.floor(canvas.clientWidth * pixelRatio));
    const height = Math.max(1, Math.floor(canvas.clientHeight * pixelRatio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    draw();
  }

  function findNearbyTarget() {
    let nearest = null;
    let nearestDistance = Infinity;
    questions.forEach((question) => {
      if (question.complete) return;
      const distance = Math.hypot(player.x - question.x, player.y - question.y);
      if (distance < 45 && distance < nearestDistance) {
        nearest = question;
        nearestDistance = distance;
      }
    });
    if (nearest) return { type: "question", item: nearest };
    if (Math.hypot(player.x - exit.x, player.y - exit.y) < 56) return { type: "exit" };
    return null;
  }

  function updateInteractionPrompt() {
    activeTarget = findNearbyTarget();
    interactionPrompt.classList.toggle("hidden", !activeTarget || !running || !questionScreen.classList.contains("hidden") || !endingScreen.classList.contains("hidden"));
    if (activeTarget) {
      interactionPrompt.innerHTML = `<kbd>E</kbd> <span>${activeTarget.type === "exit" ? "정문 열기" : "책 읽기"}</span>`;
    }
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 2100);
  }

  function interact() {
    if (startScreen.classList.contains("hidden") === false ||
        !questionScreen.classList.contains("hidden") ||
        !endingScreen.classList.contains("hidden")) return;
    const target = findNearbyTarget();
    if (!target) {
      showToast("조사할 물체 가까이에서 E 키를 눌러 보세요.");
      return;
    }
    if (target.type === "exit") {
      if (questions.every((question) => question.complete)) {
        finalElapsedMs = Date.now() - gameStartedAt;
        gameStartedAt = null;
        timerDisplay.textContent = formatElapsed(finalElapsedMs);
        document.getElementById("final-time").textContent = formatElapsed(finalElapsedMs);
        endingScreen.classList.remove("hidden");
        interactionPrompt.classList.add("hidden");
        document.getElementById("restart-button").focus();
      } else {
        showToast(`정문이 잠겨 있어요. 단서 ${questions.filter((question) => !question.complete).length}개가 더 필요해요.`);
      }
      return;
    }
    activeQuestion = target.item;
    document.getElementById("question-room").textContent = `${activeQuestion.room} · 책 ${String(activeQuestion.index + 1).padStart(2, "0")}`;
    document.getElementById("question-number").textContent = String(activeQuestion.index + 1).padStart(2, "0");
    document.getElementById("question-title").textContent = activeQuestion.prompt;
    document.getElementById("question-hint").textContent = activeQuestion.hint || "주변을 살펴보고 기억을 떠올려 보세요.";
    answerFeedback.textContent = "";
    answerFeedback.classList.remove("correct");
    answerInput.value = "";
    questionScreen.classList.remove("hidden");
    answerInput.focus();
  }

  function updateProgress() {
    const completed = questions.filter((question) => question.complete);
    progressCount.textContent = String(completed.length);
  }

  function submitAnswer(event) {
    event.preventDefault();
    if (!activeQuestion) return;
    if (!isCorrectAnswer(activeQuestion, answerInput.value)) {
      answerFeedback.textContent = "아쉽지만 정답이 아니에요. 다시 생각해 보세요!";
      answerFeedback.classList.remove("correct");
      answerInput.select();
      return;
    }
    activeQuestion.complete = true;
    answerFeedback.textContent = "정답이에요! 새로운 단서를 발견했습니다.";
    answerFeedback.classList.add("correct");
    updateProgress();
    window.setTimeout(() => {
      questionScreen.classList.add("hidden");
      activeQuestion = null;
      canvas.focus();
      showToast("단서 수집 완료! 다른 교실도 조사해 보세요.");
    }, 850);
  }

  function frame(time) {
    const delta = Math.min((time - (lastTime || time)) / 1000, 0.04);
    lastTime = time;
    if (running && questionScreen.classList.contains("hidden") && endingScreen.classList.contains("hidden")) {
      let dx = 0;
      let dy = 0;
      if (keysDown.has("ArrowLeft") || keysDown.has("a")) dx -= 1;
      if (keysDown.has("ArrowRight") || keysDown.has("d")) dx += 1;
      if (keysDown.has("ArrowUp") || keysDown.has("w")) dy -= 1;
      if (keysDown.has("ArrowDown") || keysDown.has("s")) dy += 1;
      movePlayer(dx, dy, delta);
    }
    updateTimer();
    updateInteractionPrompt();
    draw();
    window.requestAnimationFrame(frame);
  }

  document.getElementById("start-button").addEventListener("click", () => {
    startScreen.classList.add("hidden");
    running = true;
    gameStartedAt = Date.now();
    finalElapsedMs = 0;
    timerDisplay.textContent = formatElapsed(0);
    canvas.focus();
    showToast("책 가까이 다가가 E 키를 눌러 읽어 보세요.");
  });
  document.getElementById("close-question").addEventListener("click", () => {
    questionScreen.classList.add("hidden");
    activeQuestion = null;
    canvas.focus();
  });
  document.getElementById("answer-form").addEventListener("submit", submitAnswer);
  document.getElementById("restart-button").addEventListener("click", () => {
    window.location.reload();
  });

  window.addEventListener("keydown", (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    const target = event.target;
    const isTyping = target instanceof HTMLElement &&
      (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
    if (key === "Escape" && !questionScreen.classList.contains("hidden")) {
      questionScreen.classList.add("hidden");
      activeQuestion = null;
      canvas.focus();
      return;
    }
    if (isTyping) return;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(key)) event.preventDefault();
    if (key === "e" && !event.repeat) {
      event.preventDefault();
      interact();
      return;
    }
    keysDown.add(key);
  });
  window.addEventListener("keyup", (event) => {
    keysDown.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key);
  });
  window.addEventListener("blur", () => keysDown.clear());
  window.addEventListener("resize", resizeCanvas);

  buildMap();
  updateProgress();
  resizeCanvas();
  window.requestAnimationFrame(frame);
})();
