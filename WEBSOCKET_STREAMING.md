# WebSocket Status Streaming

This document describes the WebSocket-based status streaming feature that allows the frontend to receive real-time updates about the agent's actions.

## Architecture

### Backend (Agents API)
- **WebSocket Server**: Runs on the same port as the Agents API (3002)
- **StatusStreamer**: Manages status subscriptions and broadcasting
- **StatusEmitter**: Captures console output and converts to status updates
- **Agent Sessions**: Each agent has its own WebSocket subscription

### Frontend
- **WebSocketService**: Manages WebSocket connection and subscriptions
- **Status Updates Panel**: Displays real-time status updates in the chat interface
- **Auto-reconnection**: Automatically reconnects on connection loss

## Status Types

The system recognizes and streams the following status types:

### 1. Processing Status
- **Type**: `processing`
- **Trigger**: When agent starts thinking
- **Message**: "Agent is thinking..."

### 2. Product Search
- **Type**: `searching`
- **Trigger**: When searching for products
- **Message**: "Searching for products..."

### 3. Products Found
- **Type**: `found_products`
- **Trigger**: When products are found
- **Message**: "Found X products"
- **Data**: Array of products

### 4. Payment Required (402)
- **Type**: `received_402`
- **Trigger**: When merchant returns 402 payment required
- **Message**: "Payment required - preparing x402 payment"
- **Data**: Payment requirements

### 5. Payment Preparation
- **Type**: `preparing_payment`
- **Trigger**: When preparing x402 payment signature
- **Message**: "Preparing payment for [Product]..."

### 6. Payment Sending
- **Type**: `sending_payment`
- **Trigger**: When sending payment to merchant
- **Message**: "Sending payment for [Product]..."

### 7. Payment Success
- **Type**: `payment_success`
- **Trigger**: When payment is successful
- **Message**: "Successfully purchased [Product] for [Amount]"
- **Data**: Product and amount details

### 8. Error
- **Type**: `error`
- **Trigger**: When an error occurs
- **Message**: Error description

### 9. Completed
- **Type**: `completed`
- **Trigger**: When agent finishes processing
- **Message**: "Response ready"

## Console Output Parsing

The `StatusEmitter` captures console output and parses it for status updates:

```typescript
// Examples of parsed console output:
"💸 Executing purchase for Apple MacBook Pro 16-inch..." 
→ preparing_payment status

"🔄 Processing payment for Apple MacBook Pro 16-inch using thirdweb x402..."
→ preparing_payment status

"🔄 Settling payment for Apple MacBook Pro 16-inch..."
→ sending_payment status

"✅ Payment settlement result: { status: 402, product: 'Apple MacBook Pro 16-inch', amount: '$1.49 USDC' }"
→ payment_success status

"💳 Payment required (402) - starting x402 flow..."
→ received_402 status

"🔍 Received x402 response: { ... }"
→ received_402 status

"✅ Extracted payment requirements: { ... }"
→ preparing_payment status

"🔑 Preparing x402 payment signature..."
→ preparing_payment status
```

## WebSocket Message Format

### Client to Server (Subscribe)
```json
{
  "type": "subscribe",
  "agentName": "agent-name"
}
```

### Server to Client (Status Update)
```json
{
  "type": "status",
  "agentName": "agent-name",
  "status": {
    "type": "preparing_payment",
    "message": "Preparing payment for Apple MacBook Pro 16-inch...",
    "data": { "productName": "Apple MacBook Pro 16-inch" },
    "timestamp": 1703123456789
  },
  "timestamp": 1703123456789
}
```

## Frontend Integration

### WebSocket Connection
```typescript
const wsService = WebSocketService.getInstance();
wsService.connect();

// Subscribe to agent updates
const unsubscribe = wsService.subscribe(agentName, (status) => {
  setStatusUpdates(prev => [...prev, status]);
  setCurrentStatus({
    type: status.type,
    message: status.message,
    data: status.data,
    timestamp: status.timestamp
  });
});
```

### Status Display
- **Current Status**: Shows the latest status in the chat interface
- **Status Updates Panel**: Shows the last 5 status updates with timestamps
- **Color Coding**: Different colors for different status types
- **Auto-clear**: Status updates auto-clear after completion

## Usage

1. **Start the Agents API**: `pnpm dev:agents-api`
2. **Start the Frontend**: `pnpm dev:frontend`
3. **Create an Agent**: Use the frontend to create a new agent
4. **Chat with Agent**: Send messages and watch real-time status updates
5. **Monitor Status**: View the status updates panel for detailed progress

## Benefits

- **Real-time Feedback**: Users see exactly what the agent is doing
- **Transparency**: Full visibility into the x402 payment process
- **Better UX**: No more waiting without knowing what's happening
- **Debugging**: Easy to debug issues by watching status flow
- **Professional Feel**: Makes the demo feel more polished and responsive

## Technical Notes

- **Connection Management**: WebSocket connections are automatically managed
- **Reconnection**: Automatic reconnection with exponential backoff
- **Memory Management**: Status updates are limited to last 5 items
- **Error Handling**: Graceful handling of connection errors
- **Performance**: Minimal overhead, only streams when needed
