module.exports = {
    testEnvironment: 'jsdom', // Esto es importante para pruebas en React
    setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
    transform: {
      "^.+\\.jsx?$": ["babel-jest", { sourceType: "module" }]
    },
  };
  