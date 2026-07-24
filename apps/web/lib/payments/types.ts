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

export interface PaymentGateway {
  createCustomer(input: CreatePaymentCustomerInput): Promise<PaymentCustomerResult>;
  createSubscription(input: CreateSubscriptionInput): Promise<SubscriptionResult>;
  cancelSubscription(subscriptionId: string): Promise<void>;
}
