# ATC Training Radar

ATC Training Radar is a web-based radar simulator designed for air traffic control training. It allows users to spawn, monitor, and command aircraft in a simulated radar environment.

これは、航空管制訓練を目的として設計されたWebベースのレーダーシミュレーターです。ユーザーはシミュレートされたレーダー環境で、航空機の生成、監視、および指示を行うことができます。

## Features / 主な機能

- **Aircraft Simulation**: Spawn and command aircraft. Each aircraft has a unique callsign, heading, and speed, with its position updated in real-time.
  - **航空機シミュレーション**: 航空機を生成し、指示を与えます。各航空機はユニークなコールサイン、針路、速度を持ち、その位置はリアルタイムで更新されます。
- **Command & Control Modes**:
  - **`生成` (Spawn) Mode**: Click on any point on the radar to spawn a new aircraft. An initial heading can be specified.
  - **`指示` (Command) Mode**: Select an aircraft and issue heading commands (0-360°). The aircraft will turn towards the new heading at a standard rate.
  - **`計測` (Measure) Mode**: Click and drag to measure the distance (in nautical miles) and bearing between any two points on the radar.
  - **各操作モード**:
    - **`生成`モード**: レーダー上の任意の点をクリックして新しい航空機をスポーンします。初期針路の指定も可能です。
    - **`指示`モード**: 航空機を選択し、針路指示（0-360°）を出します。航空機は標準旋回率で新しい針路に向かいます。
    - **`計測`モード**: クリック＆ドラッグで、レーダー上の2点間の距離（海里）と方位を計測します。
- **Radar Tools & Display**:
  - **Simulation Speed Control**: Adjust the simulation speed (0.5x, 1x, 2x, 5x).
  - **Training Overlays**: Displays various overlays for training purposes, such as concentric range rings and custom shapes for procedural training.
  - **PWA Support**: Can be installed as a Progressive Web App for a native-like experience and offline availability.
  - **レーダーツールと表示**:
    - **シミュレーション速度**: シミュレーションの速度を調整できます（0.5x, 1x, 2x, 5x）。
    - **訓練用オーバーレイ**: 同心円のレンジリングやプロシージャ訓練用のカスタム図形など、さまざまなオーバーレイを表示します。
    - **PWA対応**: プログレッシブウェブアプリとしてインストールでき、ネイティブアプリのような体験やオフラインでの利用が可能です。

## How to Use / 使い方

1.  **Select Mode**: Choose a mode from the top bar: `生成` (Spawn), `指示` (Command), or `計測` (Measure).
    - **モード選択**: 上部バーから`生成`、`指示`、`計測`のいずれかのモードを選択します。
2.  **Spawn Aircraft**: In `生成` mode, click anywhere on the radar. You can set an initial heading in the "生成HDG" input field in the control panel on the right.
    - **航空機の生成**: `生成`モードで、レーダー上をクリックします。右側のコントロールパネルにある「生成HDG」入力欄で初期針路を設定できます。
3.  **Issue Commands**: In `指示` mode, click an aircraft to select it. Use the numeric keypad in the control panel to input a heading and press the `指示` button.
    - **指示の発行**: `指示`モードで、航空機をクリックして選択します。コントロールパネルのテンキーで針路を入力し、「指示」ボタンを押します。
4.  **Measure**: In `計測` mode, click and drag on the radar to measure distance and bearing.
    - **計測**: `計測`モードで、レーダー上をドラッグして距離と方位を計測します。

## Technology Stack / 技術スタック

This project is built with a modern, lean web technology stack.

-   **Frontend**: [React](https://react.dev/) with [TypeScript](https://www.typescriptlang.org/)
-   **Build Tool**: [Vite](https://vitejs.dev/)
-   **State Management**: Implemented using React's built-in hooks (`useState`, `useContext`, `useReducer`) encapsulated in a custom `useRadarState` hook, which centralizes all application logic.
-   **Rendering**: Uses the HTML5 Canvas API for efficient and dynamic rendering of the radar display.

## Development / 開発

### Setup

Install the dependencies:
```bash
npm install
```

### Running the Development Server

To start the development server, run:
```bash
npm run dev
```
This will open the application in your browser, typically at `http://localhost:5173`.

### Building for Production

To create a production build, run:
```bash
npm run build
```
The output files will be generated in the `dist` directory.

## Deployment / デプロイ

This project is automatically deployed to GitHub Pages. The workflow is triggered on every push to the `main` branch where the commit message starts with `feat:` or `refactor:`.

このプロジェクトはGitHub Pagesに自動的にデプロイされます。`main`ブランチへのプッシュのうち、コミットメッセージが `feat:` または `refactor:` で始まるものをトリガーとして、ワークフローが実行されます。
