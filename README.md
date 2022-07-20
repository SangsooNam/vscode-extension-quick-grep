# VSCode Quick Grep

Git Grep and Ripgrep extension for Visual Studio Code. Easy to search code, see results, and navigate with the quick pick view. A selected text will be used to grep by default.

The default shortcut is `Cmd + E`

### Usage

![Usage](images/usage.gif)

## Extension Settings

| Setting             | Description                                                            | Type    | Default Value |
| ------------------- | ---------------------------------------------------------------------- | ------- | ------------- |
| `quickgrep.preview` | Show the preview when the item is selected.                            | boolean | false         |
| `quickgrep.grep`    | Select a command to grep. Git grep only works within a git repository. | boolean | false         |

## Commands

```json
"commands": [
  {
    "command": "quickgrep.action",
    "title": "Quick Grep"
  }
]
```

## Build
```
yarn install
vsce package
```