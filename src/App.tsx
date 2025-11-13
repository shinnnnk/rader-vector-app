import React, { useMemo } from 'react'
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

	return (
		<div className="app">
			<div className="topbar">
				<div>ATC Training Radar</div>
				<div className="row">
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
				</div>
			</div>
			<div className="content">
				<RadarCanvas
					rangeNm={state.rangeNm}
					aircraft={state.aircraft}
					onTapAircraft={(id) => state.setSelectedId(id)}
					onTapEmpty={(r, b) => state.spawnAircraftAt(r, b)}
				/>
				<ControlPanel
					selected={state.selected}
					onHeading={(hdg) => state.selected && state.issueHeading(state.selected.id, hdg)}
					onAltitude={(altH) =>
						state.selected && state.issueAltitude(state.selected.id, altH)
					}
					history={state.history}
				/>
			</div>
		</div>
	)
}


