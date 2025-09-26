import React from 'react';
import { Search, Package, CreditCard, Loader2, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import { StatusMessage } from '../types';

interface StatusIndicatorProps {
  status: StatusMessage;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
  const getStatusIcon = () => {
    switch (status.type) {
      case 'searching':
        return <Search className="status-icon searching" />;
      case 'found_products':
        return <Package className="status-icon found" />;
      case 'received_402':
        return <CreditCard className="status-icon received" />;
      case 'preparing_payment':
        return <Loader2 className="status-icon preparing spinning" />;
      case 'sending_payment':
        return <Zap className="status-icon sending" />;
      case 'payment_success':
        return <CheckCircle className="status-icon success" />;
      case 'processing':
        return <Loader2 className="status-icon processing spinning" />;
      case 'completed':
        return <CheckCircle className="status-icon completed" />;
      case 'error':
        return <AlertCircle className="status-icon error" />;
      default:
        return <Loader2 className="status-icon default spinning" />;
    }
  };


  return (
    <div className="status-indicator">
      <div className="status-content">
        {getStatusIcon()}
        <div className="status-text">
          <div className="status-message">{status.message}</div>
          {status.data && (
            <div className="status-data">
              {status.type === 'received_402' && status.data && (
                <div className="x402-details">
                  <div className="x402-info">
                    <strong>Payment Required:</strong> {status.data.maxAmountRequired} USDC
                  </div>
                  <div className="x402-info">
                    <strong>Pay To:</strong> {status.data.payTo}
                  </div>
                  <div className="x402-info">
                    <strong>Description:</strong> {status.data.description}
                  </div>
                </div>
              )}
              {status.type === 'payment_success' && status.data && (
                <div className="success-details">
                  <div className="transaction-hash">
                    <strong>Transaction:</strong> {status.data.transactionHash}
                  </div>
                  <div className="amount">
                    <strong>Amount:</strong> {status.data.amount} USDC
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
