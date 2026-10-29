// ============================================================================
// MODULE: Core / Logging
// DESIGN: Injected logger interface and default console adapter (DIP, SRP)
// SUMMARY: Structured logger contract ensuring fixed message and context fields
//          without leaking secrets or dumping unstructured logs.
// ============================================================================

// ======================== INTERFACES & CONTRACTS ======================== \\
// #region Logger Interface
/**
 * Summary: Structured logger contract for application and system diagnostics.
 * Design: Decouples business code from direct console or remote telemetry output.
 */
export interface ILogger {
  /**
   * Summary: Logs diagnostic detail for development only.
   * @param message Fixed descriptive message.
   * @param context Structured key-value context.
   */
  debug(message: string, context?: Readonly<Record<string, unknown>>): void;

  /**
   * Summary: Logs significant business and lifecycle events.
   * @param message Fixed descriptive message.
   * @param context Structured key-value context.
   */
  info(message: string, context?: Readonly<Record<string, unknown>>): void;

  /**
   * Summary: Logs expected but notable occurrences such as limits or recoverable errors.
   * @param message Fixed descriptive message.
   * @param context Structured key-value context.
   */
  warn(message: string, context?: Readonly<Record<string, unknown>>): void;

  /**
   * Summary: Logs unexpected operational failures.
   * @param message Fixed descriptive message.
   * @param context Structured key-value context.
   */
  error(message: string, context?: Readonly<Record<string, unknown>>): void;
}
// #endregion

// ======================== DEFAULT IMPLEMENTATIONS ======================== \\
// #region Default Logger Implementations
/**
 * Summary: Standard browser/node console logger implementing ILogger.
 * Design: Safe implementation formatting structured context into JSON-safe entries.
 */
export class ConsoleLogger implements ILogger {
  public static readonly instance: ConsoleLogger = new ConsoleLogger();

  public debug(message: string, context?: Readonly<Record<string, unknown>>): void {
    if (typeof console !== 'undefined' && console.debug) {
      console.debug(`[DEBUG] ${message}`, context ?? {});
    }
  }

  public info(message: string, context?: Readonly<Record<string, unknown>>): void {
    if (typeof console !== 'undefined' && console.info) {
      console.info(`[INFO] ${message}`, context ?? {});
    }
  }

  public warn(message: string, context?: Readonly<Record<string, unknown>>): void {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn(`[WARN] ${message}`, context ?? {});
    }
  }

  public error(message: string, context?: Readonly<Record<string, unknown>>): void {
    if (typeof console !== 'undefined' && console.error) {
      console.error(`[ERROR] ${message}`, context ?? {});
    }
  }
}

/**
 * Summary: No-op logger for silent execution or test suites.
 * Design: Null object pattern avoiding null checks in caller systems.
 */
export class NullLogger implements ILogger {
  public static readonly instance: NullLogger = new NullLogger();

  public debug(_message: string, _context?: Readonly<Record<string, unknown>>): void {}
  public info(_message: string, _context?: Readonly<Record<string, unknown>>): void {}
  public warn(_message: string, _context?: Readonly<Record<string, unknown>>): void {}
  public error(_message: string, _context?: Readonly<Record<string, unknown>>): void {}
}
// #endregion
