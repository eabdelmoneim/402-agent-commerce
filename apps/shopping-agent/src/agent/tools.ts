import { DynamicTool } from "@langchain/core/tools";
import { getProducts } from '../tools/getProducts.js';
import { processX402Payment } from '../tools/processX402Payment.js';

// Global reference to the agent instance for context sharing
let agentInstance: any = null;

export function setAgentInstance(agent: any) {
  agentInstance = agent;
}

export { agentInstance };

/**
 * Product Search Tool with usage rules in description
 */
const createGetProductsTool = () => {
  return new DynamicTool({
    name: "get_products",
        description: `Search for products in the shopping catalog. After searching, present results to user and ask which product they want to buy.

    USAGE RULES:
    - Input format: query=<search_term> [maxPrice=<price>] [minPrice=<price>] [category=<category>] [count=<number>]
    - query is REQUIRED (what to search for)
    - maxPrice is optional (maximum price filter)
    - minPrice is optional (minimum price filter) 
    - category is optional (product category)
    - count is optional (number of results, 1-10)
    - ALWAYS ask user which product they want to buy after showing results

    EXAMPLES:
    - "query=laptop maxPrice=1000"
    - "query=headphones category=electronics count=5"
    - "query=TV under 500"`,
    func: async (input: string) => {
      try {
        console.log('🔧 Tool received input:', input);
        
        // Simple parameter extraction from natural language input
        const params: any = {};
        
        // Extract query (everything after query= until next param or end)
        const queryMatch = input.match(/query=([^=]*?)(?:\s+\w+=|$)/);
        if (queryMatch) {
          params.query = queryMatch[1].trim();
        } else {
          // Fallback: treat entire input as query if no explicit format
          params.query = input.trim();
        }
        
        // Extract optional parameters
        const maxPriceMatch = input.match(/maxPrice=([^=\s]+)/);
        if (maxPriceMatch) params.maxPrice = maxPriceMatch[1];
        
        const minPriceMatch = input.match(/minPrice=([^=\s]+)/);
        if (minPriceMatch) params.minPrice = minPriceMatch[1];
        
        const categoryMatch = input.match(/category=([^=\s]+)/);
        if (categoryMatch) params.category = categoryMatch[1];
        
        const countMatch = input.match(/count=([^=\s]+)/);
        if (countMatch) params.count = countMatch[1];
        
        console.log('🔧 Parsed params:', params);
        
        const result = await getProducts(params);
        
        console.log('🔧 Tool result:', { success: result.success, hasObservation: !!result.observation, error: result.error });
        
        if (result.success && result.observation) {
          // Store search results in agent context
          if (agentInstance && result.products) {
            agentInstance.setLastSearchResults(result.products);
            console.log('🧠 Stored', result.products.length, 'products in agent context');
          }
          return result.observation;
        } else {
          return `Error searching products: ${result.error || 'Unknown error'}`;
        }
      } catch (error: any) {
        console.log('🔧 Tool error:', error);
        return `Error processing search: ${error.message}. Please try again.`;
      }
    },
  });
};

/**
 * Payment Processing Tool with usage rules in description
 */
const createProcessPaymentTool = () => {
  return new DynamicTool({
    name: "process_payment",
        description: `Process a payment for a product using x402 protocol with real USDC transactions on Base Sepolia. ONLY use this after user has confirmed they want to buy a specific product.

    CRITICAL USAGE RULES:
    - ONLY call this tool when user explicitly confirms purchase (e.g., "buy the MacBook Pro", "yes, buy it")
    - Input format: productId=<id> productName=<name> price=<amount> userConfirmed=true
    - Use the EXACT Product ID from the search results (shown in parentheses)
    - ALL parameters are REQUIRED
    - userConfirmed must be true (never proceed without user agreement)
    - This processes REAL money transactions

    EXAMPLES:
    - "productId=abc123 productName=Gaming Laptop price=999 userConfirmed=true"
    - "productId=xyz789 productName=Wireless Headphones price=149 userConfirmed=true"

    NEVER call this tool unless the user has explicitly agreed to purchase!
    NEVER guess or infer the productId - use the exact ID from search results!`,
    func: async (input: string) => {
      try {
        // Extract parameters
        const params: any = {};
        
        const productIdMatch = input.match(/productId=([^=\s]+)/);
        if (productIdMatch) params.productId = productIdMatch[1];
        
        const productNameMatch = input.match(/productName=([^=]*?)(?:\s+\w+=|$)/);
        if (productNameMatch) params.productName = productNameMatch[1].trim();
        
        const priceMatch = input.match(/price=([^=\s]+)/);
        if (priceMatch) params.price = priceMatch[1];
        
        const userConfirmedMatch = input.match(/userConfirmed=(true|false)/);
        if (userConfirmedMatch) params.userConfirmed = userConfirmedMatch[1] === 'true';

        // Smart product ID resolution
        if (!params.productId && agentInstance) {
          console.log('🔍 Attempting to resolve product ID...');
          
          // Check if we have stored search results
          const storedResults = agentInstance.getLastSearchResults();
          console.log('🧠 Stored results available:', storedResults.length);
          
          if (storedResults.length > 0) {
            // Try to find by name in stored results
            if (params.productName) {
              const foundProduct = agentInstance.findProductByName(params.productName);
              if (foundProduct) {
                params.productId = foundProduct.id;
                params.price = foundProduct.price; // Use exact price
                console.log('✅ Resolved product ID by name:', params.productId);
              }
            }
            
            // Try to find by index (e.g., "first", "second", "1", "2")
            if (!params.productId) {
              const indexMatch = input.match(/(?:first|1st|1)(?:\s|$)/i);
              if (indexMatch) {
                const product = agentInstance.findProductByIndex(1);
                if (product) {
                  params.productId = product.id;
                  params.productName = product.name;
                  params.price = product.price;
                  console.log('✅ Resolved first product ID:', params.productId);
                }
              }
            }
            
            // Try to find by numeric index (e.g., "2", "3")
            if (!params.productId && params.productId && /^\d+$/.test(params.productId)) {
              const product = agentInstance.findProductByIndex(parseInt(params.productId));
              if (product) {
                params.productId = product.id;
                params.productName = product.name;
                params.price = product.price;
                console.log('✅ Resolved numeric product ID:', params.productId);
              }
            }
          } else {
            console.log('⚠️ No stored search results available for product resolution');
            return "ERROR: No product context available. Please search for products first using the get_products tool, then try purchasing again.";
          }
        }
        
        // Basic validation
        if (!params.productId || !params.productName || !params.price || !params.userConfirmed) {
          return "ERROR: Missing required parameters. Need: productId, productName, price, and userConfirmed=true";
        }
        
        if (!params.userConfirmed) {
          return "ERROR: Cannot process payment without user confirmation. userConfirmed must be true.";
        }
        
        const result = await processX402Payment(params);
        
        if (result.success && result.observation) {
          return result.observation;
        } else {
          return `Payment failed: ${result.error || 'Unknown error'}`;
        }
      } catch (error: any) {
        return `Error processing payment: ${error.message}. Please try again.`;
      }
    },
  });
};

/**
 * Get all available agent tools
 */
export const getAgentTools = () => {
  return [
    createGetProductsTool(),
    createProcessPaymentTool()
  ];
};
