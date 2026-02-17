import 'server-only';

const baseUrl =
  process.env.KLARNA_API_BASE_URL ?? 'https://api.playground.klarna.com';
const username = process.env.KLARNA_USERNAME;
const password = process.env.KLARNA_PASSWORD;

export type KlarnaResult = {
  ok: boolean;
  mocked: boolean;
  status: number;
  data?: unknown;
  error?: string;
};

function isConfigured() {
  return Boolean(username && password);
}

function authHeader() {
  const token = Buffer.from(`${username}:${password}`).toString('base64');
  return `Basic ${token}`;
}

async function requestKlarna(
  path: string,
  options: RequestInit,
  mockData: unknown,
): Promise<KlarnaResult> {
  if (!isConfigured()) {
    console.warn(
      `Klarna client mock active (missing env). Path: ${path.toString()}`,
    );
    return { ok: true, mocked: true, status: 200, data: mockData };
  }

  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader(),
      ...(options.headers ?? {}),
    },
  });

  const text = await res.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    return {
      ok: false,
      mocked: false,
      status: res.status,
      data,
      error: `Klarna API error (${res.status})`,
    };
  }

  return { ok: true, mocked: false, status: res.status, data };
}

export async function captureKlarnaPayment(params: {
  klarnaOrderId: string;
  amount: number;
}) {
  return requestKlarna(
    `/ordermanagement/v1/orders/${params.klarnaOrderId}/captures`,
    {
      method: 'POST',
      body: JSON.stringify({
        captured_amount: params.amount,
      }),
    },
    { capture_id: `mock-capture-${Date.now()}` },
  );
}

export async function cancelKlarnaAuthorization(params: {
  klarnaOrderId: string;
}) {
  return requestKlarna(
    `/ordermanagement/v1/orders/${params.klarnaOrderId}/cancel`,
    { method: 'POST' },
    { cancelled: true },
  );
}

export async function refundKlarnaPayment(params: {
  klarnaOrderId: string;
  amount: number;
}) {
  return requestKlarna(
    `/ordermanagement/v1/orders/${params.klarnaOrderId}/refunds`,
    {
      method: 'POST',
      body: JSON.stringify({
        refunded_amount: params.amount,
      }),
    },
    { refund_id: `mock-refund-${Date.now()}` },
  );
}
