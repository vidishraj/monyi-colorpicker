import { useState, useRef, useEffect, useCallback } from 'react'
import tinycolor from 'tinycolor2'
import './App.css'

function App() {
  const [hue, setHue] = useState(0)
  const [saturation, setSaturation] = useState(100)
  const [lightness, setLightness] = useState(50)
  const [displayHue, setDisplayHue] = useState(0)
  const [eyedropperActive, setEyedropperActive] = useState(false)
  const [backgroundColors, setBackgroundColors] = useState<string[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const backgroundCanvasRef = useRef<HTMLCanvasElement>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Don't generate background on mount - only when eyedropper is activated

  const generateRandomBackground = () => {
    const colors: string[] = []
    for (let i = 0; i < 5; i++) {
      const randomHue = Math.random() * 360
      colors.push(`hsl(${randomHue}, 100%, 50%)`)
    }
    setBackgroundColors(colors)
  }

  // Draw background canvas with gradient
  useEffect(() => {
    const canvas = backgroundCanvasRef.current
    if (!canvas || backgroundColors.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // Create a rainbow gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height)

    backgroundColors.forEach((color, index) => {
      const stop = index / (backgroundColors.length - 1)
      gradient.addColorStop(stop, color)
    })

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
  }, [backgroundColors])

  // Get current color from display hue (debounced)
  const currentColor = tinycolor({ h: displayHue, s: saturation, l: lightness })
  const hex = currentColor.toHexString().toUpperCase()
  const rgb = currentColor.toRgb()

  // Draw gradient canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // Create vertical gradient (lightness from top to bottom)
    for (let y = 0; y < height; y++) {
      const lightValue = 100 - (y / height) * 100

      // Create horizontal gradient (saturation from left to right)
      const gradientH = ctx.createLinearGradient(0, y, width, y)
      gradientH.addColorStop(0, `hsl(${displayHue}, 0%, ${lightValue}%)`)
      gradientH.addColorStop(1, `hsl(${displayHue}, 100%, ${lightValue}%)`)

      ctx.fillStyle = gradientH
      ctx.fillRect(0, y, width, 1)
    }
  }, [displayHue])

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Use the displayed size (rect) not the canvas size for accurate positioning
    const s = Math.max(0, Math.min(100, (x / rect.width) * 100))
    const l = Math.max(0, Math.min(100, 100 - (y / rect.height) * 100))

    setSaturation(s)
    setLightness(l)
  }, [])

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!e.buttons) return
    handleCanvasClick(e)
  }, [handleCanvasClick])

  const handleHueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newHue = parseFloat(e.target.value)
    setHue(newHue)

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set new debounce timer - update display after 50ms
    debounceTimerRef.current = setTimeout(() => {
      setDisplayHue(newHue)
    }, 20)
  }, [])

  const handleHexChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const color = tinycolor(e.target.value)
    if (color.isValid()) {
      const hsl = color.toHsl()
      setHue(hsl.h)
      setSaturation(hsl.s * 100)  // Convert from 0-1 to 0-100
      setLightness(hsl.l * 100)   // Convert from 0-1 to 0-100
      setDisplayHue(hsl.h)
    }
  }, [])

  const pickColorFromBackground = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = backgroundCanvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const imageData = ctx.getImageData(x, y, 1, 1)
    const data = imageData.data

    const color = tinycolor(`rgb(${data[0]}, ${data[1]}, ${data[2]})`)
    const hsl = color.toHsl()

    // tinycolor returns s and l in 0-1 scale, we need 0-100
    let newHue = hsl.h || 0
    let newSaturation = isNaN(hsl.s) ? 100 : hsl.s * 100
    let newLightness = isNaN(hsl.l) ? 50 : hsl.l * 100

    setHue(newHue)
    setSaturation(newSaturation)
    setLightness(newLightness)
    setDisplayHue(newHue)
    setEyedropperActive(false)
  }, [])

  const handlePickerButtonClick = useCallback(() => {
    if (!eyedropperActive) {
      // Generate new random background when activating eyedropper
      generateRandomBackground()
    }
    setEyedropperActive(!eyedropperActive)
  }, [eyedropperActive])

  const [presetColors, setPresetColors] = useState([
    { h: 0, s: 0, l: 100 },    // White
    { h: 0, s: 100, l: 50 },   // Red
    { h: 0, s: 100, l: 75 },   // Light red/pink
    { h: 300, s: 100, l: 75 }, // Light purple
    { h: 120, s: 100, l: 75 }, // Light green
    { h: 60, s: 100, l: 75 },  // Light yellow
    { h: 0, s: 0, l: 85 },     // Light gray
    { h: 0, s: 0, l: 90 }      // Very light gray
  ])

  const refreshPresetColors = useCallback(() => {
    const newColors = Array.from({ length: 8 }, () => ({
      h: Math.random() * 360,
      s: Math.random() * 100,
      l: Math.random() * 100
    }))
    setPresetColors(newColors)
  }, [])

  return (
    <div className="app">
      {/* Rainbow background */}
      <canvas
        ref={backgroundCanvasRef}
        className={`background-canvas ${eyedropperActive ? 'active' : ''}`}
        width={window.innerWidth}
        height={window.innerHeight}
        onClick={eyedropperActive ? pickColorFromBackground : undefined}
      />

      <div className="container">
        <div className="color-picker-card">
          {/* Canvas wrapper for selector positioning */}
          <div style={{ position: 'relative', width: '100%' }}>
            {/* Main gradient canvas */}
            <canvas
              ref={canvasRef}
              className="color-canvas"
              width={380}
              height={340}
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMouseMove}
              onTouchMove={(e) => {
                const touch = e.touches[0]
                const syntheticEvent = {
                  clientX: touch.clientX,
                  clientY: touch.clientY,
                  buttons: 1
                } as React.MouseEvent<HTMLCanvasElement>
                handleCanvasClick(syntheticEvent)
              }}
            />

            {/* Selector circle */}
            <div
              className="color-selector"
              style={{
                left: `${(saturation / 100) * 100}%`,
                top: `${(100 - lightness)}%`,
                background: hex,
                position: 'absolute'
              }}
            />
          </div>

          {/* Hue slider */}
          <div className="hue-slider-wrapper">
            <input
              type="range"
              min="0"
              max="360"
              value={hue}
              onChange={handleHueChange}
              className="hue-slider"
            />
            <div
              className="hue-selector"
              style={{
                left: `${(hue / 360) * 100}%`,
                background: `hsl(${hue}, 100%, 50%)`
              }}
            />
          </div>

          {/* Presets and controls */}
          <div className="controls-section">
            <button
              className={`picker-button ${eyedropperActive ? 'active' : ''}`}
              onClick={handlePickerButtonClick}
              title="Pick color from background"
            >
              <span className="picker-icon">✎</span>
            </button>

            <div className="preset-section">
              <div className="preset-colors">
                {presetColors.map((color, idx) => {
                  const presetColor = tinycolor({ h: color.h, s: color.s, l: color.l })
                  return (
                    <div
                      key={idx}
                      className="preset-dot"
                      style={{ backgroundColor: presetColor.toHexString() }}
                      onClick={() => {
                        setHue(color.h)
                        setSaturation(color.s)
                        setLightness(color.l)
                        setDisplayHue(color.h)
                      }}
                    />
                  )
                })}
              </div>
              <button className="refresh-button" onClick={refreshPresetColors} title="Randomize preset colors">
                <span className="refresh-icon">🔄</span>
              </button>
            </div>
          </div>

          {/* Color values */}
          <div className="color-values">
            <div className="value-group">
              <label>HEX</label>
              <input
                type="text"
                value={hex}
                onChange={handleHexChange}
                maxLength={7}
              />
            </div>
            <div className="value-group">
              <label>R</label>
              <input type="text" value={Math.round(rgb.r)} readOnly />
            </div>
            <div className="value-group">
              <label>G</label>
              <input type="text" value={Math.round(rgb.g)} readOnly />
            </div>
            <div className="value-group">
              <label>B</label>
              <input type="text" value={Math.round(rgb.b)} readOnly />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
