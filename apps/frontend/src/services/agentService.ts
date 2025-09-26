import axios from 'axios';
import { Agent } from '../types';

const AGENTS_API_URL = import.meta.env.VITE_AGENTS_API_URL || 'http://localhost:3002/api';

export class AgentService {
  static async createAgent(name: string): Promise<Agent> {
    const response = await axios.post(`${AGENTS_API_URL}/agents`, { name });
    return response.data.agent;
  }

  static async getAgentBalance(agentId: string): Promise<{ balance: string; currency: string }> {
    const response = await axios.get(`${AGENTS_API_URL}/agents/${agentId}/balance`);
    return {
      balance: response.data.balance,
      currency: response.data.currency
    };
  }

  static async getAgentAddress(agentId: string): Promise<{ address: string }> {
    const response = await axios.get(`${AGENTS_API_URL}/agents/${agentId}/address`);
    return {
      address: response.data.address
    };
  }

  static async sendMessage(agentId: string, message: string): Promise<{ response: string; status: any[] }> {
    const response = await axios.post(`${AGENTS_API_URL}/agents/${agentId}/chat`, { message });
    return {
      response: response.data.response,
      status: response.data.status
    };
  }
}
