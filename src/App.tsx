import { Canvas, useFrame } from '@react-three/fiber'
import { createXRStore, XR, XROrigin } from '@react-three/xr'
import { Text } from '@react-three/drei'
import { useState, useRef, useEffect } from 'react'
import * as THREE from 'three'
import './App.css'

const store = createXRStore()

// アンカーをlocalStorageに保存・取得
const ANCHOR_KEY = 'webxr_anchor_data'

function saveAnchorData(position: [number, number, number], quaternion: [number, number, number, number]) {
  const data = { position, quaternion }
  localStorage.setItem(ANCHOR_KEY, JSON.stringify(data))
}

function loadAnchorData() {
  const data = localStorage.getItem(ANCHOR_KEY)
  if (data) {
    try {
      return JSON.parse(data)
    } catch (e) {
      return null
    }
  }
  return null
}

// ゲーム設定
const GAME_WIDTH = 2
const GAME_HEIGHT = 1.5
const PADDLE_WIDTH = 0.1
const PADDLE_HEIGHT = 0.4
const BALL_SIZE = 0.05  // 小さくした
const BALL_SPEED = 0.8  // 遅くした
const PADDLE_SPEED = 2
const AI_SPEED = 1.5    // AIの移動速度

// Audio context for sound effects
let audioContext: AudioContext | null = null

const initAudio = () => {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
}

const playSound = (frequency: number, duration: number, type: OscillatorType = 'sine') => {
  if (!audioContext) initAudio()
  if (!audioContext) return

  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  oscillator.frequency.value = frequency
  oscillator.type = type

  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration)

  oscillator.start(audioContext.currentTime)
  oscillator.stop(audioContext.currentTime + duration)
}

const playPaddleHit = () => playSound(440, 0.1, 'square')
const playWallHit = () => playSound(220, 0.1, 'sine')
const playScore = () => {
  playSound(523, 0.15, 'triangle')
  setTimeout(() => playSound(659, 0.15, 'triangle'), 100)
}

// 3D PONGゲーム（アンカー位置を基準に配置）
function PongGame({ anchorPosition, anchorQuaternion }: { 
  anchorPosition: THREE.Vector3, 
  anchorQuaternion: THREE.Quaternion 
}) {
  // ゲームモード（1人用 or 2人用）
  const [isOnePlayerMode, setIsOnePlayerMode] = useState(true)
  const modeSwitchPressed = useRef(false)
  
  // パドルの位置（画面上の位置）
  const [leftPaddleY, setLeftPaddleY] = useState(0)   // 画面左側（赤）
  const [rightPaddleY, setRightPaddleY] = useState(0) // 画面右側（青）
  
  // ボールの位置と速度
  const [ballPosition, setBallPosition] = useState(new THREE.Vector3(0, 0, 0))
  const ballVelocity = useRef(new THREE.Vector3(BALL_SPEED, BALL_SPEED * 0.5, 0))
  
  // スコア
  const [leftScore, setLeftScore] = useState(0)   // 左側（赤）のスコア
  const [rightScore, setRightScore] = useState(0) // 右側（青）のスコア
  const [isGameOver, setIsGameOver] = useState(false)
  const resetPressed = useRef(false)
  
  // コントローラー入力
  const leftControllerY = useRef(0)  // 左コントローラー
  const rightControllerY = useRef(0) // 右コントローラー

  useFrame((state, delta) => {
    const session = (state.gl as any).xr?.getSession?.()
    
    // コントローラー入力の処理
    if (session) {
      const inputSources = session.inputSources
      if (inputSources && inputSources.length > 0) {
        for (const inputSource of inputSources) {
          if (inputSource.gamepad && inputSource.gamepad.axes.length >= 2) {
            const yAxis = -inputSource.gamepad.axes[3] // 右スティックY軸
            
            if (inputSource.handedness === 'left') {
              leftControllerY.current = yAxis
            } else if (inputSource.handedness === 'right') {
              rightControllerY.current = yAxis
            }
            
            // ゲームオーバー時はBボタン（button[5]）でリセット
            if (isGameOver && inputSource.gamepad.buttons[5]) {
              const bButton = inputSource.gamepad.buttons[5]
              if (bButton.pressed && !resetPressed.current) {
                resetPressed.current = true
                setLeftScore(0)
                setRightScore(0)
                setIsGameOver(false)
                resetBall()
              } else if (!bButton.pressed) {
                resetPressed.current = false
              }
            }
            
            // Aボタン（button[4]）でモード切り替え（ゲーム中のみ）
            if (!isGameOver && inputSource.gamepad.buttons[4]) {
              const aButton = inputSource.gamepad.buttons[4]
              if (aButton.pressed && !modeSwitchPressed.current) {
                modeSwitchPressed.current = true
                setIsOnePlayerMode(prev => !prev)
              } else if (!aButton.pressed) {
                modeSwitchPressed.current = false
              }
            }
          }
        }
      }
    }
    
    // ゲームオーバー時はゲームを停止
    if (isGameOver) return
    
    // パドルの移動
    // 右コントローラー → 左パドル（赤）
    const newLeftY = leftPaddleY + rightControllerY.current * PADDLE_SPEED * delta
    setLeftPaddleY(Math.max(-GAME_HEIGHT / 2 + PADDLE_HEIGHT / 2, Math.min(GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2, newLeftY)))
    
    // 右パドル（青）の移動
    if (isOnePlayerMode) {
      // 1人用モード：AIが右パドルを操作
      const targetY = ballPosition.y
      const diff = targetY - rightPaddleY
      const aiMove = Math.sign(diff) * Math.min(Math.abs(diff), AI_SPEED * delta)
      const newRightY = rightPaddleY + aiMove
      setRightPaddleY(Math.max(-GAME_HEIGHT / 2 + PADDLE_HEIGHT / 2, Math.min(GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2, newRightY)))
    } else {
      // 2人用モード：左コントローラー → 右パドル（青）
      const newRightY = rightPaddleY + leftControllerY.current * PADDLE_SPEED * delta
      setRightPaddleY(Math.max(-GAME_HEIGHT / 2 + PADDLE_HEIGHT / 2, Math.min(GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2, newRightY)))
    }
    
    // ボールの移動
    const newBallPos = ballPosition.clone().add(ballVelocity.current.clone().multiplyScalar(delta))
    
    // 上下の壁との衝突
    if (newBallPos.y > GAME_HEIGHT / 2 - BALL_SIZE / 2 || newBallPos.y < -GAME_HEIGHT / 2 + BALL_SIZE / 2) {
      ballVelocity.current.y *= -1
      playWallHit()
    }
    
    // 左パドルとの衝突
    if (newBallPos.x < -GAME_WIDTH / 2 + PADDLE_WIDTH / 2 + BALL_SIZE / 2 &&
        newBallPos.x > -GAME_WIDTH / 2 &&
        Math.abs(newBallPos.y - leftPaddleY) < PADDLE_HEIGHT / 2) {
      ballVelocity.current.x *= -1.05 // 少しずつ速くする
      ballVelocity.current.y += (newBallPos.y - leftPaddleY) * 0.5 // パドルの当たった位置で角度を変える
      playPaddleHit()
    }
    
    // 右パドルとの衝突
    if (newBallPos.x > GAME_WIDTH / 2 - PADDLE_WIDTH / 2 - BALL_SIZE / 2 &&
        newBallPos.x < GAME_WIDTH / 2 &&
        Math.abs(newBallPos.y - rightPaddleY) < PADDLE_HEIGHT / 2) {
      ballVelocity.current.x *= -1.05
      ballVelocity.current.y += (newBallPos.y - rightPaddleY) * 0.5
      playPaddleHit()
    }
    
    // 得点判定
    if (newBallPos.x < -GAME_WIDTH / 2 - BALL_SIZE) {
      const newScore = rightScore + 1
      setRightScore(newScore)
      playScore()
      if (newScore >= 5) {
        setIsGameOver(true)
      } else {
        resetBall()
      }
    } else if (newBallPos.x > GAME_WIDTH / 2 + BALL_SIZE) {
      const newScore = leftScore + 1
      setLeftScore(newScore)
      playScore()
      if (newScore >= 5) {
        setIsGameOver(true)
      } else {
        resetBall()
      }
    } else {
      setBallPosition(newBallPos)
    }
  })
  
  const resetBall = () => {
    setBallPosition(new THREE.Vector3(0, 0, 0))
    const direction = Math.random() > 0.5 ? 1 : -1
    ballVelocity.current.set(BALL_SPEED * direction, BALL_SPEED * 0.5, 0)
    // AudioContextを初期化（ユーザーインタラクション後に有効化）
    initAudio()
  }

  return (
    <group position={anchorPosition} quaternion={anchorQuaternion}>
      {/* ゲームボードの背景 */}
      <mesh position={[0, GAME_HEIGHT / 2, -0.1]}>
        <planeGeometry args={[GAME_WIDTH + 0.4, GAME_HEIGHT + 0.4]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      
      {/* モード表示 */}
      <group position={[0, GAME_HEIGHT + 0.3, 0]}>
        <mesh>
          <boxGeometry args={[0.4, 0.1, 0.05]} />
          <meshStandardMaterial 
            color={isOnePlayerMode ? "#ffaa00" : "#00aaff"} 
            emissive={isOnePlayerMode ? "#ffaa00" : "#00aaff"} 
            emissiveIntensity={0.5} 
          />
        </mesh>
      </group>
      
      {/* ゲームエリアの枠 */}
      <mesh position={[0, GAME_HEIGHT, 0]}>
        <boxGeometry args={[GAME_WIDTH, 0.05, 0.05]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[GAME_WIDTH, 0.05, 0.05]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      
      {/* 中央線 */}
      <mesh position={[0, GAME_HEIGHT / 2, 0]}>
        <boxGeometry args={[0.02, GAME_HEIGHT, 0.02]} />
        <meshStandardMaterial color="#ffffff" opacity={0.3} transparent />
      </mesh>
      
      {/* 左パドル（赤） */}
      <mesh position={[-GAME_WIDTH / 2 + PADDLE_WIDTH / 2, leftPaddleY + GAME_HEIGHT / 2, 0.05]}>
        <boxGeometry args={[PADDLE_WIDTH, PADDLE_HEIGHT, 0.08]} />
        <meshStandardMaterial color="#ff6b6b" emissive="#ff6b6b" emissiveIntensity={0.3} />
      </mesh>
      
      {/* 右パドル（青） */}
      <mesh position={[GAME_WIDTH / 2 - PADDLE_WIDTH / 2, rightPaddleY + GAME_HEIGHT / 2, 0.05]}>
        <boxGeometry args={[PADDLE_WIDTH, PADDLE_HEIGHT, 0.08]} />
        <meshStandardMaterial color="#4ecdc4" emissive="#4ecdc4" emissiveIntensity={0.3} />
      </mesh>
      
      {/* ボール */}
      <mesh position={[ballPosition.x, ballPosition.y + GAME_HEIGHT / 2, 0.05]}>
        <sphereGeometry args={[BALL_SIZE, 16, 16]} />
        <meshStandardMaterial color="#ffe66d" emissive="#ffe66d" emissiveIntensity={0.8} />
      </mesh>
      
      {/* スコア表示（左側 - 赤） */}
      <group position={[-GAME_WIDTH / 3, GAME_HEIGHT + 0.5, 0]}>
        {[...Array(leftScore)].map((_, i) => (
          <mesh key={i} position={[(i % 5) * 0.15 - 0.3, Math.floor(i / 5) * 0.15, 0]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial color="#ff6b6b" emissive="#ff6b6b" emissiveIntensity={0.5} />
          </mesh>
        ))}
      </group>
      
      {/* スコア表示（右側 - 青） */}
      <group position={[GAME_WIDTH / 3, GAME_HEIGHT + 0.5, 0]}>
        {[...Array(rightScore)].map((_, i) => (
          <mesh key={i} position={[(i % 5) * 0.15 - 0.3, Math.floor(i / 5) * 0.15, 0]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshStandardMaterial color="#4ecdc4" emissive="#4ecdc4" emissiveIntensity={0.5} />
          </mesh>
        ))}
      </group>
      
      {/* ゲームオーバー表示 */}
      {isGameOver && (
        <group position={[0, GAME_HEIGHT / 2, 0.3]} rotation={[0, Math.PI, 0]}>
          {/* 背景パネル */}
          <mesh position={[0, 0, -0.05]}>
            <planeGeometry args={[1.5, 0.8]} />
            <meshStandardMaterial color="#000000" opacity={0.8} transparent side={THREE.DoubleSide} />
          </mesh>
          
          {/* GAME OVER テキスト */}
          <Text
            position={[0, 0.2, 0]}
            fontSize={0.15}
            color="#ff0000"
            anchorX="center"
            anchorY="middle"
            font="./ipaexg.ttf"
            outlineWidth={0.01}
            outlineColor="#ffffff"
          >
            GAME OVER
          </Text>
          
          {/* 勝者表示 */}
          <Text
            position={[0, 0, 0]}
            fontSize={0.1}
            color={leftScore >= 10 ? "#ff6b6b" : "#4ecdc4"}
            anchorX="center"
            anchorY="middle"
            font="./ipaexg.ttf"
            outlineWidth={0.005}
            outlineColor="#ffffff"
          >
            {leftScore >= 10 ? "RIGHT PLAYER WIN!" : "LEFT PLAYER WIN!"}
          </Text>
          
          {/* リセット指示 */}
          <Text
            position={[0, -0.2, 0]}
            fontSize={0.06}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            font="./ipaexg.ttf"
            fillOpacity={Math.sin(Date.now() / 500) * 0.5 + 0.5}
          >
            Press B button to reset
          </Text>
        </group>
      )}
    </group>
  )
}

function Scene() {
  const [anchorPosition, setAnchorPosition] = useState<THREE.Vector3 | null>(null)
  const [anchorQuaternion, setAnchorQuaternion] = useState<THREE.Quaternion | null>(null)
  const reticleRef = useRef<THREE.Group>(null)
  const hitTestSourceRef = useRef<XRHitTestSource | null>(null)
  const triggerPressedRef = useRef(false)

  useEffect(() => {
    // 保存されたアンカーデータを読み込む
    const savedData = loadAnchorData()
    if (savedData) {
      setAnchorPosition(new THREE.Vector3(...savedData.position))
      setAnchorQuaternion(new THREE.Quaternion(...savedData.quaternion))
      console.log('Loaded saved anchor:', savedData)
    }
  }, [])

  useFrame((state) => {
    const session = (state.gl as any).xr?.getSession?.()
    if (!session) return

    // ヒットテストソースの初期化
    if (!hitTestSourceRef.current && session.requestHitTestSource && !anchorPosition) {
      session.requestReferenceSpace('viewer').then((viewerSpace: XRReferenceSpace) => {
        session.requestHitTestSource({ space: viewerSpace }).then((source: XRHitTestSource) => {
          hitTestSourceRef.current = source
        })
      })
    }

    // コントローラのトリガーボタンをチェック
    if (!anchorPosition) {
      const inputSources = session.inputSources
      if (inputSources && inputSources.length > 0) {
        for (const inputSource of inputSources) {
          if (inputSource.gamepad) {
            const triggerButton = inputSource.gamepad.buttons[0]
            
            // トリガーが押された瞬間を検出
            if (triggerButton.pressed && !triggerPressedRef.current) {
              triggerPressedRef.current = true
              
              // レティクルが表示されていればアンカーを設定
              if (reticleRef.current && reticleRef.current.visible) {
                const position = reticleRef.current.position.clone()
                const quaternion = reticleRef.current.quaternion.clone()
                
                setAnchorPosition(position)
                setAnchorQuaternion(quaternion)
                
                // アンカー情報を保存
                saveAnchorData(
                  [position.x, position.y, position.z],
                  [quaternion.x, quaternion.y, quaternion.z, quaternion.w]
                )
                
                console.log('Anchor set at:', position)
              }
            } else if (!triggerButton.pressed) {
              triggerPressedRef.current = false
            }
          }
        }
      }
    }

    // アンカーが設定されていない場合のみヒットテストを実行
    if (!anchorPosition && hitTestSourceRef.current && reticleRef.current) {
      const frame = state.gl.xr.getFrame()
      if (frame) {
        const referenceSpace = (state.gl as any).xr.getReferenceSpace()
        const hitTestResults = frame.getHitTestResults(hitTestSourceRef.current)
        
        if (hitTestResults.length > 0) {
          const hit = hitTestResults[0]
          const pose = hit.getPose(referenceSpace)
          
          if (pose) {
            const matrix = new THREE.Matrix4().fromArray(pose.transform.matrix)
            const position = new THREE.Vector3()
            const quaternion = new THREE.Quaternion()
            const scale = new THREE.Vector3()
            matrix.decompose(position, quaternion, scale)
            
            reticleRef.current.position.copy(position)
            reticleRef.current.quaternion.copy(quaternion)
            reticleRef.current.visible = true
          }
        } else {
          reticleRef.current.visible = false
        }
      }
    }
  })

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[2, 3, 2]} intensity={1} />
      
      {/* レティクル（アンカー未設定時のみ表示） */}
      {!anchorPosition && (
        <group ref={reticleRef} visible={false}>
          {/* リング */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.08, 0.1, 32]} />
            <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
          </mesh>
          {/* 中央の点 */}
          <mesh>
            <sphereGeometry args={[0.01, 16, 16]} />
            <meshBasicMaterial color="#ff0000" />
          </mesh>
          {/* 方向を示す矢印 */}
          <mesh position={[0, 0.05, 0]}>
            <coneGeometry args={[0.02, 0.05, 8]} />
            <meshBasicMaterial color="#00ff00" />
          </mesh>
        </group>
      )}
      
      {/* アンカーが設定されたらゲーム開始 */}
      {anchorPosition && anchorQuaternion && (
        <PongGame anchorPosition={anchorPosition} anchorQuaternion={anchorQuaternion} />
      )}
    </>
  )
}

function App() {
  const clearAnchor = () => {
    localStorage.removeItem(ANCHOR_KEY)
    window.location.reload()
  }

  return (
    <>
      <button onClick={() => store.enterAR()}>Enter AR</button>
      <button onClick={clearAnchor} style={{ left: '20px', transform: 'none' }}>
        Reset Game
      </button>
      <Canvas camera={{ position: [0, 0, 8], fov: 60 }}>
        <XR store={store}>
          <XROrigin position={[0, 0, 0]} />
          <Scene />
        </XR>
      </Canvas>
    </>
  )
}

export default App
