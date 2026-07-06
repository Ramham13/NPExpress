interface PayPalCreateOrderActions {
  order: {
    create: () => Promise<string>;
  };
}

interface PayPalOnApproveData {
  orderID: string;
  payerID?: string;
}

interface PayPalButtonsComponent {
  render: (container: HTMLElement) => Promise<void>;
  close?: () => void;
}

interface PayPalNamespace {
  Buttons: (options: {
    createOrder?: (_data: unknown, actions: PayPalCreateOrderActions) => Promise<string> | string;
    onApprove?: (data: PayPalOnApproveData) => Promise<void> | void;
    onError?: (error: unknown) => void;
    onCancel?: () => void;
    style?: Record<string, unknown>;
  }) => PayPalButtonsComponent;
}

declare global {
  interface Window {
    paypal?: PayPalNamespace;
  }
}

export {};
