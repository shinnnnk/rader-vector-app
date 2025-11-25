import React, { useMemo, useState, useRef } from 'react'
import { RadarCanvas } from './components/RadarCanvas'
import { ControlPanel } from './components/ControlPanel'
import { useRadarState } from './state/store'
import { Aircraft } from './models/aircraft'

function seedAircraft(): Aircraft[] {
	// 初期スポーンは行わない（ユーザー操作で配置）
	return []
}

export const App: React.FC = () => {
	const init = useMemo(seedAircraft, [])
	const state = useRadarState(init)
	const [spawnHeadingInput, setSpawnHeadingInput] = useState<string>('')
	const spawnHeadingInputRef = useRef<HTMLInputElement | null>(null)

	const parsedSpawnHeading = useMemo(() => {
		const v = Number(spawnHeadingInput)
		if (!Number.isFinite(v)) return null
		const normalized = ((Math.round(v) % 360) + 360) % 360
		return normalized === 0 ? 360 : normalized
	}, [spawnHeadingInput])

	return (
		<div className="app">
			<div className="topbar">
				<div>
					<span className="title-long">ATC Training Radar</span>
					<span className="title-short">ATC</span>
				</div>
				<div className="row">
					<button
						onClick={() => state.setMode('spawn')}
						disabled={state.mode === 'spawn'}
						aria-pressed={state.mode === 'spawn'}
					>
						生成
					</button>
					<button
						onClick={() => state.setMode('command')}
						disabled={state.mode === 'command'}
						aria-pressed={state.mode === 'command'}
					>
						指示
					</button>
					<button
						onClick={() => state.setMode('measure')}
						disabled={state.mode === 'measure'}
						aria-pressed={state.mode === 'measure'}
					>
						計測
					</button>

					<button onClick={state.resetAll}>Reset</button>
					<div style={{ marginLeft: 16, display: 'flex', gap: 4 }}>
						{state.speedPresets.map((speed) => {
							const label =
								speed === 1
									? '1.0x'
									: Number.isInteger(speed)
									? `${speed.toFixed(0)}x`
									: `${speed.toFixed(1)}x`
							return (
								<button
									key={speed}
									onClick={() => state.setSimSpeed(speed)}
									disabled={state.simSpeed === speed}
									aria-pressed={state.simSpeed === speed}
								>
									{label}
								</button>
							)
						})}
					</div>
				</div>
			</div>
			<div className="content">
				<RadarCanvas
					rangeNm={state.rangeNm}
					mode={state.mode}
					aircraft={state.aircraft}
					onTapAircraft={(id) => state.setSelectedId(id)}
					onTapEmpty={(r, b) =>
						state.spawnAircraftAt(
							r,
							b,
							parsedSpawnHeading === 360 ? 0 : parsedSpawnHeading ?? undefined
						)
					}
				/>
				<ControlPanel
					selected={state.selected}
					onHeading={(hdg) => state.selected && state.issueHeading(state.selected.id, hdg)}
					history={state.history}
					mode={state.mode}
					spawnHeadingInput={spawnHeadingInput}
					setSpawnHeadingInput={setSpawnHeadingInput}
					spawnHeadingInputRef={spawnHeadingInputRef}
					nextCallsign={state.nextCallsign}
				/>
			</div>
		</div>
	)
}


