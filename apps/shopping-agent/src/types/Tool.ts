// Types for tool integration with LangChain agent
export interface ToolResult {
  success: boolean;
  data: any;
  error?: string;
  observation: string;
}
