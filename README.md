# ATC Training Radar

ATC Training Radar is a web-based radar simulator for air traffic control training purposes.

これは、航空管制訓練を目的としたWebベースのレーダーシミュレーターです。

## Features / 主な機能

- **Aircraft Simulation**: Spawn and command aircraft on the radar screen. Each aircraft has a callsign, heading, and speed, and their movement is updated every 4 seconds.
  - **航空機シミュレーション**: レーダー画面上で航空機を生成し、指示を与えることができます。各航空機はコールサイン、針路、速度を持ち、4秒ごとに位置が更新されます。
- **Command & Control**:
  - **Spawn Mode**: Click on any point on the radar to spawn a new aircraft. You can specify an initial heading.
  - **Command Mode**: Select an aircraft and issue heading commands (0-359°). The aircraft will turn towards the new heading at a standard rate (3°/sec).
  - **生成モード**: レーダー上の任意の点をクリックして新しい航空機をスポーンします。初期針路を指定することも可能です。
  - **指示モード**: 航空機を選択し、針路指示（0-359°）を出します。航空機は標準的な旋回率（3°/秒）で新しい針路に向かいます。
- **Radar Tools**:
  - **Measurement Tool**: Measure the distance (NM) and bearing (degrees) between any two points.
  - **Range Control**: Switch the radar range between 20 NM and 50 NM.
  - **Simulation Speed**: Adjust the simulation speed (0.5x, 1.0x, 2.0x, 5.0x).
  - **計測ツール**: 任意の2点間の距離（NM）と方位（度）を計測できます。
  - **レンジ切替**: レーダーの表示範囲を20NMと50NMで切り替えられます。
  - **シミュレーション速度**: シミュレーションの速度を調整できます（0.5x, 1.0x, 2.0x, 5.0x）。
- **Special Overlays**: Displays various overlays for training purposes, such as concentric circles and other shapes for PCA (Pre-duty Check Assistance).
  - **特殊オーバーレイ**: PCA（職務前チェック補助）のための同心円や特定の図形など、訓練目的の様々なオーバーレイを表示します。
- **PWA Support**: Can be installed as a Progressive Web App for offline use.
  - **PWA対応**: プログレッシブウェブアプリとしてインストールし、オフラインでも使用できます。

## How to Use / 使い方

1.  **Select Mode**: Choose a mode from the top bar: `生成` (Spawn), `指示` (Command), or `計測` (Measure).
    - **モード選択**: 上部バーから`生成`、`指示`、`計測`のいずれかのモードを選択します。
2.  **Spawn Aircraft**: In `生成` mode, click anywhere on the radar to spawn an aircraft. You can set an initial heading in the "生成HDG" input field on the right.
    - **航空機の生成**: `生成`モードで、レーダー上をクリックして航空機をスポーンします。右側の「生成HDG」入力欄で初期針路を設定できます。
3.  **Issue Commands**: In `指示` mode, click on an aircraft to select it. Then, use the numeric keypad on the right to input a heading and press the `指示` button.
    - **指示の発行**: `指示`モードで、航空機をクリックして選択します。その後、右側のテンキーで針路を入力し、「指示」ボタンを押します。
4.  **Measure**: In `計測` mode, click and drag on the radar to measure distance and bearing.
    - **計測**: `計測`モードで、レーダー上をドラッグして距離と方位を計測します。

## Development / 開発

This project is built with React, TypeScript, and Vite.

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
This will open the application in your browser.

### Building for Production

To create a production build, run:
```bash
npm run build
```
The output files will be generated in the `dist` directory.