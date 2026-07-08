export type WorkflowSettingsRecord = Record<string, unknown>;

function readConfiguredString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateWorkflowSettingsForSave(settings: WorkflowSettingsRecord) {
  const webhookEnabled = typeof settings.webhookEnabled === "boolean" ? settings.webhookEnabled : false;
  if (!webhookEnabled) {
    return null;
  }

  const webhookUrl = readConfiguredString(settings.n8nOrdersWebhookUrl) || readConfiguredString(process.env.N8N_ORDERS_WEBHOOK_URL);
  if (!webhookUrl) {
    return "Add the n8n orders webhook URL before enabling outbound webhook delivery.";
  }
  if (!isHttpUrl(webhookUrl)) {
    return "The n8n orders webhook URL must start with http:// or https://.";
  }

  const callbackSecret = readConfiguredString(settings.n8nCallbackSecret) || readConfiguredString(process.env.N8N_CALLBACK_SECRET);
  if (!callbackSecret) {
    return "Add the n8n callback secret before enabling outbound webhook delivery.";
  }

  const sharedSecret =
    readConfiguredString(settings.n8nSharedSecret) ||
    readConfiguredString(process.env.N8N_SHARED_SECRET) ||
    readConfiguredString(settings.n8nCallbackSecret);
  if (!sharedSecret) {
    return "Add the n8n shared secret before enabling outbound webhook delivery.";
  }

  return null;
}
