import { StatusStreamer } from './statusStreamer.js';

export class StatusEmitter {
  private static instance: StatusEmitter;
  private statusStreamer: StatusStreamer;

  constructor() {
    this.statusStreamer = StatusStreamer.getInstance();
  }

  static getInstance(): StatusEmitter {
    if (!StatusEmitter.instance) {
      StatusEmitter.instance = new StatusEmitter();
    }
    return StatusEmitter.instance;
  }

  // Override console.log to capture agent output
  setupConsoleCapture(agentName: string): void {
    const originalLog = console.log;
    
    console.log = (...args: any[]) => {
      // Call original console.log
      originalLog(...args);
      
      // Parse the log message for status updates
      const message = args.join(' ');
      
      // Check for specific status patterns
      if (message.includes('💸 Executing purchase for')) {
        const productMatch = message.match(/💸 Executing purchase for (.+?)\.\.\./);
        if (productMatch) {
          this.statusStreamer.preparingPayment(agentName, productMatch[1]);
        }
      } else if (message.includes('💳 Executing purchase:')) {
        this.statusStreamer.sendingPayment(agentName, 'Product');
      } else if (message.includes('🔄 Processing payment for')) {
        const productMatch = message.match(/🔄 Processing payment for (.+?) using/);
        if (productMatch) {
          this.statusStreamer.preparingPayment(agentName, productMatch[1]);
        }
      } else if (message.includes('🔄 Settling payment for')) {
        const productMatch = message.match(/🔄 Settling payment for (.+?)\.\.\./);
        if (productMatch) {
          this.statusStreamer.sendingPayment(agentName, productMatch[1]);
        }
      } else if (message.includes('✅ Payment settlement result:')) {
        this.statusStreamer.paymentSuccess(agentName, 'Product', 'Amount');
      } else if (message.includes('💳 Payment required (402)')) {
        this.statusStreamer.received402(agentName, { message: 'Payment required' });
      } else if (message.includes('🔍 Received x402 response:')) {
        this.statusStreamer.received402(agentName, { message: 'Received payment requirements' });
      } else if (message.includes('✅ Extracted payment requirements:')) {
        this.statusStreamer.preparingPayment(agentName, 'Product');
      } else if (message.includes('🔑 Preparing x402 payment signature')) {
        this.statusStreamer.preparingPayment(agentName, 'Product');
      } else if (message.includes('🔍 Searching for products')) {
        this.statusStreamer.searching(agentName, 'Searching for products...');
      } else if (message.includes('Found products:')) {
        this.statusStreamer.foundProducts(agentName, []);
      } else if (message.includes('❌ Error') || message.includes('Error:')) {
        this.statusStreamer.error(agentName, message);
      }
    };
  }

  // Restore original console.log
  restoreConsole(): void {
    // Note: This is a simplified approach. In a real implementation,
    // you'd want to track multiple console overrides per agent
    console.log = console.log;
  }
}
