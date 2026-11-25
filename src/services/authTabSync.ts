export function listenForAuthStorageChanges(
  target: EventTarget,
  onSignOut: () => void,
  onAuthChanged: () => void,
): () => void {
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === 'auth_token' && event.newValue === null) {
      onSignOut();
    } else if (event.key === 'auth_token' || event.key === 'user_data') {
      onAuthChanged();
    }
  };

  target.addEventListener('storage', handleStorageChange as EventListener);
  return () => target.removeEventListener('storage', handleStorageChange as EventListener);
}