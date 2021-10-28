import 'vscode-css-languageservice';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { NodeType } from '../const';

declare module 'vscode-css-languageservice' {
    export interface Node {
        // Properties
        type: NodeType;
        offset: number;
        length: number;
        end: number;

        // Methods
        accept: (node: any) => boolean;

        getName: () => string;
        getValue: () => Node;
        getDefaultValue: () => Node;
        getText: () => string;
        getParameters: () => Node;
        getIdentifier: () => Node;

        getParent: () => Node;
        getChildren: () => Node[];
        getChild: (index: number) => Node;
        getSelectors: () => Node;
    }
    export interface LanguageService {
        parseStylesheet(document: TextDocument): Node;
    }
}
