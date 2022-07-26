/* eslint @typescript-eslint/no-var-requires: "off" */
import * as vscode from 'vscode';
import child_process = require('child_process');

const quote = require('shell-quote').quote;
const rootPath = vscode.workspace.rootPath ? vscode.workspace.rootPath : '.';

function debounce<T extends (...args: any[]) => any>(
  ms: number,
  callback: T,
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timer: NodeJS.Timeout | undefined;

  return (...args: Parameters<T>) => {
    if (timer) {
      clearTimeout(timer);
    }
    return new Promise<ReturnType<T>>((resolve) => {
      timer = setTimeout(() => {
        const returnValue = callback(...args) as ReturnType<T>;
        resolve(returnValue);
      }, ms);
    });
  };
}

const quickGrep = (text: string) => {
  return new Promise((resolve) => {
    if (text.length <= 1) {
      return resolve([]);
    }

    const useGitGrep = vscode.workspace.getConfiguration('quickgrep').grep === 'Git Grep';
    const command = useGitGrep
      ? quote(['git', 'grep', '-H', '-n', '-i', '-I', '--no-color', '-F', '-e', text])
      : quote(['rg', '--no-heading', '--line-number', '--color', 'never', '-F', text, '--', '.']);

    child_process.exec(command, { cwd: rootPath, maxBuffer: 4000 * 1024 }, (err: any, stdout: any, stderr: any) => {
      if (stderr) {
        vscode.window.showErrorMessage(stderr);
        return resolve([]);
      }

      const lines = stdout.split(/\n/).filter((line: string) => line !== '');
      if (!lines.length) {
        return resolve([
          {
            label: 'No results found',
            alwaysShow: true,
          },
        ]);
      }

      return resolve(
        lines.map((line: string) => {
          const [fullPath, lineNumber, ...desc] = line.split(':');
          const path = fullPath.split('/');
          return {
            label: `${path[path.length - 1]} : ${lineNumber}`,
            detail: desc.join(':').trim(),
            description: fullPath,
          };
        }),
      );
    });
  });
};

const showDocument = async (item: vscode.QuickPickItem, preserveFocus = false) => {
  const path = item.description;
  const [, lineNumber] = item.label.split(' : ');
  const options = { preserveFocus: preserveFocus };
  await vscode.window.showTextDocument(vscode.Uri.file(rootPath + '/' + path), options);
  const activeTextEditor = vscode.window.activeTextEditor;
  if (activeTextEditor) {
    const pos = new vscode.Position(~~lineNumber - 1, 0);
    const range = new vscode.Range(pos, pos);
    activeTextEditor.selection = new vscode.Selection(pos, pos);
    activeTextEditor.revealRange(range, vscode.TextEditorRevealType.InCenter);
  }
};

export function activate(context: vscode.ExtensionContext) {
  let cacheValue: string;
  let cacheItems: vscode.QuickPickItem[] = [];

  context.subscriptions.push(
    vscode.commands.registerCommand('quickgrep.action', () => {
      const quickPick = vscode.window.createQuickPick();
      quickPick.matchOnDescription = false;
      quickPick.matchOnDetail = true;
      quickPick.placeholder = 'Search';
      const activeTextEditor = vscode.window.activeTextEditor;

      // Use cache to show the recent results
      if (cacheValue) {
        quickPick.value = cacheValue;
        quickPick.items = cacheItems;
      }

      // Search the current selection
      if (activeTextEditor) {
        const value = activeTextEditor.document.getText(activeTextEditor.selection);
        if (value) {
          quickPick.value = value;
        }
      }

      const updateItems = debounce(300, (value) => {
        if (cacheValue === value) {
          return;
        }
        quickGrep(value).then((items) => {
          cacheValue = value;
          cacheItems = items as vscode.QuickPickItem[];
          quickPick.items = items as vscode.QuickPickItem[];
        });
      });

      quickPick.onDidChangeValue(updateItems);

      quickPick.onDidAccept(async () => {
        if (quickPick.selectedItems.length > 0) {
          await showDocument(quickPick.selectedItems[0]);
        }
      });

      quickPick.onDidChangeActive(async (val: readonly vscode.QuickPickItem[]) => {
        if (vscode.workspace.getConfiguration('quickgrep').preview) {
          if (val.length > 0) {
            await showDocument(val[0], true);
          }
        }
      });
      quickPick.show();
    }),
  );
}
