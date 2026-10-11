// ========================================
// Tyrese's Dinosaur Runner
// ========================================

// Game elements
const game = document.getElementById("game");
const dino = document.getElementById("dino");
const scoreDisplay = document.getElementById("score");
const highScoreDisplay = document.getElementById("high-score");
const message = document.getElementById("message");
const messageTitle = document.getElementById("message-title");
const messageText = document.getElementById("message-text");
const restartButton = document.getElementById("restart");
const jumpButton = document.getElementById("jump-button");
const statusDisplay = document.getElementById("status");

// Physics and difficulty settings
const GRAVITY = 1800;
const JUMP_STRENGTH = 650;
const STARTING_SPEED = 300;
const MAX_SPEED = 680;
const HIGH_SCORE_KEY = "tyreseDinoRunnerHighScore";

// Game state
let dinoY = 0;
let velocityY = 0;
let obstacles = [];
let score = 0;
let highScore = loadHighScore();
let speed = STARTING_SPEED;
let spawnTimer = 0;
let nextSpawn = 1.3;
let lastTime = 0;
let running = false;
let gameOver = false;
let animationId = null;

// ========================================
// High score storage
// ========================================

function loadHighScore() {
  try {
    const saved = Number(localStorage.getItem(HIGH_SCORE_KEY));

    if (Number.isFinite(saved) && saved >= 0) {
      return Math.floor(saved);
    }
  } catch (error) {
    // Storage may be unavailable in private or restricted contexts.
  }

  return 0;
}

function saveHighScore() {
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
  } catch (error) {
    // The game still works if storage is unavailable.
  }
}

function updateScoreDisplay() {
  scoreDisplay.textContent = String(Math.floor(score))
    .padStart(5, "0");

  highScoreDisplay.textContent = String(highScore)
    .padStart(5, "0");
}

// ========================================
// Starting and restarting
// ========================================

function startGame() {
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
  }

  // Remove any remaining obstacles.
  for (const obstacle of obstacles) {
    obstacle.element.remove();
  }

  obstacles = [];

  // Reset the game state.
  dinoY = 0;
  velocityY = 0;
  score = 0;
  speed = STARTING_SPEED;
  spawnTimer = 0;
  nextSpawn = 1.3;
  lastTime = 0;
  gameOver = false;
  running = true;
  animationId = null;

  // Reset the dinosaur and display.
  dino.style.bottom = "2px";
  dino.classList.remove("jumping");
  dino.classList.add("running");

  game.classList.add("is-running");
  message.classList.add("hidden");

  updateScoreDisplay();
  statusDisplay.textContent = "Game started. Avoid the obstacles.";

  animationId = requestAnimationFrame(gameLoop);
}

// ========================================
// Jumping controls
// ========================================

function jump() {
  if (!running) {
    startGame();
  }

  // Only jump when on the ground.
  if (dinoY <= 0.5 && velocityY <= 0) {
    velocityY = JUMP_STRENGTH;

    dino.classList.remove("running");
    dino.classList.add("jumping");
  }
}

// ========================================
// Obstacle creation
// ========================================

function createObstacle() {
  const roll = Math.random();

  // Flying dinosaurs appear once the run gets going.
  if (score >= 80 && roll < 0.22) {
    createPterodactyl();
  } else if (roll < 0.48) {
    createCactusCluster();
  } else {
    createCactus();
  }
}

function addObstacle(element, type, width) {
  const x = game.clientWidth;

  element.style.left = x + "px";
  game.appendChild(element);

  obstacles.push({
    element,
    type,
    x,
    width
  });
}

function createCactus() {
  const cactus = document.createElement("div");
  cactus.className = "cactus";

  const roll = Math.random();

  if (roll < 0.25) {
    cactus.classList.add("short");
  } else if (roll > 0.75) {
    cactus.classList.add("tall");
  }

  const width = roll < 0.25 ? 17 : roll > 0.75 ? 22 : 20;

  addObstacle(cactus, "cactus", width);
}

function createCactusCluster() {
  const cluster = document.createElement("div");
  cluster.className = "cactus-cluster";

  for (let i = 0; i < 3; i++) {
    const cactus = document.createElement("div");
    cactus.className = "cactus";

    if (i === 1) {
      cactus.classList.add("short");
    }

    cluster.appendChild(cactus);
  }

  addObstacle(cluster, "cluster", 52);
}

function createPterodactyl() {
  const ptero = document.createElement("div");
  ptero.className = "ptero";
  ptero.setAttribute("aria-label", "Flying obstacle");

  // The flying obstacle can appear at different heights.
  const height = Math.random() < 0.5 ? 62 : 100;
  ptero.style.bottom = height + "px";

  ptero.innerHTML = `
    <svg viewBox="0 0 48 32" aria-hidden="true">
      <g fill="currentColor">
        <path d="M2 12 L16 16 L23 10 L30 13 L43 8 L37 17 L28 19 L21 25 L17 18 L8 17 Z"/>
        <path class="ptero-wing" d="M17 15 L9 1 L23 10 L31 2 L29 16 Z"/>
        <path d="M38 10 L47 7 L43 13 L38 14 Z"/>
        <circle cx="39" cy="10" r="1" fill="white"/>
      </g>
    </svg>
  `;

  addObstacle(ptero, "ptero", 46);
}

// ========================================
// Difficulty progression
// ========================================

function updateDifficulty() {
  // Increase speed gradually, with a maximum limit.
  speed = Math.min(
    STARTING_SPEED + score * 1.8,
    MAX_SPEED
  );

  // Obstacles appear a little more frequently over time.
  const baseInterval = Math.max(
    0.78,
    1.35 - score / 700
  );

  nextSpawn = baseInterval + Math.random() * 0.5;
}

// ========================================
// Collision detection
// ========================================

function checkCollision(dinoRect, obstacleRect, type) {
  // Smaller hitboxes make collisions feel fairer.
  const horizontalInset = type === "ptero" ? 7 : 3;
  const verticalInset = type === "ptero" ? 5 : 3;

  return (
    dinoRect.left + 8 < obstacleRect.right - horizontalInset &&
    dinoRect.right - 8 > obstacleRect.left + horizontalInset &&
    dinoRect.bottom - 5 > obstacleRect.top + verticalInset &&
    dinoRect.top + 8 < obstacleRect.bottom - verticalInset
  );
}

// ========================================
// Main game loop
// ========================================

function gameLoop(timestamp) {
  if (!running) return;

  // Convert milliseconds to seconds and limit large frame gaps.
  const deltaTime = lastTime
    ? Math.min((timestamp - lastTime) / 1000, 0.04)
    : 0;

  lastTime = timestamp;

  // Apply gravity and update vertical position.
  velocityY -= GRAVITY * deltaTime;
  dinoY += velocityY * deltaTime;

  // Keep the dinosaur above the ground.
  if (dinoY <= 0) {
    dinoY = 0;
    velocityY = 0;
    dino.classList.remove("jumping");
    dino.classList.add("running");
  }

  dino.style.bottom = (dinoY + 2) + "px";

  // Increase score and difficulty.
  score += deltaTime * 10;
  updateDifficulty();
  updateScoreDisplay();

  // Spawn obstacles at intervals.
  spawnTimer += deltaTime;

  if (spawnTimer >= nextSpawn) {
    createObstacle();
    spawnTimer = 0;
    updateDifficulty();
  }

  // Get the dinosaur's current collision box.
  const dinoRect = dino.getBoundingClientRect();

  // Move obstacles and check collisions.
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obstacle = obstacles[i];

    obstacle.x -= speed * deltaTime;
    obstacle.element.style.left = obstacle.x + "px";

    const obstacleRect =
      obstacle.element.getBoundingClientRect();

    if (checkCollision(dinoRect, obstacleRect, obstacle.type)) {
      endGame();
      return;
    }

    // Remove obstacles that have left the game area.
    if (obstacle.x + obstacle.width < 0) {
      obstacle.element.remove();
      obstacles.splice(i, 1);
    }
  }

  animationId = requestAnimationFrame(gameLoop);
}

// ========================================
// Game over
// ========================================

function endGame() {
  running = false;
  gameOver = true;
  animationId = null;

  game.classList.remove("is-running");
  dino.classList.remove("running", "jumping");

  const finalScore = Math.floor(score);
  const newRecord = finalScore > highScore;

  if (newRecord) {
    highScore = finalScore;
    saveHighScore();
  }

  updateScoreDisplay();

  messageTitle.textContent = "GAME OVER";
  messageText.textContent = newRecord
    ? `New high score: ${finalScore}! Press SPACE or tap to retry.`
    : `Score: ${finalScore} · Press SPACE or tap to retry.`;

  message.classList.remove("hidden");
  statusDisplay.textContent =
    `Game over. Score ${finalScore}. High score ${highScore}.`;
}

// ========================================
// Keyboard controls
// ========================================

document.addEventListener("keydown", event => {
  if (event.code !== "Space" && event.code !== "ArrowUp") {
    return;
  }

  // Prevent key-hold from repeatedly triggering jumps.
  if (event.repeat) return;

  event.preventDefault();
  jump();
});

// ========================================
// Touch, mouse, and mobile controls
// ========================================

game.addEventListener("pointerdown", event => {
  // Ignore non-primary mouse buttons.
  if (event.pointerType === "mouse" && event.button !== 0) {
    return;
  }

  jump();
});

jumpButton.addEventListener("click", jump);

restartButton.addEventListener("click", () => {
  startGame();
});

// ========================================
// Initial setup
// ========================================

updateScoreDisplay();