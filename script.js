// Canvas setup
const canvas = document.getElementById("gameCanvas")
const ctx = canvas.getContext("2d")

// Responsive canvas sizing
function resizeCanvas() {
  const container = document.querySelector(".game-container")
  const maxWidth = Math.min(800, window.innerWidth - 40)
  const maxHeight = window.innerHeight - 200

  canvas.width = maxWidth
  canvas.height = Math.min(600, maxHeight)
}

resizeCanvas()
window.addEventListener("resize", resizeCanvas)

// Game state
let gameState = "menu" // menu, playing, paused, levelComplete, gameOver
let score = 0
let lives = 3
let level = 1

// Paddle
const paddle = {
  width: 100,
  height: 15,
  x: 0,
  y: 0,
  speed: 8,
  dx: 0,
  color: "#00f5ff",
}

// Balls array (for multi-ball power-up)
let balls = []

// Ball template
function createBall(x, y, dx = 4, dy = -4) {
  return {
    x: x || canvas.width / 2,
    y: y || canvas.height - 50,
    radius: 8,
    speed: 5,
    dx: dx,
    dy: dy,
    color: "#ff00ff",
  }
}

// Bricks
let bricks = []
const brickColors = ["#00f5ff", "#ff00ff", "#00ff88", "#ffaa00", "#ff0080"]
const brickRowCount = 5
const brickColumnCount = 8
const brickWidth = 70
const brickHeight = 25
const brickPadding = 10
const brickOffsetTop = 60
const brickOffsetLeft = 35

// Power-ups
let powerUps = []
const powerUpTypes = [
  { type: "enlarge", color: "#00ff88", symbol: "⬌", effect: "Paleta más grande" },
  { type: "multiball", color: "#ff00ff", symbol: "●●", effect: "Bolas múltiples" },
  { type: "speed", color: "#ffaa00", symbol: "⚡", effect: "Velocidad extra" },
  { type: "shrink", color: "#ff0080", symbol: "⬍", effect: "Paleta pequeña" },
]

// Audio context for sound effects
const audioContext = new (window.AudioContext || window.webkitAudioContext)()

function playSound(frequency, duration, type = "sine") {
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  oscillator.frequency.value = frequency
  oscillator.type = type

  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration)

  oscillator.start(audioContext.currentTime)
  oscillator.stop(audioContext.currentTime + duration)
}

function playBounceSound() {
  playSound(400, 0.1, "square")
}

function playBrickSound() {
  playSound(600, 0.15, "sawtooth")
}

function playLoseLifeSound() {
  playSound(200, 0.3, "sawtooth")
}

function playPowerUpSound() {
  playSound(800, 0.2, "sine")
}

// Initialize game
function initGame() {
  paddle.x = canvas.width / 2 - paddle.width / 2
  paddle.y = canvas.height - 30
  paddle.width = 100

  balls = [createBall()]
  powerUps = []

  createBricks()
}

function createBricks() {
  bricks = []
  const cols = Math.min(
    brickColumnCount,
    Math.floor((canvas.width - brickOffsetLeft * 2) / (brickWidth + brickPadding)),
  )

  for (let row = 0; row < brickRowCount; row++) {
    for (let col = 0; col < cols; col++) {
      const brickX = brickOffsetLeft + col * (brickWidth + brickPadding)
      const brickY = brickOffsetTop + row * (brickHeight + brickPadding)

      bricks.push({
        x: brickX,
        y: brickY,
        width: brickWidth,
        height: brickHeight,
        color: brickColors[row % brickColors.length],
        visible: true,
        hasPowerUp: Math.random() < 0.15, // 15% chance of power-up
      })
    }
  }
}

// Drawing functions
function drawPaddle() {
  ctx.shadowBlur = 20
  ctx.shadowColor = paddle.color
  ctx.fillStyle = paddle.color
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height)
  ctx.shadowBlur = 0
}

function drawBall(ball) {
  ctx.shadowBlur = 15
  ctx.shadowColor = ball.color
  ctx.beginPath()
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2)
  ctx.fillStyle = ball.color
  ctx.fill()
  ctx.closePath()
  ctx.shadowBlur = 0
}

function drawBricks() {
  bricks.forEach((brick) => {
    if (brick.visible) {
      ctx.shadowBlur = 10
      ctx.shadowColor = brick.color
      ctx.fillStyle = brick.color
      ctx.fillRect(brick.x, brick.y, brick.width, brick.height)

      // Inner glow effect
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)"
      ctx.fillRect(brick.x + 2, brick.y + 2, brick.width - 4, brick.height / 2)

      ctx.shadowBlur = 0
    }
  })
}

function drawPowerUps() {
  powerUps.forEach((powerUp) => {
    ctx.shadowBlur = 15
    ctx.shadowColor = powerUp.color
    ctx.fillStyle = powerUp.color
    ctx.fillRect(powerUp.x, powerUp.y, powerUp.size, powerUp.size)

    ctx.fillStyle = "#000"
    ctx.font = "bold 16px Arial"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(powerUp.symbol, powerUp.x + powerUp.size / 2, powerUp.y + powerUp.size / 2)

    ctx.shadowBlur = 0
  })
}

// Movement functions
function movePaddle() {
  paddle.x += paddle.dx

  // Wall collision
  if (paddle.x < 0) paddle.x = 0
  if (paddle.x + paddle.width > canvas.width) paddle.x = canvas.width - paddle.width
}

function moveBall(ball) {
  ball.x += ball.dx
  ball.y += ball.dy

  // Wall collision
  if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
    ball.dx *= -1
    playBounceSound()
  }

  if (ball.y - ball.radius < 0) {
    ball.dy *= -1
    playBounceSound()
  }

  // Paddle collision
  if (ball.y + ball.radius > paddle.y && ball.x > paddle.x && ball.x < paddle.x + paddle.width && ball.dy > 0) {
    // Calculate hit position for angle variation
    const hitPos = (ball.x - paddle.x) / paddle.width
    const angle = ((hitPos - 0.5) * Math.PI) / 3 // -60° to 60°
    const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy)

    ball.dx = speed * Math.sin(angle)
    ball.dy = -speed * Math.cos(angle)

    playBounceSound()
  }

  // Bottom collision (lose life)
  if (ball.y + ball.radius > canvas.height) {
    return false // Ball is lost
  }

  return true // Ball is still in play
}

function movePowerUps() {
  powerUps.forEach((powerUp, index) => {
    powerUp.y += powerUp.speed

    // Check collision with paddle
    if (
      powerUp.y + powerUp.size > paddle.y &&
      powerUp.y < paddle.y + paddle.height &&
      powerUp.x + powerUp.size > paddle.x &&
      powerUp.x < paddle.x + paddle.width
    ) {
      applyPowerUp(powerUp.type)
      powerUps.splice(index, 1)
      playPowerUpSound()
    }

    // Remove if off screen
    if (powerUp.y > canvas.height) {
      powerUps.splice(index, 1)
    }
  })
}

function applyPowerUp(type) {
  switch (type) {
    case "enlarge":
      paddle.width = Math.min(150, paddle.width + 30)
      setTimeout(() => {
        paddle.width = Math.max(100, paddle.width - 30)
      }, 10000)
      break
    case "multiball":
      if (balls.length < 5) {
        const mainBall = balls[0]
        balls.push(createBall(mainBall.x, mainBall.y, -mainBall.dx, mainBall.dy))
        balls.push(createBall(mainBall.x, mainBall.y, mainBall.dx * 1.2, mainBall.dy))
      }
      break
    case "speed":
      balls.forEach((ball) => {
        ball.dx *= 1.3
        ball.dy *= 1.3
      })
      setTimeout(() => {
        balls.forEach((ball) => {
          ball.dx /= 1.3
          ball.dy /= 1.3
        })
      }, 8000)
      break
    case "shrink":
      paddle.width = Math.max(60, paddle.width - 20)
      lives = Math.max(0, lives - 1)
      updateDisplay()
      playLoseLifeSound()
      setTimeout(() => {
        paddle.width = Math.min(100, paddle.width + 20)
      }, 8000)
      break
  }
}

// Collision detection
function detectBrickCollision() {
  balls.forEach((ball) => {
    bricks.forEach((brick) => {
      if (brick.visible) {
        if (
          ball.x + ball.radius > brick.x &&
          ball.x - ball.radius < brick.x + brick.width &&
          ball.y + ball.radius > brick.y &&
          ball.y - ball.radius < brick.y + brick.height
        ) {
          ball.dy *= -1
          brick.visible = false
          score += 10 * level
          updateDisplay()
          playBrickSound()

          // Drop power-up
          if (brick.hasPowerUp) {
            const powerUpType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)]
            powerUps.push({
              x: brick.x + brick.width / 2 - 15,
              y: brick.y,
              size: 30,
              speed: 2,
              type: powerUpType.type,
              color: powerUpType.color,
              symbol: powerUpType.symbol,
            })
          }
        }
      }
    })
  })
}

// Update display
function updateDisplay() {
  document.getElementById("score-display").textContent = score
  document.getElementById("lives-display").textContent = lives
  document.getElementById("level-display").textContent = level
}

// Check win condition
function checkWin() {
  return bricks.every((brick) => !brick.visible)
}

// Game loop
function gameLoop() {
  if (gameState !== "playing") return

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  drawBricks()
  drawPaddle()
  balls.forEach((ball) => drawBall(ball))
  drawPowerUps()

  movePaddle()
  movePowerUps()

  // Move balls and check if any are lost
  balls = balls.filter((ball) => moveBall(ball))

  // If all balls are lost
  if (balls.length === 0) {
    lives--
    updateDisplay()
    playLoseLifeSound()

    if (lives <= 0) {
      gameState = "gameOver"
      showGameOver()
    } else {
      // Reset ball
      balls = [createBall()]
    }
  }

  detectBrickCollision()

  // Check win
  if (checkWin()) {
    gameState = "levelComplete"
    showLevelComplete()
  }

  requestAnimationFrame(gameLoop)
}

// Menu functions
function showMenu(menuId) {
  document.querySelectorAll(".menu-overlay").forEach((menu) => {
    menu.classList.add("hidden")
  })
  document.getElementById(menuId).classList.remove("hidden")
}

function hideAllMenus() {
  document.querySelectorAll(".menu-overlay").forEach((menu) => {
    menu.classList.add("hidden")
  })
}

function showLevelComplete() {
  document.getElementById("level-complete-text").textContent = `¡Has completado el nivel ${level}! Puntuación: ${score}`
  showMenu("level-complete-menu")
}

function showGameOver() {
  document.getElementById("final-score").textContent = `Puntuación final: ${score}`
  showMenu("game-over-menu")
}

function startGame() {
  hideAllMenus()
  gameState = "playing"
  initGame()
  updateDisplay()
  gameLoop()
}

function nextLevel() {
  level++

  // Increase difficulty
  balls.forEach((ball) => {
    ball.dx *= 1.1
    ball.dy *= 1.1
  })

  hideAllMenus()
  gameState = "playing"

  paddle.x = canvas.width / 2 - paddle.width / 2
  balls = [createBall()]
  powerUps = []
  createBricks()

  gameLoop()
}

function restartGame() {
  score = 0
  lives = 3
  level = 1
  startGame()
}

// Event listeners
document.getElementById("start-btn").addEventListener("click", startGame)
document.getElementById("next-level-btn").addEventListener("click", nextLevel)
document.getElementById("restart-btn").addEventListener("click", restartGame)

// Keyboard controls
document.addEventListener("keydown", (e) => {
  if (gameState !== "playing") return

  if (e.key === "ArrowLeft" || e.key === "Left") {
    paddle.dx = -paddle.speed
  } else if (e.key === "ArrowRight" || e.key === "Right") {
    paddle.dx = paddle.speed
  }
})

document.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft" || e.key === "Left" || e.key === "ArrowRight" || e.key === "Right") {
    paddle.dx = 0
  }
})

// Touch controls
let touchStartX = 0
let touchCurrentX = 0

canvas.addEventListener("touchstart", (e) => {
  if (gameState !== "playing") return
  touchStartX = e.touches[0].clientX
  touchCurrentX = touchStartX
})

canvas.addEventListener("touchmove", (e) => {
  if (gameState !== "playing") return
  e.preventDefault()

  touchCurrentX = e.touches[0].clientX
  const deltaX = touchCurrentX - touchStartX

  paddle.x += deltaX * 0.5

  // Boundaries
  if (paddle.x < 0) paddle.x = 0
  if (paddle.x + paddle.width > canvas.width) paddle.x = canvas.width - paddle.width

  touchStartX = touchCurrentX
})

canvas.addEventListener("touchend", () => {
  paddle.dx = 0
})

// Initialize display
updateDisplay()
