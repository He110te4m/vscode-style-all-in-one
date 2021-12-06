import {
  createConnection,
  IPCMessageReader,
  IPCMessageWriter,
  TextDocuments,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { initListener } from './init';

export function useServer() {
  // create connection pool
  const conn = createConnection(
    new IPCMessageReader(process),
    new IPCMessageWriter(process)
  );

  // create document manager
  const docs = new TextDocuments(TextDocument);

  return {
    conn,
    docs,
    start: () => {
      initListener(conn, docs);
      docs.listen(conn);
      conn.listen();
    },
  };
}
