import { join } from 'path';
import { ExtensionContext, workspace } from 'vscode';

import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions,
    TransportKind,
} from 'vscode-languageclient';
import { getWorkspaceFolder } from './config';

let client: LanguageClient;

const supportFiles = ['css', 'less', 'sass', 'scss', 'pcss'];

export function activate(context: ExtensionContext) {
    /** 取 server 代码入口 */
    const serverModule = context.asAbsolutePath(
        join('server', 'out', 'server.js')
    );
    /** debugger 模式的配置 */
    const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

    /** server 通用配置 */
    const config = {
        module: serverModule,
        transport: TransportKind.ipc,
    };

    /**
     * server 配置
     * 配置正常运行和 debug 两种模式，debug 下可以打断点调试
     */
    const serverOptions: ServerOptions = {
        run: { ...config },
        debug: {
            ...config,
            options: debugOptions,
        },
    };

    /** client 配置 */
    const clientOptions: LanguageClientOptions = {
        /** 注册支持的语言类型 */
        documentSelector: [{ scheme: 'file', language: 'vue' }].concat(
            supportFiles.map((suffix) => ({
                scheme: 'file',
                language: suffix,
            }))
        ),
        initializationOptions: {
            rootDir: getWorkspaceFolder(),
        },
        synchronize: {
            configurationSection: 'style-all-in-one',
            fileEvents: supportFiles.map((suffix) =>
                workspace.createFileSystemWatcher(`**/*.${suffix}`)
            ),
        },
    };

    // 实例化 client
    client = new LanguageClient(
        'style-all-in-one',
        'Style all in one',
        serverOptions,
        clientOptions
    );

    // 启动 client
    client.start();
}

export function deactivate() {
    if (!client) {
        return;
    }
    return client.stop();
}
