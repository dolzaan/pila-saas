type EmailTemplate = "password-reset" | "email-verification";

type EmailInput = {
  to: string;
  template: EmailTemplate;
  name?: string | null;
  actionUrl: string;
};

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

  const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      accessToken: privateKey,
      template_params: {
        to_email: input.to,
        to_name: input.name || "cliente",
        action_url: input.actionUrl,
        expires_in: input.template === "password-reset" ? "30 minutos" : "24 horas",
      },
    }),
  });

  if (!response.ok) {
    console.error("[Email] Falha no envio:", response.status, await response.text());
    return false;
  }

  return true;
}
