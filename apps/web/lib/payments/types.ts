export type LocalSubscriptionStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "TRIALING"
  | "PAST_DUE"
  | "CANCELED";

export type BillingType = "CREDIT_CARD" | "PIX" | "BOLETO";

export interface CreatePaymentCustomerInput {
  name: string;
  email: string;
  mobilePhone?: string;
  cpfCnpj?: string;
  externalReference: string;
}

export interface UpdatePaymentCustomerInput {
  name?: string;
  email?: string;
  mobilePhone?: string;
  cpfCnpj?: string;
}

export interface PaymentCustomerResult {
  id: string;
}

export interface CreateSubscriptionInput {
  customerId: string;
  value: number;
  nextDueDate: string;
  cycle: "MONTHLY" | "YEARLY";
  billingType: BillingType;
  description: string;
  externalReference: string;
}

export interface SubscriptionResult {
  id: string;
  status: LocalSubscriptionStatus;
  nextDueDate?: string;
}

export interface SubscriptionPaymentResult {
  id: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  dueDate?: string;
  status?: string;
}

export interface CreateRecurringCheckoutInput {
  value: number;
  nextDueDate: string;
  externalReference: string;
  customerData: {
    name: string;
    email: string;
    cpfCnpj: string;
    phone: string;
    address: string;
    addressNumber: string;
    complement?: string;
    postalCode: string;
    province: string;
  };
  callback: {
    successUrl: string;
    cancelUrl: string;
    expiredUrl: string;
  };
}

export interface CheckoutResult {
  id: string;
  link: string;
  status: string;
  externalReference?: string | null;
}

export interface PaymentGateway {
  createCustomer(input: CreatePaymentCustomerInput): Promise<PaymentCustomerResult>;
  updateCustomer(customerId: string, input: UpdatePaymentCustomerInput): Promise<PaymentCustomerResult>;
  createSubscription(input: CreateSubscriptionInput): Promise<SubscriptionResult>;
  createRecurringCheckout(input: CreateRecurringCheckoutInput): Promise<CheckoutResult>;
  getCheckout(checkoutId: string): Promise<CheckoutResult>;
  getFirstSubscriptionPayment(subscriptionId: string): Promise<SubscriptionPaymentResult | null>;
  cancelSubscription(subscriptionId: string): Promise<void>;
}
