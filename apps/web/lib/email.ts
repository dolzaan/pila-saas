import { externalTimeoutSignal, isTimeoutError } from "@/lib/external-service";

type EmailTemplate = "password-reset" | "email-verification";

type EmailInput = {
  to: string;
  name?: string | null;
} & (
  | { template: "password-reset"; actionUrl: string }
  | { template: "email-verification"; verificationCode: string }
);

const templateEnvironment: Record<EmailTemplate, string> = {
  "password-reset": "EMAILJS_RESET_TEMPLATE_ID",
  "email-verification": "EMAILJS_VERIFY_TEMPLATE_ID",
};

export async function sendEmail(input: EmailInput) {
  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;
  const templateId = process.env[templateEnvironment[input.template]];

  if (!serviceId || !publicKey || !privateKey || !templateId) {
    console.error("[Email] Variáveis do EmailJS não configuradas");
    return false;
  }

  try {
    const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: externalTimeoutSignal("EMAILJS_TIMEOUT_MS", 10_000),
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        accessToken: privateKey,
        template_params: {
          to_email: input.to,
          to_name: input.name || "cliente",
          action_url: "actionUrl" in input ? input.actionUrl : "",
          verification_code: "verificationCode" in input ? input.verificationCode : "",
          expires_in: input.template === "password-reset" ? "30 minutos" : "10 minutos",
        },
      }),
    });

    if (!response.ok) {
      console.error("[Email] Falha no envio:", response.status, await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error(
      isTimeoutError(error) ? "[Email] Tempo limite excedido" : "[Email] Falha na requisição",
      isTimeoutError(error) ? undefined : error,
    );
    return false;
  }
}
