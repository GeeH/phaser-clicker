// Unit tests for PoolGame
const PoolGame = require('./game.js');

describe('PoolGame', () => {
    let game;

    beforeEach(() => {
        game = new PoolGame();
        // Reset DOM mocks
        jest.clearAllMocks();
    });

    describe('Constructor', () => {
        test('should initialize with correct default values', () => {
            expect(game.score).toBe(0);
            expect(game.ballMoving).toBe(false);
            expect(game.powerLevel).toBe(1);
            expect(game.basePower).toBe(300);
        });
    });

    describe('buyPowerUpgrade', () => {
        test('should not upgrade when score is insufficient', () => {
            game.score = 4;
            const initialPowerLevel = game.powerLevel;
            
            game.buyPowerUpgrade();
            
            expect(game.powerLevel).toBe(initialPowerLevel);
            expect(game.score).toBe(4);
        });

        test('should upgrade when score is sufficient', () => {
            game.score = 10;
            const initialPowerLevel = game.powerLevel;
            
            game.buyPowerUpgrade();
            
            expect(game.powerLevel).toBe(initialPowerLevel + 1);
            expect(game.score).toBe(5); // 10 - 5 cost
        });

        test('should upgrade multiple times with sufficient score', () => {
            game.score = 15;
            
            game.buyPowerUpgrade();
            expect(game.powerLevel).toBe(2);
            expect(game.score).toBe(10);
            
            game.buyPowerUpgrade();
            expect(game.powerLevel).toBe(3);
            expect(game.score).toBe(5);
        });

        test('should not upgrade when score equals but is less than cost', () => {
            game.score = 4;
            
            game.buyPowerUpgrade();
            
            expect(game.powerLevel).toBe(1);
            expect(game.score).toBe(4);
        });
    });

    describe('updateScore', () => {
        test('should update score element text content', () => {
            const mockScoreElement = { textContent: '' };
            const mockPowerElement = { textContent: '' };
            const mockButton = { disabled: false };
            
            document.getElementById.mockImplementation((id) => {
                if (id === 'score') return mockScoreElement;
                if (id === 'powerLevel') return mockPowerElement;
                if (id === 'powerUpgrade') return mockButton;
                return null;
            });
            
            game.score = 42;
            game.updateScore();
            
            expect(document.getElementById).toHaveBeenCalledWith('score');
            expect(mockScoreElement.textContent).toBe('Score: 42');
        });

        test('should handle missing score element gracefully', () => {
            document.getElementById.mockReturnValue(null);
            
            expect(() => game.updateScore()).not.toThrow();
        });
    });

    describe('updateShopDisplay', () => {
        test('should disable upgrade button when score is insufficient', () => {
            const mockButton = { disabled: false };
            const mockPowerLevel = { textContent: '' };
            
            document.getElementById.mockImplementation((id) => {
                if (id === 'powerUpgrade') return mockButton;
                if (id === 'powerLevel') return mockPowerLevel;
                return null;
            });
            
            game.score = 3;
            game.powerLevel = 2;
            game.updateShopDisplay();
            
            expect(mockButton.disabled).toBe(true);
            expect(mockPowerLevel.textContent).toBe('Power Level: 2');
        });

        test('should enable upgrade button when score is sufficient', () => {
            const mockButton = { disabled: true };
            const mockPowerLevel = { textContent: '' };
            
            document.getElementById.mockImplementation((id) => {
                if (id === 'powerUpgrade') return mockButton;
                if (id === 'powerLevel') return mockPowerLevel;
                return null;
            });
            
            game.score = 10;
            game.powerLevel = 3;
            game.updateShopDisplay();
            
            expect(mockButton.disabled).toBe(false);
            expect(mockPowerLevel.textContent).toBe('Power Level: 3');
        });
    });

    describe('toggleShop', () => {
        test('should show shop when hidden', () => {
            const mockOverlay = { style: { display: 'none' } };
            document.getElementById.mockReturnValue(mockOverlay);
            
            game.toggleShop();
            
            expect(mockOverlay.style.display).toBe('flex');
        });

        test('should hide shop when visible', () => {
            const mockOverlay = { style: { display: 'flex' } };
            document.getElementById.mockReturnValue(mockOverlay);
            
            game.toggleShop();
            
            expect(mockOverlay.style.display).toBe('none');
        });

        test('should handle missing shop overlay gracefully', () => {
            document.getElementById.mockReturnValue(null);
            
            expect(() => game.toggleShop()).not.toThrow();
        });
    });

    describe('onRailBounce', () => {
        test('should increment score when ball bounces off rail', () => {
            const initialScore = game.score;
            
            game.onRailBounce();
            
            expect(game.score).toBe(initialScore + 1);
        });
    });

    describe('calculateBallSpeed', () => {
        test('should return base power for level 1', () => {
            game.powerLevel = 1;
            
            const speed = game.calculateBallSpeed();
            
            expect(speed).toBe(300);
        });

        test('should increase speed by 100 per power level', () => {
            game.powerLevel = 3;
            
            const speed = game.calculateBallSpeed();
            
            expect(speed).toBe(500); // 300 + (3-1)*100
        });

        test('should handle high power levels', () => {
            game.powerLevel = 10;
            
            const speed = game.calculateBallSpeed();
            
            expect(speed).toBe(1200); // 300 + (10-1)*100
        });
    });

    describe('onBallClick', () => {
        beforeEach(() => {
            game.ball = {
                x: 400,
                y: 300,
                body: {
                    setVelocity: jest.fn()
                }
            };
        });

        test('should not move ball when already moving', () => {
            game.ballMoving = true;
            const pointer = { x: 350, y: 250 };
            
            game.onBallClick(pointer);
            
            expect(game.ball.body.setVelocity).not.toHaveBeenCalled();
        });

        test('should move ball in opposite direction from click', () => {
            game.ballMoving = false;
            const pointer = { x: 350, y: 250 }; // Click left and up from ball
            
            game.onBallClick(pointer);
            
            expect(game.ball.body.setVelocity).toHaveBeenCalled();
            expect(game.ballMoving).toBe(true);
            
            const [velocityX, velocityY] = game.ball.body.setVelocity.mock.calls[0];
            // Ball should move right and down (opposite to click)
            expect(velocityX).toBeGreaterThan(0);
            expect(velocityY).toBeGreaterThan(0);
        });

        test('should use correct speed based on power level', () => {
            game.ballMoving = false;
            game.powerLevel = 3;
            const pointer = { x: 300, y: 300 }; // Click directly left
            
            game.onBallClick(pointer);
            
            const [velocityX] = game.ball.body.setVelocity.mock.calls[0];
            // Should use speed of 500 (level 3)
            expect(Math.abs(velocityX)).toBe(500);
        });

        test('should handle zero distance click gracefully', () => {
            game.ballMoving = false;
            const pointer = { x: 400, y: 300 }; // Click exactly on ball
            
            expect(() => game.onBallClick(pointer)).not.toThrow();
            expect(game.ball.body.setVelocity).not.toHaveBeenCalled();
        });
    });

    describe('Integration tests', () => {
        test('should allow purchasing upgrades and using increased power', () => {
            // Start with enough points
            game.score = 10;
            
            // Buy upgrade
            game.buyPowerUpgrade();
            expect(game.powerLevel).toBe(2);
            expect(game.score).toBe(5);
            
            // Check new speed
            const speed = game.calculateBallSpeed();
            expect(speed).toBe(400);
            
            // Buy another upgrade
            game.buyPowerUpgrade();
            expect(game.powerLevel).toBe(3);
            expect(game.score).toBe(0);
            
            // Check final speed
            const finalSpeed = game.calculateBallSpeed();
            expect(finalSpeed).toBe(500);
        });

        test('should accumulate score from rail bounces', () => {
            expect(game.score).toBe(0);
            
            // Simulate multiple rail bounces
            game.onRailBounce();
            game.onRailBounce();
            game.onRailBounce();
            
            expect(game.score).toBe(3);
        });
    });
});