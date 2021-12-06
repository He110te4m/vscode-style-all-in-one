import { isNull } from 'lodash';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { EXT_MAP, StyleType } from '../const';
import { DocumentRegions, getDocumentRegions } from './parser';

interface CacheOption {
  maxEnteries: number;
  autoCleanTime: number;
}

type Models = Record<
  string,
  {
    version: number;
    type: StyleType;
    cTime: number;
    model: DocumentRegions;
  }
>;

export type LanguageModelCache = ReturnType<typeof getLanguageModelCache>;

export function getLanguageModelCache({
  autoCleanTime,
  maxEnteries,
}: CacheOption) {
  let models: Models = {};
  let modelCount = 0;
  const autoCleanTimeMs = autoCleanTime * 1000;

  let cleanTimer: NodeJS.Timer | null = null;
  if (autoCleanTimeMs > 0) {
    cleanTimer = setInterval(() => {
      const expireTime = Date.now() - autoCleanTimeMs;
      const uris = Object.keys(models);
      for (const uri of uris) {
        const info = models[uri];
        if (info.cTime < expireTime) {
          delete models[uri];
          modelCount--;
        }
      }
    }, autoCleanTimeMs);
  }

  return {
    get(doc: TextDocument) {
      const { version, languageId, uri } = doc;
      const type = EXT_MAP[languageId];
      const info = models[uri];
      if (info?.version === version && info.type === type) {
        info.cTime = Date.now();
        return info.model;
      }

      const model = getDocumentRegions(doc);
      models[uri] = {
        version,
        type,
        cTime: Date.now(),
        model,
      };
      if (!info) {
        modelCount++;
      }

      if (modelCount === maxEnteries) {
        let oldestTime = Number.MAX_VALUE;
        let oldestUri = '';

        for (const uri in models) {
          const info = models[uri];
          if (info.cTime < oldestTime) {
            oldestUri = uri;
            oldestTime = info.cTime;
          }
        }

        if (oldestUri) {
          delete models[oldestUri];
          modelCount--;
        }
      }

      return model;
    },
    onDocumentRemoved(doc: TextDocument) {
      const uri = doc.uri;
      if (models[uri]) {
        delete models[uri];
        modelCount--;
      }
    },
    dispose() {
      if (!isNull(cleanTimer)) {
        clearInterval(cleanTimer);
        cleanTimer = null;
        models = {};
        modelCount = 0;
      }
    },
  };
}

export const languageModel = getLanguageModelCache({
  maxEnteries: 30,
  autoCleanTime: 120
});
