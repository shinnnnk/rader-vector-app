import React, { useMemo, useState } from 'react'
import { Aircraft } from '../models/aircraft'

export interface ControlPanelProps {
	selected: Aircraft | null
	onHeading: (headingDeg: number) => void
	history: { timestamp: number; aircraftId: string; action: string }[]
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ selected, onHeading, history }) => {
	const [heading, setHeading] = useState<string>('')

	const selTitle = useMemo(() => {
		if (!selected) return '未選択'
		return `${selected.callsign} (${selected.code})`
	}, [selected])

	function submitHeading() {
		const v = Number(heading)
		if (Number.isFinite(v)) onHeading(((v % 360) + 360) % 360)
		setHeading('')
	}

	return (
		<div className="sidebar">
			<div className="panel">
				<div className="row" style={{ justifyContent: 'space-between' }}>
					<div>選択機</div>
					<div>{selTitle}</div>
				</div>
				<div className="row">
					<input
						inputMode="numeric"
						placeholder="Heading (0-359)"
						value={heading}
						onChange={(e) => setHeading(e.target.value)}
					/>
					<button onClick={submitHeading} disabled={!selected || heading === ''}>
						指示
					</button>
				</div>
			</div>
			<div className="panel">
				<div style={{ marginBottom: 8, fontWeight: 600 }}>操作履歴</div>
				<div className="history">
					{history.map((h, i) => {
						const dt = new Date(h.timestamp)
						const hh = String(dt.getHours()).padStart(2, '0')
						const mm = String(dt.getMinutes()).padStart(2, '0')
						const ss = String(dt.getSeconds()).padStart(2, '0')
						return (
							<div key={i}>
								{hh}:{mm}:{ss} {h.aircraftId} {h.action}
							</div>
						)
					})}
				</div>
			</div>
			<div className="panel" style={{ fontSize: 12, opacity: 0.8 }}>
				<ul style={{ margin: 0, paddingLeft: 16 }}>
					<li>4秒ごとに全機の針路・速度・高度を更新</li>
					<li>生成モード: 空域クリックで新規スポーン</li>
					<li>指示モード: 機体クリックで選択しHDG指示</li>
					<li>計測モード: ドラッグで距離/方位を計測</li>
				</ul>
			</div>
		</div>
	)
}


