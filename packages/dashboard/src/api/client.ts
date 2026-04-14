export interface ApiResponse<TData> {
  data: TData;
}

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5005";

export async function getJson<TData>(
  path: string,
  query?: Record<string, string | number | boolean | undefined>
) {
  return requestJson<TData>(appendQuery(path, query));
}

export async function putJson<TData, TBody = undefined>(path: string, body?: TBody) {
  return requestJson<TData>(path, {
    method: "PUT",
    headers: {
      "content-type": "application/json"
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
}

async function requestJson<TData>(path: string, init?: RequestInit) {
  const response = await fetch(`${API_URL}${path}`, init);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as ApiResponse<TData>;
}

function appendQuery(
  path: string,
  query?: Record<string, string | number | boolean | undefined>
) {
  if (!query) {
    return path;
  }

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === "") {
      continue;
    }

    params.set(key, String(value));
  }

  const serialized = params.toString();
  return serialized ? `${path}?${serialized}` : path;
}
