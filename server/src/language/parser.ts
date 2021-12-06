import {
  getLanguageService,
  Position,
  TokenType,
} from 'vscode-html-languageservice';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { StyleType } from '../const';

const ls = getLanguageService();

interface LanguageRegion {
  start: number;
  end: number;

  type?: StyleType;
}

export type DocumentRegions = ReturnType<typeof getDocumentRegions>;

export function getDocumentRegions(doc: TextDocument) {
  const regions: LanguageRegion[] = [];
  const scanner = ls.createScanner(doc.getText());
  let lastTagName = '';
  let lastAttr: string | null = null;
  let type: StyleType = StyleType.css;

  let token = scanner.scan();
  while (token !== TokenType.EOS) {
    switch (token) {
      case TokenType.StartTag:
        lastTagName = scanner.getTokenText().toLowerCase();
        lastAttr = null;
        type = StyleType.css;
        break;

      case TokenType.Styles:
        regions.push({
          type,
          start: scanner.getTokenOffset(),
          end: scanner.getTokenEnd(),
        });
        break;

      case TokenType.AttributeName:
        lastAttr = scanner.getTokenText();
        break;

      case TokenType.AttributeValue:
        if (lastAttr === 'lang' && lastTagName === 'style') {
          const val = scanner.getTokenText();

          if (getHtmlAttrValReg('less').test(val)) {
            type = StyleType.less;
          } else if (getHtmlAttrValReg(['scss', 'sass']).test(val)) {
            type = StyleType.scss;
          } else {
            type = StyleType.css;
          }
        }
        lastAttr = null;
        break;

      default:
        break;
    }

    token = scanner.scan();
  }

  return {
    getLanguageAtPosition(pos: Position) {
      return getLanguageAtPosition(doc, regions, pos);
    },
    getEmbeddedDocument(type: StyleType) {
      return getEmbeddedDocument(doc, regions, type);
    },
    getLanguagesInDocument() {
      return getLanguagesInDocument(regions);
    },
  };
}

function getLanguageAtPosition(
  doc: TextDocument,
  regions: LanguageRegion[],
  pos: Position
): StyleType | undefined {
  const offset = doc.offsetAt(pos);
  for (const region of regions) {
    if (region.start <= offset) {
      if (offset <= region.end) {
        return region.type;
      }
    } else {
      break;
    }
  }
  return undefined;
}

function getEmbeddedDocument(
  doc: TextDocument,
  regions: LanguageRegion[],
  type: StyleType
) {
  let currentPos = 0;
  const oldContent = doc.getText();
  let result = '';
  let lastSuffix = '';
  for (const c of regions) {
    if (c.type === type) {
      result = substituteWithWhitespace(
        result,
        currentPos,
        c.start,
        oldContent,
        lastSuffix,
        ''
      );
      result += oldContent.substring(c.start, c.end);
      currentPos = c.end;
      lastSuffix = '';
    }
  }
  result = substituteWithWhitespace(
    result,
    currentPos,
    oldContent.length,
    oldContent,
    lastSuffix,
    ''
  );
  return TextDocument.create(
    doc.uri,
    type,
    doc.version,
    result
  );
}

function getLanguagesInDocument(regions: LanguageRegion[]) {
  const result = [];
  for (const region of regions) {
    if (region.type && result.indexOf(region.type) === -1) {
      result.push(region.type);
      if (result.length === 3) {
        return result;
      }
    }
  }
  return result as StyleType[];
}

function getHtmlAttrValReg(value: string | string[]) {
  const list = ([] as string[]).concat(value);

  return new RegExp(`["'](${list.join('|')})["']`);
}

function substituteWithWhitespace(
  result: string,
  start: number,
  end: number,
  oldContent: string,
  before: string,
  after = ''
) {
  let accumulatedWS = 0;
  result += before;
  for (let i = start + before.length; i < end; i++) {
    const ch = oldContent[i];
    if (ch === '\n' || ch === '\r') {
      // only write new lines, skip the whitespace
      accumulatedWS = 0;
      result += ch;
    } else {
      accumulatedWS++;
    }
  }
  result = append(result, ' ', accumulatedWS - after.length);
  result += after;
  return result;
}

function append(result: string, str: string, n: number): string {
  while (n > 0) {
    if (n & 1) {
      result += str;
    }
    n >>= 1;
    str += str;
  }
  return result;
}
