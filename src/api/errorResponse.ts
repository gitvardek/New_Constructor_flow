export function makeErrorResponse(err: unknown, status = 599) {
    return new Response(
        JSON.stringify({
            error: true,
            message: typeof err === 'string' ? err : (err as Error)?.message || 'Network error',
        }),
        { status, headers: { 'Content-Type': 'application/json' } }
    );
}