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
  externalReference?: string;
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
}

export interface PaymentGateway {
  createCustomer(input: CreatePaymentCustomerInput): Promise<PaymentCustomerResult>;
  updateCustomer(customerId: string, input: UpdatePaymentCustomerInput): Promise<PaymentCustomerResult>;
  createSubscription(input: CreateSubscriptionInput): Promise<SubscriptionResult>;
  getFirstSubscriptionPayment(subscriptionId: string): Promise<SubscriptionPaymentResult | null>;
  cancelSubscription(subscriptionId: string): Promise<void>;
}
