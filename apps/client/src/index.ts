import dotenv from 'dotenv';
import * as readline from 'readline';
import { ShoppingAgent } from './agent/ShoppingAgent.js';
import { initializeWalletService } from './services/globalWallet.js';

// Load environment variables
dotenv.config();

async function main() {
  try {
    // Validate required environment variables
    const requiredEnvVars = [
      'OPENAI_API_KEY',
      'THIRDWEB_SECRET_KEY',
      'CLIENT_WALLET_IDENTIFIER'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables:', missingVars.join(', '));
      console.log('💡 Please copy env.example to .env and add your API keys.');
      process.exit(1);
    }

    // Initialize global wallet service first
    console.log('🚀 Starting ReAct Shopping Agent...\n');
    await initializeWalletService();
    
    const openaiApiKey = process.env.OPENAI_API_KEY!;
    const agent = new ShoppingAgent(openaiApiKey);
    
    await agent.initialize();

    // Display wallet information
    const walletInfo = await agent.getWalletInfo();
    if (walletInfo) {
      console.log('🔑 Wallet Information:');
      console.log(`   Wallet Address: ${walletInfo.walletAddress}`);
      console.log(`   Role: ${walletInfo.role}`);
      console.log('');
    }

    // Create readline interface for user interaction
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log('🛍️  Welcome to the ReAct Shopping Agent!');
    console.log('💬 Type your shopping requests below (or "quit" to exit, "clear" to reset conversation):');
    console.log('━'.repeat(80));

    // Main conversation loop
    const askQuestion = () => {
      rl.question('\n👤 You: ', async (userInput) => {
        const input = userInput.trim();

        if (input.toLowerCase() === 'quit' || input.toLowerCase() === 'exit') {
          console.log('\n👋 Thank you for using the Shopping Agent! Goodbye!');
          rl.close();
          return;
        }

        if (input.toLowerCase() === 'clear') {
          agent.clearHistory();
          console.log('💬 Ready for a new conversation!');
          askQuestion();
          return;
        }

        if (input.toLowerCase() === 'help') {
          console.log('\n📋 Available Commands:');
          console.log('   quit/exit - Exit the application');
          console.log('   clear - Clear conversation history');
          console.log('   help - Show this help message');
          console.log('\n💡 Shopping Examples:');
          console.log('   "Find me a TV under $5"');
          console.log('   "Show me laptops"');
          console.log('   "I want to buy headphones for working out"');
          console.log('   "Purchase the second product you showed me"');
          askQuestion();
          return;
        }

        if (!input) {
          console.log('💭 Please enter a shopping request or "help" for examples.');
          askQuestion();
          return;
        }

        try {
          // Process the user request through the ReAct agent
          const response = await agent.processRequest(input);
          
          console.log(`\n🤖 Agent: ${response}`);
          
          // Continue the conversation
          askQuestion();
        } catch (error: any) {
          console.error(`\n❌ Error: ${error.message}`);
          console.log('💡 Please try again with a different request.');
          askQuestion();
        }
      });
    };

    // Start the conversation
    askQuestion();

  } catch (error: any) {
    console.error('❌ Failed to start shopping agent:', error.message);
    
    if (error.message.includes('Backend server is not available')) {
      console.log('\n💡 To fix this:');
      console.log('1. Make sure the server is running: pnpm dev:server');
      console.log('2. Check server health: curl http://localhost:3001/health');
      console.log('3. Verify server environment variables are set');
    }
    
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Thank you for using the Shopping Agent! Goodbye!');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Thank you for using the Shopping Agent! Goodbye!');
  process.exit(0);
});

// Start the application
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
