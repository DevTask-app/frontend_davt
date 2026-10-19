export class HttpError extends Error {
  readonly status: number;
  readonly errors?: Record<string, string[]>;

  constructor(status: number, message: string, errors?: Record<string, string[]>) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.errors = errors;
  }
}

export function validationError(errors: Record<string, string[]>): HttpError {
  return new HttpError(422, "The given data was invalid.", errors);
}

export function unauthenticated(): HttpError {
  return new HttpError(401, "Unauthenticated.");
}

export function forbidden(message = "This action is unauthorized."): HttpError {
  return new HttpError(403, message);
}

export function notFound(message: string): HttpError {
  return new HttpError(404, message);
}

export function conflict(message: string): HttpError {
  return new HttpError(409, message);
}

export function gone(message: string): HttpError {
  return new HttpError(410, message);
}

export function modelNotFound(model: string, identifier: string | number): HttpError {
  return notFound(`No query results for model [App\\Models\\${model}] ${identifier}`);
}

export function json(data: unknown, status = 200, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

export function noContent(): Response {
  return new Response(null, { status: 204 });
}

export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof HttpError) {
      const body: Record<string, unknown> = { message: error.message };
      if (error.errors) body.errors = error.errors;
      return json(body, error.status);
    }
    console.error(error);
    return json({ message: "Server error." }, 500);
  }
}
