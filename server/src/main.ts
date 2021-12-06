import { useServer } from './server';

function main() {
  const { start } = useServer();

  start();
}

main();
