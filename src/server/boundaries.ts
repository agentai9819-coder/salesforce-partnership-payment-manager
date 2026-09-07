/**
 * Application & Server Layer Boundary
 * 
 * Defines the standard command/query result contracts and server execution boundaries.
 */

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
  };
}

export interface AuthenticatedContext {
  partnerId: string;
  partnerCode: 'ANURAG' | 'VIVEK';
  organizationId: string;
  userEmail: string;
}

/**
 * Standard server action execution wrapper providing unified error handling.
 */
export async function executeServerAction<T>(
  actionName: string,
  executor: () => Promise<T>
): Promise<ActionResult<T>> {
  try {
    const data = await executor();
    return { success: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : `Action '${actionName}' failed`;
    return {
      success: false,
      error: {
        code: 'ACTION_EXECUTION_FAILED',
        message,
      },
    };
  }
}
