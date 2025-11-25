import React, { useMemo, useState, useRef } from 'react'
import { Aircraft } from '../models/aircraft'
import { NumericKeyboard } from './NumericKeyboard'

export interface ControlPanelProps {
	selected: Aircraft | null
	onHeading: (headingDeg: number) => void
	history: { timestamp: number; aircraftId: string; action: string }[]
	activeInput: 'spawn' | 'command' | null
	setActiveInput: (input: 'spawn' | 'command' | null) => void
	onSpawnDigit: (digit: string) => void
	onSpawnClear: () => void
	onSpawnFocus: () => void
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
	selected,
	onHeading,
	history,
	activeInput,
	setActiveInput,
	onSpawnDigit,
	onSpawnClear,
	onSpawnFocus
}) => {
	const [heading, setHeading] = useState<string>('')
	const headingInputRef = useRef<HTMLInputElement | null>(null)

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
			<div className="panel" style={{ fontSize: 12, opacity: 0.8 }}>
				<ul style={{ margin: 0, paddingLeft: 16 }}>
					<li>4秒ごとに全機の針路・速度・高度を更新</li>
					<li>生成モード: 空域クリックで新規スポーン</li>
					<li>指示モード: 機体クリックで選択しHDG指示</li>
					<li>計測モード: ドラッグで距離/方位を計測</li>
					<li>速度倍率: 0.5x / 1.0x / 2.0x / 5.0x</li>
				</ul>
			</div>
			<div className="panel">
				<div className="row" style={{ justifyContent: 'space-between' }}>
					<div>選択機</div>
					<div>{selTitle}</div>
				</div>
				<div className="row">
					<input
						ref={headingInputRef}
						inputMode="numeric"
						placeholder="Heading (0-359)"
						value={heading}
						onChange={(e) => setHeading(e.target.value)}
						onFocus={() => setActiveInput('command')}
						onBlur={() => {
							// 少し遅延させて、キーボードボタンのクリックを処理してからblur
							setTimeout(() => setActiveInput(null), 200)
						}}
					/>
					<button onClick={submitHeading} disabled={!selected || heading === ''}>
						指示
					</button>
				</div>
			</div>
			<div className="panel" style={{ paddingTop: 8 }}>
				<NumericKeyboard
					onDigit={(digit) => {
						if (activeInput === 'spawn') {
							onSpawnDigit(digit)
							onSpawnFocus()
						} else if (activeInput === 'command') {
							setHeading((prev) => prev + digit)
							headingInputRef.current?.focus()
						}
					}}
					onClear={() => {
						if (activeInput === 'spawn') {
							onSpawnClear()
							onSpawnFocus()
						} else if (activeInput === 'command') {
							setHeading('')
							headingInputRef.current?.focus()
						}
					}}
				/>
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
		</div>
	)
}


