import OpenAI from 'openai';
import { randomBytes } from 'crypto';
import { ProductGeneratorInput, GeneratedProduct } from '../types/product.js';

export class ProductGeneratorService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async generateProducts(input: ProductGeneratorInput): Promise<GeneratedProduct[]> {
    const { category, count = 3, maxPrice = 9, minPrice = 1 } = input;

    // Generate products using OpenAI
    const prompt = this.createProductPrompt(category, count);

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a product catalog generator for an e-commerce store. Generate realistic, appealing product listings."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 1500
      });

      const content = completion.choices[0].message.content;
      if (!content) {
        throw new Error('No content received from OpenAI');
      }

      const rawProducts = JSON.parse(content);

      // Add pricing and IDs to generated products
      return rawProducts.map((product: any) => {
        const price = this.generateRandomPrice(minPrice, maxPrice);
        const priceWei = this.convertToWei(price);
        const id = this.generateProductId(product.name);

        return {
          id,
          name: product.name,
          description: product.description,
          features: product.features,
          price: price.toFixed(2),
          priceWei,
          category
        };
      });
    } catch (error) {
      console.error('Error generating products:', error);
      // Return fallback products if OpenAI fails
      return this.getFallbackProducts(category, count, minPrice, maxPrice);
    }
  }

  private createProductPrompt(category: string, count: number): string {
    return `Generate ${count} realistic ${category} products for an e-commerce store.

Requirements:
- Each product should have: name, description (2-3 sentences), key features (3-5 items)
- Products should be different brands/models
- Descriptions should be realistic and appealing
- Include technical specifications where relevant
- Make them sound like real products you'd find on Amazon or Best Buy

Return ONLY a JSON array in this exact format:
[
  {
    "name": "Product Name",
    "description": "Detailed product description that sounds appealing to buyers...",
    "features": ["feature1", "feature2", "feature3", "feature4"]
  }
]`;
  }

  private generateRandomPrice(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  private convertToWei(priceUSD: number): string {
    // USDC has 6 decimals, so multiply by 10^6
    const usdcAmount = Math.floor(priceUSD * 1000000);
    return usdcAmount.toString();
  }

  private generateProductId(name: string): string {
    const cleanName = name.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const randomSuffix = randomBytes(4).toString('hex');
    return `${cleanName}-${randomSuffix}`;
  }

  private getFallbackProducts(category: string, count: number, minPrice: number, maxPrice: number): GeneratedProduct[] {
    const fallbacks: Record<string, any[]> = {
      TV: [
        { 
          name: "Samsung 32\" Smart TV", 
          description: "High-definition smart TV with built-in streaming apps and HDR support.", 
          features: ["4K Ultra HD", "Smart TV Platform", "HDR10+", "Voice Remote"] 
        },
        { 
          name: "LG 28\" LED TV", 
          description: "Compact LED TV perfect for bedrooms with crisp picture quality.", 
          features: ["Full HD 1080p", "LED Display", "Multiple HDMI Ports", "Energy Efficient"] 
        },
        { 
          name: "TCL 24\" TV", 
          description: "Budget-friendly TV with reliable performance and clear audio.", 
          features: ["HD Ready", "Built-in Speakers", "HDMI & USB Ports", "Compact Design"] 
        }
      ],
      laptop: [
        { 
          name: "HP Pavilion 15", 
          description: "Versatile laptop for work and entertainment with modern design.", 
          features: ["Intel Core i5", "8GB RAM", "256GB SSD", "15.6\" Display"] 
        },
        { 
          name: "Dell Inspiron 14", 
          description: "Reliable laptop with excellent battery life for productivity.", 
          features: ["AMD Ryzen 5", "12GB RAM", "512GB SSD", "14\" FHD Screen"] 
        },
        { 
          name: "Lenovo ThinkPad E14", 
          description: "Business laptop with durability and professional features.", 
          features: ["Intel Core i7", "16GB RAM", "1TB SSD", "14\" Anti-Glare"] 
        }
      ],
      headphones: [
        {
          name: "Sony WH-1000XM5",
          description: "Premium noise-canceling headphones with exceptional sound quality.",
          features: ["Active Noise Cancellation", "30-hour battery", "Quick Charge", "Bluetooth 5.2"]
        },
        {
          name: "Bose QuietComfort 45",
          description: "Comfortable over-ear headphones with world-class noise cancellation.",
          features: ["Noise Cancellation", "24-hour battery", "Comfortable fit", "Clear calls"]
        },
        {
          name: "Apple AirPods Pro",
          description: "Wireless earbuds with spatial audio and adaptive transparency.",
          features: ["Spatial Audio", "Active Noise Cancellation", "MagSafe Charging", "Water Resistant"]
        }
      ]
    };

    const products = fallbacks[category] || fallbacks.TV;
    return products.slice(0, count).map((product) => {
      const price = this.generateRandomPrice(minPrice, maxPrice);
      return {
        id: this.generateProductId(product.name),
        name: product.name,
        description: product.description,
        features: product.features,
        price: price.toFixed(2),
        priceWei: this.convertToWei(price),
        category
      };
    });
  }
}
