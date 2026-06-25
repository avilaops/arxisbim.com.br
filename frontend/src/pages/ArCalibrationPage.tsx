import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function ArCalibrationPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'intro' | 'camera' | 'ground' | 'environment' | 'complete'>('intro')
  const [calibrationData, setCalibrationData] = useState({
    cameraHeight: 170,
    groundPlane: false,
    lighting: 'auto',
  })

  function handleNext() {
    const steps: Array<'intro' | 'camera' | 'ground' | 'environment' | 'complete'> = [
      'intro',
      'camera',
      'ground',
      'environment',
      'complete',
    ]
    const currentIndex = steps.indexOf(step)
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1])
    }
  }

  function handleComplete() {
    localStorage.setItem('arxisvr_ar_calibrated', 'true')
    navigate('/app')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div style={{ width: '100%', maxWidth: '500px' }}>
        {/* Progress */}
        <div style={{ marginBottom: '32px' }}>
          <div
            style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '12px',
            }}
          >
            {(['intro', 'camera', 'ground', 'environment', 'complete'] as const).map((s, idx) => (
              <div
                key={s}
                style={{
                  height: '4px',
                  flex: 1,
                  background: ['intro', 'camera', 'ground', 'environment', 'complete'].indexOf(step) >= idx
                    ? 'var(--c-blue)'
                    : 'var(--c-surface3)',
                  borderRadius: '2px',
                  transition: 'background .3s',
                }}
              ></div>
            ))}
          </div>
          <p style={{ fontSize: '11px', color: 'var(--c-text3)' }}>
            Passo {['intro', 'camera', 'ground', 'environment', 'complete'].indexOf(step) + 1} de 5
          </p>
        </div>

        {/* Content */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          {step === 'intro' && (
            <>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📱</div>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--c-text)', marginBottom: '8px' }}>
                Calibrar AR
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--c-text2)', marginBottom: '20px' }}>
                Vamos calibrar sua experiência de realidade aumentada para que os modelos BIM apareçam com o
                tamanho e posição corretos no seu espaço.
              </p>
            </>
          )}

          {step === 'camera' && (
            <>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📷</div>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--c-text)', marginBottom: '8px' }}>
                Altura da câmera
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--c-text2)', marginBottom: '20px' }}>
                Qual é a altura de seus olhos do chão?
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="range"
                  min="100"
                  max="250"
                  value={calibrationData.cameraHeight}
                  onChange={(e) =>
                    setCalibrationData({ ...calibrationData, cameraHeight: parseInt(e.target.value) })
                  }
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--c-blue)', minWidth: '50px' }}>
                  {calibrationData.cameraHeight} cm
                </span>
              </div>
            </>
          )}

          {step === 'ground' && (
            <>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏠</div>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--c-text)', marginBottom: '8px' }}>
                Plano do chão
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--c-text2)', marginBottom: '20px' }}>
                Aponte para o chão e clique para capturar o plano de referência.
              </p>
              <button
                style={{
                  padding: '10px 16px',
                  background: 'var(--c-blue)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--r)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  width: '100%',
                  fontFamily: 'inherit',
                }}
                onClick={() => setCalibrationData({ ...calibrationData, groundPlane: true })}
              >
                {calibrationData.groundPlane ? '✓ Plano capturado' : 'Capturar plano'}
              </button>
            </>
          )}

          {step === 'environment' && (
            <>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>💡</div>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--c-text)', marginBottom: '8px' }}>
                Iluminação
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--c-text2)', marginBottom: '20px' }}>
                Como é a iluminação do ambiente?
              </p>
              <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                {(['auto', 'bright', 'dark'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setCalibrationData({ ...calibrationData, lighting: mode })}
                    style={{
                      padding: '10px 16px',
                      background: calibrationData.lighting === mode ? 'var(--c-blue)' : 'var(--c-surface2)',
                      color: calibrationData.lighting === mode ? '#fff' : 'var(--c-text)',
                      border: '1px solid ' + (calibrationData.lighting === mode ? 'var(--c-blue)' : 'var(--c-border)'),
                      borderRadius: 'var(--r)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      textTransform: 'capitalize',
                    }}
                  >
                    {mode === 'auto' ? 'Automático' : mode === 'bright' ? 'Brilhante' : 'Escuro'}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 'complete' && (
            <>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--c-green)', marginBottom: '8px' }}>
                Calibração concluída!
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--c-text2)' }}>
                Sua experiência AR foi calibrada com sucesso. Agora você pode visualizar modelos BIM em escala
                real no seu espaço.
              </p>
            </>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {step !== 'intro' && (
            <button
              onClick={() => {
                const steps: Array<'intro' | 'camera' | 'ground' | 'environment' | 'complete'> = [
                  'intro',
                  'camera',
                  'ground',
                  'environment',
                  'complete',
                ]
                const currentIndex = steps.indexOf(step)
                if (currentIndex > 0) {
                  setStep(steps[currentIndex - 1])
                }
              }}
              style={{
                flex: 1,
                padding: '10px 16px',
                background: 'transparent',
                color: 'var(--c-blue)',
                border: '1px solid var(--c-blue)',
                borderRadius: 'var(--r)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Voltar
            </button>
          )}

          {step !== 'complete' && (
            <button
              onClick={handleNext}
              style={{
                flex: 1,
                padding: '10px 16px',
                background: 'var(--c-blue)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--r)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Próximo
            </button>
          )}

          {step === 'complete' && (
            <button
              onClick={handleComplete}
              style={{
                width: '100%',
                padding: '10px 16px',
                background: 'var(--c-blue)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--r)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Começar a usar AR
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
