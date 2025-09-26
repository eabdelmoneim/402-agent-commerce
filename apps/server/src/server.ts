import app, { initializeServer } from './app.js';

const PORT = process.env.PORT || 3001;

// Start server
async function startServer() {
  try {
    // Initialize server services
    await initializeServer();

    // Start listening
    app.listen(PORT, () => {
      console.log(`🚀 Shopping Agent Server running on http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`📋 API info: http://localhost:${PORT}/api`);
      console.log(`🛍️  Products API: http://localhost:${PORT}/api/products?query=TV`);
      console.log(`💳 Purchase API: http://localhost:${PORT}/api/purchase/:productId/requirements`);
      console.log('');
      console.log('🤖 Ready for ReAct Shopping Agent connections!');
    });
  } catch (error: any) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
