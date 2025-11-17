import React, { useMemo, useState } from 'react'
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
	const [clearMeasureTrigger, setClearMeasureTrigger] = useState(0)

	return (
		<div className="app">
			<div className="topbar">
				<div>ATC Training Radar</div>
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
					{state.mode === 'measure' && (
						<button onClick={() => setClearMeasureTrigger((prev) => prev + 1)}>
							計測クリア
						</button>
					)}
					<button onClick={state.resetAll}>リセット</button>
					<button
						onClick={() => state.setRangeNm(20)}
						disabled={state.rangeNm === 20}
						aria-pressed={state.rangeNm === 20}
					>
						20 NM
					</button>
					<button
						onClick={() => state.setRangeNm(50)}
						disabled={state.rangeNm === 50}
						aria-pressed={state.rangeNm === 50}
					>
						50 NM
					</button>
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
					onTapEmpty={(r, b) => state.spawnAircraftAt(r, b)}
					clearMeasureTrigger={clearMeasureTrigger}
				/>
				<ControlPanel
					selected={state.selected}
					onHeading={(hdg) => state.selected && state.issueHeading(state.selected.id, hdg)}
					history={state.history}
				/>
			</div>
		</div>
	)
}


