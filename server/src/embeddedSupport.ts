import { StyleType } from './const';
import { TextDocument, Position, LanguageService, TokenType, Range } from './languageModes';

export interface LanguageRange extends Range {
    languageID: StyleType | undefined;
    attributeValue?: boolean;
}

export interface HTMLDocumentRegions {
    getEmbeddedDocument(
        languageID: StyleType,
        ignoreAttributeValues?: boolean
    ): TextDocument;
    getLanguageRanges(range: Range): LanguageRange[];
    getLanguageAtPosition(position: Position): StyleType | undefined;
    getLanguagesInDocument(): StyleType[];
}

export const CSS_STYLE_RULE = '__';

interface EmbeddedRegion { languageID: StyleType | undefined; start: number; end: number; attributeValue?: boolean; }

export function getDocumentRegions(languageService: LanguageService, document: TextDocument): HTMLDocumentRegions {
    const regions: EmbeddedRegion[] = [];
    const scanner = languageService.createScanner(document.getText());
    let lastTagName = '';
    let lastAttributeName: string | null = null;
    let languageIDFromType: StyleType = '' as StyleType;

    let token = scanner.scan();
    while (token !== TokenType.EOS) {
        switch (token) {
            case TokenType.StartTag:
                lastTagName = scanner.getTokenText();
                lastAttributeName = null;
                languageIDFromType = StyleType.css;
                break;
            case TokenType.Styles:
                regions.push({
                    languageID: languageIDFromType,
                    start: scanner.getTokenOffset(),
                    end: scanner.getTokenEnd(),
                });
                break;
            case TokenType.AttributeName:
                lastAttributeName = scanner.getTokenText();
                break;
            case TokenType.AttributeValue:
                if (lastAttributeName === 'lang' && lastTagName.toLowerCase() === 'style') {
                    const val = scanner.getTokenText();

                    if (/["'](less)["']/.test(val)) {
                        languageIDFromType = StyleType.less;
                    } else if (/["'](scss|sass)["']/.test(val)) {
                        languageIDFromType = StyleType.scss;
                    } else {
                        languageIDFromType = StyleType.css;
                    }
                }
                lastAttributeName = null;
                break;
        }
        token = scanner.scan();
    }
    return {
        getLanguageRanges: (range: Range) => getLanguageRanges(document, regions, range),
        getEmbeddedDocument: (languageID: StyleType, ignoreAttributeValues: boolean) => getEmbeddedDocument(document, regions, languageID, ignoreAttributeValues),
        getLanguageAtPosition: (position: Position) => getLanguageAtPosition(document, regions, position),
        getLanguagesInDocument: () => getLanguagesInDocument(document, regions)
    };
}

function getLanguageRanges(document: TextDocument, regions: EmbeddedRegion[], range: Range): LanguageRange[] {
    const result: LanguageRange[] = [];
    let currentPos = range ? range.start : Position.create(0, 0);
    let currentOffset = range ? document.offsetAt(range.start) : 0;
    const endOffset = range ? document.offsetAt(range.end) : document.getText().length;
    for (const region of regions) {
        if (region.end > currentOffset && region.start < endOffset) {
            const start = Math.max(region.start, currentOffset);
            const startPos = document.positionAt(start);
            if (currentOffset < region.start) {
                result.push({
                    start: currentPos,
                    end: startPos,
                    languageID: StyleType.html
                });
            }
            const end = Math.min(region.end, endOffset);
            const endPos = document.positionAt(end);
            if (end > region.start) {
                result.push({
                    start: startPos,
                    end: endPos,
                    languageID: region.languageID,
                    attributeValue: region.attributeValue
                });
            }
            currentOffset = end;
            currentPos = endPos;
        }
    }
    if (currentOffset < endOffset) {
        const endPos = range ? range.end : document.positionAt(endOffset);
        result.push({
            start: currentPos,
            end: endPos,
            languageID: StyleType.html
        });
    }
    return result;
}

function getLanguagesInDocument(_document: TextDocument, regions: EmbeddedRegion[]): StyleType[] {
    const result = [];
    for (const region of regions) {
        if (region.languageID && result.indexOf(region.languageID) === -1) {
            result.push(region.languageID);
            if (result.length === 3) {
                return result;
            }
        }
    }
    result.push(StyleType.html);
    return result as StyleType[];
}

function getLanguageAtPosition(
    document: TextDocument,
    regions: EmbeddedRegion[],
    position: Position
): StyleType | undefined {
    const offset = document.offsetAt(position);
    for (const region of regions) {
        if (region.start <= offset) {
            if (offset <= region.end) {
                return region.languageID;
            }
        } else {
            break;
        }
    }
    return StyleType.html;
}

function getEmbeddedDocument(document: TextDocument, contents: EmbeddedRegion[], languageID: StyleType, ignoreAttributeValues: boolean): TextDocument {
    let currentPos = 0;
    const oldContent = document.getText();
    let result = '';
    let lastSuffix = '';
    for (const c of contents) {
        if (c.languageID === languageID && (!ignoreAttributeValues || !c.attributeValue)) {
            result = substituteWithWhitespace(result, currentPos, c.start, oldContent, lastSuffix, getPrefix(c));
            result += oldContent.substring(c.start, c.end);
            currentPos = c.end;
            lastSuffix = getSuffix(c);
        }
    }
    result = substituteWithWhitespace(result, currentPos, oldContent.length, oldContent, lastSuffix, '');
    return TextDocument.create(document.uri, languageID, document.version, result);
}

function getPrefix(c: EmbeddedRegion) {
    if (c.attributeValue) {
        switch (c.languageID) {
            case StyleType.css: return CSS_STYLE_RULE + '{';
            case StyleType.less: return '@';
            case StyleType.scss: return '$';
        }
    }
    return '';
}
function getSuffix(c: EmbeddedRegion) {
    if (c.attributeValue) {
        switch (c.languageID) {
            case StyleType.css: return '}';
        }
    }
    return '';
}

function substituteWithWhitespace(result: string, start: number, end: number, oldContent: string, before: string, after: string) {
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
