import { getLanguageService as getHTMLLanguageService } from 'vscode-html-languageservice';
import {
    getCSSLanguageService,
    getLESSLanguageService,
    getSCSSLanguageService,
} from 'vscode-css-languageservice';

export enum StyleType {
    html = 'html',
    css = 'css',
    less = 'less',
    scss = 'scss',
}

export const LangServerMap = {
    [StyleType.html]: getHTMLLanguageService(),
    [StyleType.css]: getCSSLanguageService(),
    [StyleType.less]: getLESSLanguageService(),
    [StyleType.scss]: getSCSSLanguageService(),
};

export const EXT_MAP: Record<string, Exclude<StyleType, StyleType.html>> = {
    css: StyleType.css,
    pcss: StyleType.css,
    postcss: StyleType.css,
    less: StyleType.less,
    sass: StyleType.scss,
    scss: StyleType.scss,
};

export enum NodeType {
    Undefined,
    Identifier,
    Stylesheet,
    Ruleset,
    Selector,
    SimpleSelector,
    SelectorInterpolation,
    SelectorCombinator,
    SelectorCombinatorParent,
    SelectorCombinatorSibling,
    SelectorCombinatorAllSiblings,
    SelectorCombinatorShadowPiercingDescendant,
    Page,
    PageBoxMarginBox,
    ClassSelector,
    IdentifierSelector,
    ElementNameSelector,
    PseudoSelector,
    AttributeSelector,
    Declaration,
    Declarations,
    Property,
    Expression,
    BinaryExpression,
    Term,
    Operator,
    Value,
    StringLiteral,
    URILiteral,
    EscapedValue,
    Function,
    NumericValue,
    HexColorValue,
    MixinDeclaration,
    MixinReference,
    VariableName,
    VariableDeclaration,
    Prio,
    Interpolation,
    NestedProperties,
    ExtendsReference,
    SelectorPlaceholder,
    Debug,
    If,
    Else,
    For,
    Each,
    While,
    MixinContent,
    Media,
    Keyframe,
    FontFace,
    Import,
    Namespace,
    Invocation,
    FunctionDeclaration,
    ReturnStatement,
    MediaQuery,
    FunctionParameter,
    FunctionArgument,
    KeyframeSelector,
    ViewPort,
    Document,
    AtApplyRule,
    CustomPropertyDeclaration,
    CustomPropertySet,
    ListEntry,
}
