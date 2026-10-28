// ============================================================================
// MODULE: Core / Error Handling
// DESIGN: Result pattern for expected failures (errors-logging/result-vs-exception)
// SUMMARY: Immutable success-or-failure container. Callers must check isSuccess before
//          reading value or error; reading the wrong side is a programmer error.
// ============================================================================

// ======================== IMPORTS & DEPENDENCIES ======================== \\
// #region Imports & Dependencies
import { InvalidResultAccessException } from './AppException';
// #endregion

// ======================== RESULT TYPE ======================== \\
// #region Result Class
/**
 * Summary: Either a success value of type T or an expected failure of type E.
 * Design: Private constructor plus static factories make a half-success state impossible.
 *         Instances are frozen.
 */
export class Result<T, E = string> {
    /** Summary: True when the operation succeeded. */
    public readonly isSuccess: boolean;

    /** Summary: Inverse of isSuccess, kept as a field for readable guard clauses. */
    public readonly isFailure: boolean;

    private readonly _value: T | undefined;
    private readonly _error: E | undefined;

    /** Summary: Builds a frozen Result; reachable only through ok() and fail(). */
    private constructor(isSuccess: boolean, value: T | undefined, error: E | undefined) {
        this.isSuccess = isSuccess;
        this.isFailure = !isSuccess;
        this._value = value;
        this._error = error;
        Object.freeze(this);
    }

    /**
     * Summary: Creates a successful Result.
     * Design: Static factory; the only way to build a success.
     * @param value Payload of the successful operation.
     * @returns A frozen successful Result.
     */
    public static ok<T, E = string>(value: T): Result<T, E> {
        return new Result<T, E>(true, value, undefined);
    }

    /**
     * Summary: Creates a failed Result for an expected failure.
     * Design: Static factory; never used for crashes, which throw AppException instead.
     * @param error Error code or domain error object.
     * @returns A frozen failed Result.
     */
    public static fail<T, E = string>(error: E): Result<T, E> {
        return new Result<T, E>(false, undefined, error);
    }

    /**
     * Summary: The success payload.
     * Design: Guards against reading a failure as if it were a success.
     * @returns The value given to Result.ok.
     * @throws {InvalidResultAccessException} When the Result is a failure.
     */
    public get value(): T {
        if (this.isFailure) {
            throw new InvalidResultAccessException('Read .value of a failed Result; check isSuccess first.');
        }
        return this._value as T;
    }

    /**
     * Summary: The failure descriptor.
     * Design: Guards against reading a success as if it were a failure.
     * @returns The error given to Result.fail.
     * @throws {InvalidResultAccessException} When the Result is a success.
     */
    public get error(): E {
        if (this.isSuccess) {
            throw new InvalidResultAccessException('Read .error of a successful Result; check isFailure first.');
        }
        return this._error as E;
    }
}
// #endregion
