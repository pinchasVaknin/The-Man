// ============================================================================
// MODULE: Core / Error Handling
// DESIGN: Typed exception hierarchy for unexpected failures only (errors-logging/result-vs-exception)
// SUMMARY: Base AppException plus standard infrastructure exceptions.
//          Expected failures are never exceptions; they are Result values.
// ============================================================================

// ======================== BASE EXCEPTION ======================== \\
// #region App Exception
/**
 * Summary: Base class for every unexpected system or infrastructure failure.
 * Design: Carries a machine-readable code and safe context for the error boundary. Restores
 *         the prototype chain so `instanceof` works across transpilation targets.
 */
export abstract class AppException extends Error {
    /** Summary: Stable code the error boundary logs and maps to an opaque client error. */
    public readonly errorCode: string;

    /** Summary: Non-sensitive diagnostic fields; never secrets (errors-logging/redaction). */
    public readonly context: Readonly<Record<string, unknown>> | undefined;

    /**
     * Summary: Initializes the code, message, context and optional cause.
     * Design: Protected so only concrete, named exceptions can be thrown.
     * @param errorCode Machine-readable exception code.
     * @param message Technical description for internal logs only.
     * @param context Optional structured diagnostic fields.
     * @param cause Optional underlying error being wrapped.
     */
    protected constructor(
        errorCode: string,
        message: string,
        context?: Readonly<Record<string, unknown>>,
        cause?: unknown,
    ) {
        super(message, { cause });
        this.name = new.target.name;
        this.errorCode = errorCode;
        this.context = context;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
// #endregion

// ======================== CONCRETE EXCEPTIONS ======================== \\
// #region Infrastructure Exceptions
/**
 * Summary: The system cannot continue safely: corrupted config, missing dependency, broken invariant.
 * Design: Thrown at construction or startup; the error boundary stops the process.
 */
export class InfrastructureCorruptedException extends AppException {
    /**
     * Summary: Creates the exception with the INFRASTRUCTURE_CORRUPTED code.
     * Design: Fixed code so the boundary can treat every instance the same way.
     * @param message Technical description for internal logs.
     * @param context Optional structured diagnostic fields.
     */
    public constructor(message: string, context?: Readonly<Record<string, unknown>>) {
        super('INFRASTRUCTURE_CORRUPTED', message, context);
    }
}

/**
 * Summary: Code read `.value` of a failed Result or `.error` of a successful one.
 * Design: A programmer error, so it throws instead of returning a Result.
 */
export class InvalidResultAccessException extends AppException {
    /**
     * Summary: Creates the exception with the INVALID_RESULT_ACCESS code.
     * Design: Fixed code; the message names which accessor was misused.
     * @param message Which accessor was read in the wrong state.
     */
    public constructor(message: string) {
        super('INVALID_RESULT_ACCESS', message);
    }
}
// #endregion
