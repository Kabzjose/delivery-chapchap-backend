/**
 * Base class for all HTTP-aware application errors.
 *
 * By extending Error we get a proper stack trace; by adding statusCode we give
 * the error handler everything it needs to respond without any switch/case logic.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = this.constructor.name;
    // Restore the prototype chain after extending a built-in class
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 400 — the request is syntactically valid but semantically wrong. */
export class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(400, message);
  }
}

/**
 * 401 — the caller is not authenticated (missing/invalid/expired credentials).
 * Note: despite the HTTP spec name, this is about *authentication*, not *authorization*.
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message);
  }
}

/**
 * 403 — the caller IS authenticated but lacks permission for this action.
 * Use this when a known user tries to access a resource they're not allowed to.
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message);
  }
}

/** 404 — the requested resource does not exist. */
export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(404, message);
  }
}

/**
 * 409 — a state conflict, e.g. a duplicate email on registration.
 * Prefer this over a generic 400 when the data is valid but conflicts with existing state.
 */
export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(409, message);
  }
}
