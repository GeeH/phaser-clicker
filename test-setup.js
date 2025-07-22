// Test setup file for Jest
// Mock DOM elements and Phaser functionality

// Mock document elements
global.document.getElementById = jest.fn((id) => {
  const mockElement = {
    textContent: '',
    style: { display: 'none' },
    addEventListener: jest.fn(),
    disabled: false
  };
  
  // Return specific mocks for known elements
  if (id === 'score') return mockElement;
  if (id === 'powerUpgrade') return mockElement;
  if (id === 'powerLevel') return mockElement;
  if (id === 'shopOverlay') return mockElement;
  if (id === 'closeShop') return mockElement;
  
  return mockElement;
});

// Mock Phaser Scene class
global.Phaser = {
  Scene: class MockScene {
    constructor(config) {
      this.scene = { key: config.key };
      this.physics = {
        world: {
          enable: jest.fn()
        },
        add: {
          staticImage: jest.fn(() => ({
            setSize: jest.fn(),
            setVisible: jest.fn()
          })),
          collider: jest.fn()
        }
      };
      this.add = {
        rectangle: jest.fn(() => ({
          setVisible: jest.fn()
        })),
        circle: jest.fn(() => ({
          setStrokeStyle: jest.fn(),
          setInteractive: jest.fn(),
          on: jest.fn(),
          body: {
            setCircle: jest.fn(),
            setBounce: jest.fn(),
            setDrag: jest.fn(),
            setMaxVelocity: jest.fn(),
            setVelocity: jest.fn(),
            velocity: { x: 0, y: 0 }
          },
          x: 400,
          y: 300,
          setFillStyle: jest.fn()
        }))
      };
      this.input = {
        keyboard: {
          on: jest.fn()
        }
      };
      this.tweens = {
        add: jest.fn()
      };
      this.load = {
        image: jest.fn()
      };
    }
    
    preload() {}
    create() {}
    update() {}
  },
  AUTO: 'AUTO',
  Game: class MockGame {
    constructor(config) {
      this.config = config;
    }
  }
};