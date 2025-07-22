class PoolGame extends Phaser.Scene {
    constructor() {
        super({ key: 'PoolGame' });
        this.score = 0;
        this.ballMoving = false;
        this.powerLevel = 1;
        this.basePower = 500;
        this.tableFriction = 0.96; // Adjustable friction coefficient (lower = more friction)
        this.redBallCount = 0;
        this.redBalls = [];
        this.anyBallMoving = false;
    }

    preload() {
        // Create simple colored rectangles for the pool table
        this.load.image('table', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
    }

    create() {
        // Game dimensions
        const gameWidth = 800;
        const gameHeight = 600;
        const tableWidth = 700;
        const tableHeight = 400;
        const railWidth = 20;

        // Center the table
        const tableX = (gameWidth - tableWidth) / 2;
        const tableY = (gameHeight - tableHeight) / 2;

        // Create pool table background (green felt)
        const table = this.add.rectangle(gameWidth / 2, gameHeight / 2, tableWidth, tableHeight, 0x228B22);
        
        // Create rails (brown borders)
        // Top rail
        this.add.rectangle(gameWidth / 2, tableY - railWidth / 2, tableWidth + railWidth * 2, railWidth, 0x8B4513);
        // Bottom rail
        this.add.rectangle(gameWidth / 2, tableY + tableHeight + railWidth / 2, tableWidth + railWidth * 2, railWidth, 0x8B4513);
        // Left rail
        this.add.rectangle(tableX - railWidth / 2, gameHeight / 2, railWidth, tableHeight, 0x8B4513);
        // Right rail
        this.add.rectangle(tableX + tableWidth + railWidth / 2, gameHeight / 2, railWidth, tableHeight, 0x8B4513);

        // Create white pool ball
        this.ball = this.add.circle(gameWidth / 2, gameHeight / 2, 12, 0xFFFFFF);
        this.ball.setStrokeStyle(2, 0x000000);

        // Enable physics
        this.physics.world.enable(this.ball);
        this.ball.body.setCircle(12);
        this.ball.body.setBounce(0.8);
        this.ball.body.setDrag(0); // Remove built-in drag, we'll handle it manually
        this.ball.body.setMaxVelocity(400);

        // Create physics bodies for rails
        // Top rail
        this.topRail = this.physics.add.staticImage(gameWidth / 2, tableY - 15, null);
        this.topRail.setSize(tableWidth, 30);
        this.topRail.setVisible(false);

        // Bottom rail  
        this.bottomRail = this.physics.add.staticImage(gameWidth / 2, tableY + tableHeight + 15, null);
        this.bottomRail.setSize(tableWidth, 30);
        this.bottomRail.setVisible(false);

        // Left rail
        this.leftRail = this.physics.add.staticImage(tableX - 15, gameHeight / 2, null);
        this.leftRail.setSize(30, tableHeight);
        this.leftRail.setVisible(false);

        // Right rail
        this.rightRail = this.physics.add.staticImage(tableX + tableWidth + 15, gameHeight / 2, null);
        this.rightRail.setSize(30, tableHeight);
        this.rightRail.setVisible(false);

        // Set up collisions between ball and rails
        this.physics.add.collider(this.ball, [this.topRail, this.bottomRail, this.leftRail, this.rightRail], this.onRailBounce, null, this);

        // Make ball interactive
        this.ball.setInteractive();
        this.ball.on('pointerdown', this.onBallClick, this);

        // Store table boundaries for keeping ball on table
        this.tableBounds = {
            left: tableX,
            right: tableX + tableWidth,
            top: tableY,
            bottom: tableY + tableHeight
        };

        // Update score display
        this.updateScore();
        
        // Set up shop event listeners
        const upgradeButton = document.getElementById('powerUpgrade');
        const closeShopButton = document.getElementById('closeShop');
        const buyRedBallButton = document.getElementById('buyRedBall');
        
        if (upgradeButton) {
            upgradeButton.addEventListener('click', () => this.buyPowerUpgrade());
        }
        
        if (buyRedBallButton) {
            buyRedBallButton.addEventListener('click', () => this.buyRedBall());
        }
        
        if (closeShopButton) {
            closeShopButton.addEventListener('click', () => this.toggleShop());
        }
        
        // Set up keyboard listener for Tab key
        this.input.keyboard.on('keydown-TAB', (event) => {
            event.preventDefault(); // Prevent default tab behavior
            this.toggleShop();
        });

        // Create trajectory dots (initially hidden)
        this.trajectoryDots = [];
        for (let i = 0; i < 10; i++) {
            const dot = this.add.circle(0, 0, 2, 0xFFFFFF);
            dot.setVisible(false);
            this.trajectoryDots.push(dot);
        }

        // Set up mouse move listener for aiming
        this.input.on('pointermove', this.updateAiming, this);
        
        this.updateShopDisplay();
    }

    onBallClick(pointer) {
        // Only allow clicking if no balls are moving
        if (this.anyBallMoving) return;

        // Calculate direction from click point to ball center
        const ballX = this.ball.x;
        const ballY = this.ball.y;
        const clickX = pointer.x;
        const clickY = pointer.y;

        // Calculate opposite direction
        const dirX = ballX - clickX;
        const dirY = ballY - clickY;

        // Normalize and scale the direction
        const length = Math.sqrt(dirX * dirX + dirY * dirY);
        
        // Don't move if click is exactly on the ball (zero distance)
        if (length === 0) return;
        
        const normalizedX = dirX / length;
        const normalizedY = dirY / length;

        // Set velocity (opposite to click direction) - power based on upgrade level
        const speed = this.calculateBallSpeed();
        this.ball.body.setVelocity(normalizedX * speed, normalizedY * speed);
        
        this.ballMoving = true;
        this.anyBallMoving = true;
        
        // Hide trajectory when ball is struck
        this.hideAiming();
    }

    updateAiming(pointer) {
        // Only show aiming when no balls are moving
        if (this.anyBallMoving) {
            this.hideAiming();
            return;
        }

        // Check if shop is open
        const shopOverlay = document.getElementById('shopOverlay');
        if (shopOverlay && shopOverlay.style.display === 'flex') {
            this.hideAiming();
            return;
        }

        this.showAiming(pointer);
    }

    showAiming(pointer) {
        const ballX = this.ball.x;
        const ballY = this.ball.y;
        const mouseX = pointer.x;
        const mouseY = pointer.y;

        // Check if mouse is over the white ball (within ball radius + small buffer)
        const distanceToMouse = Math.sqrt((mouseX - ballX) ** 2 + (mouseY - ballY) ** 2);
        const ballRadius = 12;
        const hoverBuffer = 8; // Extra pixels for easier hovering
        
        if (distanceToMouse <= ballRadius + hoverBuffer) {
            // Calculate direction from mouse to ball
            const dirX = ballX - mouseX;
            const dirY = ballY - mouseY;
            const length = Math.sqrt(dirX * dirX + dirY * dirY);

            if (length > 0) {
                // Normalize direction
                const normalizedX = dirX / length;
                const normalizedY = dirY / length;

                // Show trajectory dots
                const trajectoryLength = 80;
                const dotSpacing = 8;
                
                for (let i = 0; i < this.trajectoryDots.length; i++) {
                    const distance = (i + 1) * dotSpacing;
                    if (distance <= trajectoryLength) {
                        const dotX = ballX + normalizedX * distance;
                        const dotY = ballY + normalizedY * distance;
                        this.trajectoryDots[i].setPosition(dotX, dotY);
                        this.trajectoryDots[i].setVisible(true);
                    } else {
                        this.trajectoryDots[i].setVisible(false);
                    }
                }
            }
        } else {
            // Hide trajectory when not hovering over ball
            this.hideAiming();
        }
    }

    hideAiming() {
        for (let dot of this.trajectoryDots) {
            dot.setVisible(false);
        }
    }

    buyRedBall() {
        const redBallCost = 10;
        if (this.score >= redBallCost) {
            this.score -= redBallCost;
            this.redBallCount++;
            this.spawnRedBall();
            this.updateScore();
            this.updateShopDisplay();
        }
    }

    spawnRedBall() {
        // Find a random position on the table that doesn't overlap with existing balls
        const tableX = (800 - 700) / 2;
        const tableY = (600 - 400) / 2;
        const tableWidth = 700;
        const tableHeight = 400;
        
        let x, y;
        let attempts = 0;
        do {
            x = tableX + Math.random() * (tableWidth - 60) + 30;
            y = tableY + Math.random() * (tableHeight - 60) + 30;
            attempts++;
        } while (this.isTooCloseToOtherBalls(x, y) && attempts < 20);

        // Create red ball
        const redBall = this.add.circle(x, y, 12, 0xFF0000);
        redBall.setStrokeStyle(2, 0x000000);

        // Enable physics
        this.physics.world.enable(redBall);
        redBall.body.setCircle(12);
        redBall.body.setBounce(0.8);
        redBall.body.setDrag(0);
        redBall.body.setMaxVelocity(400);

        // Add to red balls array
        this.redBalls.push(redBall);

        // Set up collisions between red ball and rails
        this.physics.add.collider(redBall, [this.topRail, this.bottomRail, this.leftRail, this.rightRail], () => {
            this.score++;
            this.updateScore();
        });

        // Set up collision between white ball and red ball
        this.physics.add.collider(this.ball, redBall, () => {
            this.score++;
            this.updateScore();
        });

        // Set up collisions between this red ball and all existing red balls
        for (let existingRedBall of this.redBalls) {
            this.physics.add.collider(redBall, existingRedBall, () => {
                this.score++;
                this.updateScore();
            });
        }
    }

    isTooCloseToOtherBalls(x, y) {
        // Check distance from white ball
        const distToWhite = Math.sqrt((x - this.ball.x) ** 2 + (y - this.ball.y) ** 2);
        if (distToWhite < 50) return true;

        // Check distance from other red balls
        for (let redBall of this.redBalls) {
            const dist = Math.sqrt((x - redBall.x) ** 2 + (y - redBall.y) ** 2);
            if (dist < 50) return true;
        }

        return false;
    }

    onRailBounce() {
        // Score a point when ball bounces off any rail
        this.score++;
        this.updateScore();
    }

    calculateBallSpeed() {
        return this.basePower + (this.powerLevel - 1) * 100;
    }

    flashBall() {
        // Flash the ball quickly to indicate it can be clicked
        // Simple flash sequence using alpha
        this.tweens.add({
            targets: this.ball,
            alpha: 0.3,
            duration: 50,
            yoyo: true,
            repeat: 0,
            onComplete: () => {
                this.ball.alpha = 1; // Ensure it's fully visible when done
            }
        });
    }

    update() {
        let anyMoving = false;
        
        // Check white ball movement
        if (this.ballMoving) {
            const velocity = this.ball.body.velocity;
            const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
            
            // If ball speed is very low, consider it stopped
            if (speed < 5) {
                this.ball.body.setVelocity(0, 0);
                this.ballMoving = false;
                this.score++;
                this.updateScore();
                this.flashBall();
            } else {
                // Apply custom friction that maintains direction
                this.ball.body.setVelocity(velocity.x * this.tableFriction, velocity.y * this.tableFriction);
                anyMoving = true;
            }
        }

        // Check red ball movement and apply friction
        for (let redBall of this.redBalls) {
            const velocity = redBall.body.velocity;
            const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
            
            if (speed < 5) {
                redBall.body.setVelocity(0, 0);
            } else {
                redBall.body.setVelocity(velocity.x * this.tableFriction, velocity.y * this.tableFriction);
                anyMoving = true;
            }
        }

        this.anyBallMoving = anyMoving;
    }

    updateScore() {
        const scoreElement = document.getElementById('score');
        if (scoreElement) {
            scoreElement.textContent = `Score: ${this.score}`;
        }
        this.updateShopDisplay();
    }
    
    buyPowerUpgrade() {
        const upgradeCost = 5;
        if (this.score >= upgradeCost) {
            this.score -= upgradeCost;
            this.powerLevel++;
            this.updateScore();
            this.updateShopDisplay();
        }
    }
    
    toggleShop() {
        const shopOverlay = document.getElementById('shopOverlay');
        if (shopOverlay) {
            const isVisible = shopOverlay.style.display === 'flex';
            shopOverlay.style.display = isVisible ? 'none' : 'flex';
            
            // Update shop display when opening
            if (!isVisible) {
                this.updateShopDisplay();
            }
        }
    }
    
    updateShopDisplay() {
        const upgradeButton = document.getElementById('powerUpgrade');
        const powerLevelElement = document.getElementById('powerLevel');
        const buyRedBallButton = document.getElementById('buyRedBall');
        const redBallCountElement = document.getElementById('redBallCount');
        
        const upgradeCost = 5;
        const redBallCost = 10;
        
        if (upgradeButton) {
            upgradeButton.disabled = this.score < upgradeCost;
        }
        
        if (buyRedBallButton) {
            buyRedBallButton.disabled = this.score < redBallCost;
        }
        
        if (powerLevelElement) {
            powerLevelElement.textContent = `Power Level: ${this.powerLevel}`;
        }
        
        if (redBallCountElement) {
            redBallCountElement.textContent = `Red Balls: ${this.redBallCount}`;
        }
    }
}

// Export for testing (only in Node.js environment)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PoolGame;
}

// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game',
    backgroundColor: '#2c3e50',
    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
            gravity: { y: 0 }
        }
    },
    scene: PoolGame
};

// Start the game
const game = new Phaser.Game(config);