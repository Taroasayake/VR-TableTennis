# WebXR 3D PONG Game for Meta Quest

ViteとReactを使用したWebXR ARゲームです。Meta QuestでARモードで動作する3D PONGゲームを提供します。

## 機能

- **ARモード対応**: 現実空間にゲームボードを配置
- **アンカーシステム**: 設定した位置にゲームを固定（localStorage保存）
- **1P/2Pモード**: AIと対戦 or 2人対戦
- **スコア表示**: 視覚的なスコア表示（10点先取）
- **効果音**: パドル衝突、壁衝突、得点時の音
- **ゲームオーバー画面**: 日本語表示（IPAexゴシックフォント使用）

## セットアップ

```bash
npm install
```

## 開発サーバーの起動

```bash
npm run dev
```

HTTPSサーバーが起動します（WebXRに必須）。
デフォルト: https://localhost:5173

## Meta Questでのアクセス方法（開発時）

1. PCとMeta Questを同じネットワークに接続
2. PCのIPアドレスを確認
3. Meta QuestのブラウザでPCのIPアドレスにアクセス（例: https://192.168.1.100:5173）
4. SSL証明書の警告が表示されたら「詳細」→「続行」をクリック
5. 「Enter AR」ボタンをクリックしてARモードに入る
6. 床を向けてレティクル（白いリング）が表示されたらトリガーボタンでアンカー設定
7. ゲーム開始！

## ゲームの操作方法

- **右コントローラーのスティック**: 左パドル（赤）を操作
- **左コントローラーのスティック**: 右パドル（青）を操作（2Pモード時）
- **Aボタン**: 1P/2Pモード切り替え
- **Bボタン**: ゲームオーバー時にリセット

## ゲーム位置の調整

ゲームボードの配置位置は `src/App.tsx` の `PongGame` 関数内で調整できます：

```typescript
// ゲームの配置位置（プレイヤーの前方1.5m、目線の高さ1.2m）
const gamePosition = new THREE.Vector3(0, 1.2, -1.5)
```

**パラメータの意味：**
- `x: 0` - 左右の位置（0 = 正面中央、正の値 = 右、負の値 = 左）
- `y: 1.2` - 高さ（メートル単位、1.2 = 目線の高さ付近）
- `z: -1.5` - 前後の距離（負の値 = 前方、-1.5 = プレイヤーの前方1.5m）

**調整例：**
```typescript
// もっと近くに配置
const gamePosition = new THREE.Vector3(0, 1.2, -1.0)

// もっと低く配置（テーブル高さ）
const gamePosition = new THREE.Vector3(0, 0.8, -1.5)

// 少し右にずらす
const gamePosition = new THREE.Vector3(0.3, 1.2, -1.5)
```

## プロダクションビルド

### 1. ビルド実行

```bash
npm run build
```

`dist`フォルダに最適化されたファイルが生成されます。

### 2. Webサーバーへのデプロイ

#### アップロードするファイル

`dist`フォルダ内の**全てのファイル**をWebサーバーにアップロードしてください：

```
dist/
├── assets/          （フォルダごと全て）
├── index.html
├── ipaexg.ttf
├── ipaexm.ttf
├── IPA_Font_License_Agreement_v1.0.txt
├── Readme_IPAexfont00401.txt
└── vite.svg
```

#### 配置場所

- **ルートディレクトリ**: `https://yourdomain.com/`
- **サブディレクトリ**: `https://yourdomain.com/game/`

どちらでも動作します（`base: './'`設定済み）。

#### 必須要件

⚠️ **HTTPS必須**: WebXRはHTTPSでのみ動作します
⚠️ **有効なSSL証明書**: Let's Encryptなどの証明書が必要
⚠️ **WebXR対応ブラウザ**: Meta Quest Browser推奨

### 3. デプロイ方法の例

#### FTP/SFTPでアップロード

```bash
# FileZilla、WinSCP、Cyberduckなどを使用
# dist フォルダの中身を公開ディレクトリにアップロード
```

#### GitHub Pagesへのデプロイ

```bash
# gh-pagesパッケージをインストール
npm install -D gh-pages

# package.jsonにスクリプト追加
"scripts": {
  "deploy": "npm run build && gh-pages -d dist"
}

# デプロイ実行
npm run deploy
```

#### Netlify/Vercelへのデプロイ

1. Netlify/Vercelアカウントを作成
2. GitHubリポジトリを連携
3. ビルドコマンド: `npm run build`
4. 公開ディレクトリ: `dist`
5. 自動デプロイ完了

### 4. デプロイ後の確認

1. Meta Questでブラウザを開く
2. デプロイしたURLにアクセス
3. 「Enter AR」ボタンが表示されることを確認
4. ARモードで正常に動作することを確認

## 機能

- VRモード対応
- コントローラーとハンドトラッキング
- 3Dオブジェクトの表示（キューブ、スフィア）
- 床の表示

## 使用技術

- Vite
- React + TypeScript
- Three.js
- @react-three/fiber
- @react-three/xr
- @pixiv/three-vrm (VRMモデル対応)




## VRMモデルの表示

このプロジェクトではVRMフォーマットの3Dアバターを表示できます。

### VRMファイルの配置

VRMファイルを `public/models/` ディレクトリに配置してください。

### AnimationMixerによるアニメーション制御

Three.jsのAnimationMixerを使用してVRMモデルにアニメーションを適用できます。

#### AnimationMixerとは

- 3Dモデルのアニメーションを再生・制御するシステム
- 複数のアニメーションクリップを管理・ブレンド可能
- GLTFやFBXなどのモデルに含まれるアニメーションを再生

#### 基本的な使い方

```typescript
// 1. AnimationMixerの作成
const mixer = new THREE.AnimationMixer(model)

// 2. アニメーションクリップの取得と再生
const action = mixer.clipAction(animations[0])
action.play()

// 3. 毎フレーム更新（useFrame内）
mixer.update(delta)
```

#### 実装例

```typescript
function VRMModel() {
  const [vrm, setVrm] = useState<any>(null)
  const mixerRef = useRef<THREE.AnimationMixer | null>(null)

  useEffect(() => {
    // VRMモデルを読み込み
    const loader = new GLTFLoader()
    loader.register((parser) => new VRMLoaderPlugin(parser))
    
    loader.load('/models/model.vrm', (gltf) => {
      const vrmModel = gltf.userData.vrm
      setVrm(vrmModel)
      
      // アニメーションクリップがある場合
      if (gltf.animations && gltf.animations.length > 0) {
        const mixer = new THREE.AnimationMixer(vrmModel.scene)
        mixerRef.current = mixer
        
        // 全てのアニメーションを再生
        gltf.animations.forEach((clip) => {
          const action = mixer.clipAction(clip)
          action.play()
        })
      }
    })
  }, [])

  useFrame((state, delta) => {
    // VRMの更新
    if (vrm) {
      vrm.update(delta)
    }
    
    // AnimationMixerの更新
    if (mixerRef.current) {
      mixerRef.current.update(delta)
    }
  })
}
```

#### 主要なメソッド

```typescript
// アクションの作成
const action = mixer.clipAction(clip)

// 再生制御
action.play()        // 再生
action.stop()        // 停止
action.pause()       // 一時停止
action.reset()       // リセット

// プロパティ設定
action.loop = THREE.LoopRepeat  // ループモード
action.clampWhenFinished = true // 終了時に最終フレームで停止
action.setDuration(2)           // 再生時間を2秒に設定
action.timeScale = 0.5          // 再生速度を半分に

// ブレンド（アニメーション遷移）
action1.fadeOut(0.5)   // 0.5秒かけてフェードアウト
action2.fadeIn(0.5)    // 0.5秒かけてフェードイン
action2.crossFadeFrom(action1, 0.5)  // アニメーション間のクロスフェード
```

#### 複数アニメーションの切り替え

```typescript
const [currentAction, setCurrentAction] = useState<THREE.AnimationAction | null>(null)

function playAnimation(clipName: string) {
  if (!mixerRef.current) return
  
  const clip = THREE.AnimationClip.findByName(animations, clipName)
  if (!clip) return
  
  const newAction = mixerRef.current.clipAction(clip)
  
  if (currentAction) {
    // 前のアニメーションからスムーズに遷移
    newAction.reset()
    newAction.play()
    newAction.crossFadeFrom(currentAction, 0.3)
  } else {
    newAction.play()
  }
  
  setCurrentAction(newAction)
}

// 使用例
playAnimation('idle')   // 待機モーション
playAnimation('walk')   // 歩行モーション
playAnimation('jump')   // ジャンプモーション
```

#### アニメーションファイルの準備

VRMモデルにアニメーションを追加するには：

1. Blenderなどで作成したアニメーションをGLB形式でエクスポート
2. そのアニメーションファイルを読み込む
3. VRMモデルのボーン構造と一致させる（リターゲティング）

### Mixamoを使ったアニメーション作成

Mixamoは無料で使える3Dキャラクターアニメーションサービスです。

#### 手順

**1. Mixamoにアクセス**
- https://www.mixamo.com にアクセス
- Adobeアカウントでログイン（無料）

**2. VRMモデルをアップロード**
- 「Upload Character」をクリック
- VRMファイルを直接アップロード、または
- VRMをFBX形式に変換してアップロード（推奨）

**3. 自動リギング**
- Mixamoが自動的にボーン構造を認識
- 必要に応じて調整

**4. アニメーションを選択**
- 数百種類のアニメーションから選択
- 例: Walking, Running, Idle, Dancing, Fighting など

**5. ダウンロード**
- Format: FBX for Unity (.fbx)
- Skin: With Skin または Without Skin
- Frames per second: 30
- ダウンロード

**6. FBXをGLBに変換**
- Blenderで開く
- File → Export → glTF 2.0 (.glb)

#### プロジェクトへの統合

アニメーションファイルを `public/animations/` に配置し、以下のように読み込みます：

```typescript
function VRMModel() {
  const [vrm, setVrm] = useState<any>(null)
  const mixerRef = useRef<THREE.AnimationMixer | null>(null)

  useEffect(() => {
    // VRMモデルを読み込み
    const vrmLoader = new GLTFLoader()
    vrmLoader.register((parser) => new VRMLoaderPlugin(parser))
    
    vrmLoader.load('/models/model.vrm', (gltf) => {
      const vrmModel = gltf.userData.vrm
      setVrm(vrmModel)
      
      // Mixamoアニメーションを読み込み
      const animLoader = new GLTFLoader()
      animLoader.load('/animations/walking.glb', (animGltf) => {
        const mixer = new THREE.AnimationMixer(vrmModel.scene)
        mixerRef.current = mixer
        
        // アニメーションを適用
        const clip = animGltf.animations[0]
        const action = mixer.clipAction(clip)
        action.play()
      })
    })
  }, [])

  useFrame((state, delta) => {
    if (vrm) {
      vrm.update(delta)
    }
    if (mixerRef.current) {
      mixerRef.current.update(delta)
    }
  })
}
```

#### 簡単な方法（VRM Converter Hub）

1. https://vrm.dev/vrm_applications/ でVRMツールを探す
2. UniVRMなどでVRMをFBXに変換
3. Mixamoでアニメーション付与
4. 再度VRMに変換

#### 注意点

- VRMのボーン構造とMixamoのボーン構造が完全に一致しない場合がある
- 手や指の細かい動きは調整が必要な場合がある
- 表情（BlendShape）は別途設定が必要

---




# 軽量タグ（シンプルなマーカー）
git tag v1.0.0

# 注釈付きタグ（推奨：作成者、日付、メッセージを含む）
git tag -a v1.0.0 -m "Initial release with WebXR AR and anchor persistence"

# タグをリモートにプッシュ
git push origin v1.0.0

# または、全てのタグを一度にプッシュ
git push origin --tags

# タグの一覧表示
git tag

# タグの詳細情報を表示
git show v1.0.0

# タグの削除（ローカル）
git tag -d v1.0.0

# タグの削除（リモート）
git push origin --delete v1.0.0


git tag -a xr_first_version -m "起動画面、アンカー設定、3Dオブジェクト表示まで"
git push origin --tags

git checkout -b 3d_object_viewer_1
  Switched to a new branch '3d_object_viewer_1'

ブランチ一覧
git branch

別のブランチに切り替え: git checkout ブランチ名

リモートにプッシュ: git push -u origin 3d_object_viewer_1
git push -u origin 3d_object_viewer_1

3d_object_viewer_1
  3Dモデルの表示をしたい


git checkout -b game_1




# 3d_object_viewer_1で作業を完了したら
git add .
git commit -m "作業内容の説明"
# masterブランチに切り替え
git checkout master
# 3d_object_viewer_1の変更をmasterにマージ
git merge 3d_object_viewer_1
# masterをリモートにプッシュ
git push origin master
# 不要になったブランチを削除（オプション）
git branch -d 3d_object_viewer_1


# ファイルだけマージ
# 現在のブランチのファイル内容を別ブランチから取得
git show 3d_object_viewer_1:src/App.tsx > src/App.tsx
git add src/App.tsx
git commit -m "App.tsxを3d_object_viewer_1から取得"


