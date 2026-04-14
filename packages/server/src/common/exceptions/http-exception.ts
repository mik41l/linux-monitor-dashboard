export class HttpException extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  public constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = "HttpException";
    this.statusCode = statusCode;
    this.details = details;
  }
}
