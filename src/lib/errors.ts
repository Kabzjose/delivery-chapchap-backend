// Base class for all HTTP-aware application errors — statusCode lets the error handler respond without any switch/case.
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(400, message);
  }
}

// 401 = not authenticated (missing/invalid credentials), not to be confused with 403 (authenticated but not permitted).
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(404, message);
  }
}

// 409 = valid data that conflicts with existing state (e.g. duplicate email).
export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(409, message);
  }
}
