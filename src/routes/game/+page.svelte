<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';

  type BabylonModule = typeof import('babylonjs');

  // Game configuration constants
  const SPIN_ANIMATION_CYCLES = 20;
  const SPIN_INTERVAL_MS = 100;
  const SPIN_COST = 10;
  const INITIAL_CREDITS = 100;

  let canvas: HTMLCanvasElement;
  let engine: { runRenderLoop: (fn: () => void) => void; resize: () => void; dispose: () => void } | null = null;
  let scene: { render: () => void } | null = null;
  let credits = INITIAL_CREDITS;
  let isSpinning = false;
  let lastWin = 0;
  let message = 'Press SPIN to play!';

  // Slot machine symbols
  const symbols = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎', '7️⃣'];
  let reelResults = ['🍒', '🍒', '🍒'];

  onMount(async () => {
    if (!browser) return;

    // Dynamically import Babylon.js
    const BABYLON: BabylonModule = await import('babylonjs');

    // Create engine
    engine = new BABYLON.Engine(canvas, true);

    // Create scene
    scene = createScene(BABYLON);

    // Run render loop
    engine.runRenderLoop(() => {
      scene?.render();
    });

    // Handle resize
    const handleResize = () => {
      engine?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });

  onDestroy(() => {
    if (engine) {
      engine.dispose();
    }
  });

  function createScene(BABYLON: BabylonModule) {
    const scn = new BABYLON.Scene(engine as InstanceType<BabylonModule['Engine']>);

    // Set background color - casino-like dark atmosphere
    scn.clearColor = new BABYLON.Color4(0.05, 0.02, 0.1, 1);

    // Create first-person camera
    const camera = new BABYLON.UniversalCamera(
      'playerCamera',
      new BABYLON.Vector3(0, 1.7, -3),
      scn
    );
    camera.setTarget(new BABYLON.Vector3(0, 1.2, 0));
    camera.attachControl(canvas, true);
    camera.speed = 0.3;
    camera.angularSensibility = 2000;
    camera.keysUp.push(87); // W
    camera.keysDown.push(83); // S
    camera.keysLeft.push(65); // A
    camera.keysRight.push(68); // D

    // Add ambient light
    const ambientLight = new BABYLON.HemisphericLight(
      'ambientLight',
      new BABYLON.Vector3(0, 1, 0),
      scn
    );
    ambientLight.intensity = 0.3;
    ambientLight.groundColor = new BABYLON.Color3(0.1, 0.05, 0.15);

    // Add point lights for casino atmosphere
    const spotLight1 = new BABYLON.PointLight('spotLight1', new BABYLON.Vector3(-2, 3, 2), scn);
    spotLight1.intensity = 0.8;
    spotLight1.diffuse = new BABYLON.Color3(1, 0.8, 0.4);

    const spotLight2 = new BABYLON.PointLight('spotLight2', new BABYLON.Vector3(2, 3, 2), scn);
    spotLight2.intensity = 0.8;
    spotLight2.diffuse = new BABYLON.Color3(0.8, 0.4, 1);

    // Create floor
    const floor = BABYLON.MeshBuilder.CreateGround('floor', { width: 20, height: 20 }, scn);
    const floorMat = new BABYLON.StandardMaterial('floorMat', scn);
    floorMat.diffuseColor = new BABYLON.Color3(0.15, 0.1, 0.2);
    floorMat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    floor.material = floorMat;

    // Create slot machine body
    const slotBody = BABYLON.MeshBuilder.CreateBox(
      'slotBody',
      { width: 2, height: 2.5, depth: 1 },
      scn
    );
    slotBody.position = new BABYLON.Vector3(0, 1.25, 0);
    const slotBodyMat = new BABYLON.StandardMaterial('slotBodyMat', scn);
    slotBodyMat.diffuseColor = new BABYLON.Color3(0.8, 0.1, 0.1);
    slotBodyMat.specularColor = new BABYLON.Color3(0.5, 0.3, 0.3);
    slotBody.material = slotBodyMat;

    // Create slot machine top
    const slotTop = BABYLON.MeshBuilder.CreateBox(
      'slotTop',
      { width: 2.2, height: 0.3, depth: 1.1 },
      scn
    );
    slotTop.position = new BABYLON.Vector3(0, 2.65, 0);
    const slotTopMat = new BABYLON.StandardMaterial('slotTopMat', scn);
    slotTopMat.diffuseColor = new BABYLON.Color3(1, 0.8, 0.2);
    slotTopMat.emissiveColor = new BABYLON.Color3(0.3, 0.2, 0);
    slotTop.material = slotTopMat;

    // Create display screen background
    const displayScreen = BABYLON.MeshBuilder.CreateBox(
      'displayScreen',
      { width: 1.6, height: 0.8, depth: 0.05 },
      scn
    );
    displayScreen.position = new BABYLON.Vector3(0, 1.5, -0.53);
    const displayMat = new BABYLON.StandardMaterial('displayMat', scn);
    displayMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.15);
    displayMat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
    displayScreen.material = displayMat;

    // Create 3 reel boxes
    for (let i = -1; i <= 1; i++) {
      const reelBox = BABYLON.MeshBuilder.CreateBox(
        `reelBox${i}`,
        { width: 0.45, height: 0.6, depth: 0.02 },
        scn
      );
      reelBox.position = new BABYLON.Vector3(i * 0.5, 1.5, -0.56);
      const reelMat = new BABYLON.StandardMaterial(`reelMat${i}`, scn);
      reelMat.diffuseColor = new BABYLON.Color3(1, 1, 1);
      reelMat.emissiveColor = new BABYLON.Color3(0.8, 0.8, 0.8);
      reelBox.material = reelMat;
    }

    // Create lever
    const leverBase = BABYLON.MeshBuilder.CreateCylinder(
      'leverBase',
      { diameter: 0.15, height: 0.3 },
      scn
    );
    leverBase.position = new BABYLON.Vector3(1.2, 0.8, 0);
    const leverMat = new BABYLON.StandardMaterial('leverMat', scn);
    leverMat.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.3);
    leverBase.material = leverMat;

    const leverHandle = BABYLON.MeshBuilder.CreateCylinder(
      'leverHandle',
      { diameter: 0.08, height: 0.8 },
      scn
    );
    leverHandle.position = new BABYLON.Vector3(1.2, 1.3, 0);
    leverHandle.material = leverMat;

    const leverBall = BABYLON.MeshBuilder.CreateSphere('leverBall', { diameter: 0.2 }, scn);
    leverBall.position = new BABYLON.Vector3(1.2, 1.8, 0);
    const leverBallMat = new BABYLON.StandardMaterial('leverBallMat', scn);
    leverBallMat.diffuseColor = new BABYLON.Color3(1, 0, 0);
    leverBallMat.emissiveColor = new BABYLON.Color3(0.3, 0, 0);
    leverBall.material = leverBallMat;

    // Create decorative lights around the machine
    const lightPositions = [
      [-1, 2.4, -0.55],
      [-0.5, 2.4, -0.55],
      [0, 2.4, -0.55],
      [0.5, 2.4, -0.55],
      [1, 2.4, -0.55],
    ];

    lightPositions.forEach((pos, idx) => {
      const lightBulb = BABYLON.MeshBuilder.CreateSphere(
        `decorLight${idx}`,
        { diameter: 0.1 },
        scn
      );
      lightBulb.position = new BABYLON.Vector3(pos[0], pos[1], pos[2]);
      const bulbMat = new BABYLON.StandardMaterial(`bulbMat${idx}`, scn);
      const hue = (idx * 0.2) % 1;
      bulbMat.emissiveColor = BABYLON.Color3.FromHSV(hue * 360, 1, 1);
      lightBulb.material = bulbMat;
    });

    // Add some casino environment elements
    // Walls
    const backWall = BABYLON.MeshBuilder.CreateBox('backWall', { width: 20, height: 6, depth: 0.2 }, scn);
    backWall.position = new BABYLON.Vector3(0, 3, 10);
    const wallMat = new BABYLON.StandardMaterial('wallMat', scn);
    wallMat.diffuseColor = new BABYLON.Color3(0.1, 0.05, 0.15);
    backWall.material = wallMat;

    const leftWall = BABYLON.MeshBuilder.CreateBox('leftWall', { width: 0.2, height: 6, depth: 20 }, scn);
    leftWall.position = new BABYLON.Vector3(-10, 3, 0);
    leftWall.material = wallMat;

    const rightWall = BABYLON.MeshBuilder.CreateBox('rightWall', { width: 0.2, height: 6, depth: 20 }, scn);
    rightWall.position = new BABYLON.Vector3(10, 3, 0);
    rightWall.material = wallMat;

    return scn;
  }

  function spin() {
    if (isSpinning || credits < SPIN_COST) {
      if (credits < SPIN_COST) {
        message = 'Not enough credits!';
      }
      return;
    }

    isSpinning = true;
    credits -= SPIN_COST;
    lastWin = 0;
    message = 'Spinning...';

    // Simulate spinning animation
    let spinCount = 0;
    const spinInterval = setInterval(() => {
      reelResults = symbols.map(() => symbols[Math.floor(Math.random() * symbols.length)]);
      spinCount++;

      if (spinCount >= SPIN_ANIMATION_CYCLES) {
        clearInterval(spinInterval);

        // Final results
        reelResults = [
          symbols[Math.floor(Math.random() * symbols.length)],
          symbols[Math.floor(Math.random() * symbols.length)],
          symbols[Math.floor(Math.random() * symbols.length)],
        ];

        // Check for wins
        checkWin();
        isSpinning = false;
      }
    }, SPIN_INTERVAL_MS);
  }

  function checkWin() {
    const [a, b, c] = reelResults;

    if (a === b && b === c) {
      // Jackpot - all three match
      if (a === '7️⃣') {
        lastWin = 500;
        message = '🎉 MEGA JACKPOT! 777! 🎉';
      } else if (a === '💎') {
        lastWin = 200;
        message = '💎 DIAMOND JACKPOT! 💎';
      } else if (a === '⭐') {
        lastWin = 100;
        message = '⭐ STAR JACKPOT! ⭐';
      } else {
        lastWin = 50;
        message = `🎰 Three ${a}! Winner! 🎰`;
      }
    } else if (a === b || b === c || a === c) {
      // Two matching
      lastWin = 15;
      message = '👍 Two matching! Small win!';
    } else {
      message = 'No luck this time. Try again!';
    }

    credits += lastWin;
  }

  function addCredits() {
    credits += 50;
    message = '+50 credits added!';
  }
</script>

<svelte:head>
  <title>Slot Machine Game - Babylon.js First Person</title>
  <meta name="description" content="First person slot machine game built with Babylon.js" />
</svelte:head>

<div class="game-container">
  <canvas bind:this={canvas} class="game-canvas"></canvas>

  <!-- HUD Overlay -->
  <div class="hud">
    <div class="hud-top">
      <h1 class="game-title">🎰 LUCKY SLOTS 🎰</h1>
      <p class="instructions">Use WASD to move, mouse to look around</p>
    </div>

    <div class="slot-display">
      <div class="reels">
        {#each reelResults as symbol}
          <div class="reel" class:spinning={isSpinning}>
            {symbol}
          </div>
        {/each}
      </div>
    </div>

    <div class="hud-bottom">
      <div class="credits-display">
        <span class="label">Credits:</span>
        <span class="value">{credits}</span>
      </div>

      <div class="message-display" class:win={lastWin > 0}>
        {message}
      </div>

      {#if lastWin > 0}
        <div class="win-display">
          +{lastWin} credits!
        </div>
      {/if}

      <div class="controls">
        <button class="spin-button" on:click={spin} disabled={isSpinning || credits < SPIN_COST}>
          {#if isSpinning}
            SPINNING...
          {:else}
            SPIN ({SPIN_COST} credits)
          {/if}
        </button>

        <button class="add-credits-button" on:click={addCredits}>
          +50 Credits
        </button>
      </div>
    </div>
  </div>

  <a href="/" class="back-link">← Back to SignInspector</a>
</div>

<style>
  .game-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background: #000;
  }

  .game-canvas {
    width: 100%;
    height: 100%;
    display: block;
  }

  .hud {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 20px;
  }

  .hud-top {
    text-align: center;
  }

  .game-title {
    font-size: 2.5rem;
    color: #ffd700;
    text-shadow: 0 0 20px rgba(255, 215, 0, 0.8), 2px 2px 4px rgba(0, 0, 0, 0.8);
    margin: 0;
    font-family: 'Arial Black', sans-serif;
    animation: glow 2s ease-in-out infinite alternate;
  }

  @keyframes glow {
    from {
      text-shadow: 0 0 20px rgba(255, 215, 0, 0.8), 2px 2px 4px rgba(0, 0, 0, 0.8);
    }
    to {
      text-shadow: 0 0 40px rgba(255, 215, 0, 1), 0 0 60px rgba(255, 100, 0, 0.5),
        2px 2px 4px rgba(0, 0, 0, 0.8);
    }
  }

  .instructions {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.9rem;
    margin-top: 5px;
  }

  .slot-display {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .reels {
    display: flex;
    gap: 10px;
    background: linear-gradient(145deg, #1a1a2e, #0f0f1a);
    padding: 20px 30px;
    border-radius: 15px;
    border: 3px solid #ffd700;
    box-shadow: 0 0 30px rgba(255, 215, 0, 0.3), inset 0 0 20px rgba(0, 0, 0, 0.5);
  }

  .reel {
    width: 80px;
    height: 100px;
    background: linear-gradient(180deg, #fff, #e0e0e0);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 3rem;
    border: 2px solid #888;
    box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.2);
  }

  .reel.spinning {
    animation: spinReel 0.1s linear infinite;
  }

  @keyframes spinReel {
    0% {
      transform: translateY(-5px);
    }
    50% {
      transform: translateY(5px);
    }
    100% {
      transform: translateY(-5px);
    }
  }

  .hud-bottom {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
  }

  .credits-display {
    background: rgba(0, 0, 0, 0.7);
    padding: 15px 30px;
    border-radius: 10px;
    border: 2px solid #ffd700;
  }

  .credits-display .label {
    color: #fff;
    font-size: 1.2rem;
    margin-right: 10px;
  }

  .credits-display .value {
    color: #ffd700;
    font-size: 1.5rem;
    font-weight: bold;
  }

  .message-display {
    color: #fff;
    font-size: 1.3rem;
    text-align: center;
    background: rgba(0, 0, 0, 0.6);
    padding: 10px 20px;
    border-radius: 8px;
    min-height: 50px;
    display: flex;
    align-items: center;
  }

  .message-display.win {
    color: #ffd700;
    animation: pulse 0.5s ease-in-out infinite alternate;
  }

  @keyframes pulse {
    from {
      transform: scale(1);
    }
    to {
      transform: scale(1.05);
    }
  }

  .win-display {
    color: #00ff00;
    font-size: 2rem;
    font-weight: bold;
    text-shadow: 0 0 20px rgba(0, 255, 0, 0.8);
    animation: winPop 0.3s ease-out;
  }

  @keyframes winPop {
    0% {
      transform: scale(0.5);
      opacity: 0;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }

  .controls {
    display: flex;
    gap: 15px;
    pointer-events: auto;
  }

  .spin-button {
    background: linear-gradient(145deg, #ff4444, #cc0000);
    color: #fff;
    font-size: 1.5rem;
    font-weight: bold;
    padding: 15px 40px;
    border: none;
    border-radius: 15px;
    cursor: pointer;
    box-shadow: 0 5px 15px rgba(255, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3);
    transition: all 0.2s ease;
    text-transform: uppercase;
    letter-spacing: 2px;
  }

  .spin-button:hover:not(:disabled) {
    background: linear-gradient(145deg, #ff6666, #ee0000);
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(255, 0, 0, 0.5);
  }

  .spin-button:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 2px 8px rgba(255, 0, 0, 0.4);
  }

  .spin-button:disabled {
    background: linear-gradient(145deg, #666, #444);
    cursor: not-allowed;
    box-shadow: none;
  }

  .add-credits-button {
    background: linear-gradient(145deg, #44aa44, #228822);
    color: #fff;
    font-size: 1rem;
    font-weight: bold;
    padding: 15px 25px;
    border: none;
    border-radius: 15px;
    cursor: pointer;
    box-shadow: 0 5px 15px rgba(0, 128, 0, 0.4);
    transition: all 0.2s ease;
  }

  .add-credits-button:hover {
    background: linear-gradient(145deg, #66cc66, #33aa33);
    transform: translateY(-2px);
  }

  .back-link {
    position: absolute;
    top: 20px;
    left: 20px;
    color: rgba(255, 255, 255, 0.8);
    text-decoration: none;
    font-size: 1rem;
    background: rgba(0, 0, 0, 0.5);
    padding: 10px 20px;
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .back-link:hover {
    background: rgba(0, 0, 0, 0.7);
    color: #fff;
  }

  @media (max-width: 768px) {
    .game-title {
      font-size: 1.5rem;
    }

    .reel {
      width: 60px;
      height: 80px;
      font-size: 2.5rem;
    }

    .spin-button {
      font-size: 1rem;
      padding: 12px 25px;
    }

    .add-credits-button {
      font-size: 0.9rem;
      padding: 12px 15px;
    }
  }
</style>
