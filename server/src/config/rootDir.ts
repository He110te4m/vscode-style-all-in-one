export function useRootDir() {
  let dir = '';

  return {
    get: () => dir,
    set: (path: string) => (dir = path),
  };
}
