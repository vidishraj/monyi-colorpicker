import { useState, useRef, useEffect, useCallback } from 'react'
import tinycolor from 'tinycolor2'
import './App.css'

// Helper function to convert RGB to HEX
const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('').toUpperCase()
}

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

  const [hexError, setHexError] = useState(false)
  const [rError, setRError] = useState(false)
  const [gError, setGError] = useState(false)
  const [bError, setBError] = useState(false)
  const [hexInputValue, setHexInputValue] = useState(hex)
  const [rInputValue, setRInputValue] = useState(Math.round(rgb.r).toString())
  const [gInputValue, setGInputValue] = useState(Math.round(rgb.g).toString())
  const [bInputValue, setBInputValue] = useState(Math.round(rgb.b).toString())

  const handleHexInput = (value: string) => {
    // Update local state immediately for responsive UI
    setHexInputValue(value)

    // Allow free editing - convert to uppercase
    let hexValue = value.toUpperCase()

    // Auto-add # if not present and has content
    if (hexValue.length > 0 && !hexValue.startsWith('#')) {
      hexValue = '#' + hexValue
    }

    // Check if it's valid (must be exactly 7 chars with format #XXXXXX)
    const isValid = hexValue.length === 7 && /^#[0-9A-F]{6}$/.test(hexValue)

    if (isValid) {
      setHexError(false)
      const color = tinycolor(hexValue)
      if (color.isValid()) {
        const hsl = color.toHsl()
        setHue(hsl.h || 0)
        setSaturation(hsl.s * 100)
        setLightness(hsl.l * 100)
        setDisplayHue(hsl.h || 0)
      }
    } else if (hexValue.length > 0 && hexValue !== '#') {
      // Show error if user has typed something but it's not valid
      setHexError(true)
    } else {
      setHexError(false)
    }
  }

  const handleRgbInput = (channel: 'r' | 'g' | 'b', value: string) => {
    // Update local state immediately
    if (channel === 'r') {
      setRInputValue(value)
    } else if (channel === 'g') {
      setGInputValue(value)
    } else {
      setBInputValue(value)
    }

    // Allow free editing
    const num = value === '' ? 0 : parseInt(value, 10)

    // Check if valid (0-255)
    const isValid = !isNaN(num) && num >= 0 && num <= 255

    if (channel === 'r') {
      setRError(!isValid && value !== '')
    } else if (channel === 'g') {
      setGError(!isValid && value !== '')
    } else {
      setBError(!isValid && value !== '')
    }

    // Only update color if valid
    if (isValid && value !== '') {
      const r = channel === 'r' ? num : Math.round(rgb.r)
      const g = channel === 'g' ? num : Math.round(rgb.g)
      const b = channel === 'b' ? num : Math.round(rgb.b)

      const hexValue = rgbToHex(r, g, b)
      const color = tinycolor(hexValue)
      const hsl = color.toHsl()

      setHue(hsl.h || 0)
      setSaturation(hsl.s * 100)
      setLightness(hsl.l * 100)
      setDisplayHue(hsl.h || 0)
    }
  }

  // Sync input values when color changes from other sources
  useEffect(() => {
    setHexInputValue(hex)
    setRInputValue(Math.round(rgb.r).toString())
    setGInputValue(Math.round(rgb.g).toString())
    setBInputValue(Math.round(rgb.b).toString())
  }, [hex, rgb.r, rgb.g, rgb.b])

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
                value={hexInputValue}
                onChange={(e) => handleHexInput(e.target.value)}
                maxLength={7}
                placeholder="#000000"
                className={hexError ? 'error' : ''}
              />
            </div>
            <div className="value-group">
              <label>R</label>
              <input
                type="text"
                inputMode="numeric"
                value={rInputValue}
                onChange={(e) => handleRgbInput('r', e.target.value)}
                className={rError ? 'error' : ''}
              />
            </div>
            <div className="value-group">
              <label>G</label>
              <input
                type="text"
                inputMode="numeric"
                value={gInputValue}
                onChange={(e) => handleRgbInput('g', e.target.value)}
                className={gError ? 'error' : ''}
              />
            </div>
            <div className="value-group">
              <label>B</label>
              <input
                type="text"
                inputMode="numeric"
                value={bInputValue}
                onChange={(e) => handleRgbInput('b', e.target.value)}
                className={bError ? 'error' : ''}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
