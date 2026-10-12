export function Toast({ message }: { message: string | null }) {
  return (
    <div id="toast" role="status" aria-live="polite" style={{ display: message ? 'block' : 'none' }}>
      {message}
    </div>
  );
}
