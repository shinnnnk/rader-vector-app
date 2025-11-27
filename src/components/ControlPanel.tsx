import React, { useMemo, useState, useRef } from 'react'
import { Aircraft } from '../models/aircraft'
import { NumericKeyboard } from './NumericKeyboard'

export interface ControlPanelProps {
	selected: Aircraft | null
	onHeading: (headingDeg: number) => void
	onApproach: () => void
	history: { timestamp: number; aircraftId: string; action: string }[]
	mode: 'spawn' | 'command' | 'measure'
	spawnHeadingInput: string
	setSpawnHeadingInput: React.Dispatch<React.SetStateAction<string>>
	spawnHeadingInputRef: React.RefObject<HTMLInputElement>
	nextCallsign: string
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
	selected,
	onHeading,
	onApproach,
	history,
	mode,
	spawnHeadingInput,
	setSpawnHeadingInput,
	spawnHeadingInputRef,
	nextCallsign
}) => {
	const [heading, setHeading] = useState<string>('')
	const headingInputRef = useRef<HTMLInputElement | null>(null)

	// Dynamic input properties based on mode
	const currentInputRef = mode === 'spawn' ? spawnHeadingInputRef : headingInputRef
	const currentInputValue = mode === 'spawn' ? spawnHeadingInput : heading
	const currentSetInputValue = mode === 'spawn' ? setSpawnHeadingInput : setHeading
	const currentPlaceholder = mode === 'spawn' ? '生成HDG (例: 270)' : 'Heading (0-359)'
	const currentSubmitDisabled = mode === 'spawn' ? spawnHeadingInput === '' : !selected || heading === ''

	const selTitle = useMemo(() => {
		if (!selected) return '未選択'
		return `${selected.callsign} (${selected.code})`
	}, [selected])

	function submitHeadingOrSpawn() {
		const v = Number(currentInputValue)
		if (Number.isFinite(v)) {
			if (mode === 'command') {
				onHeading(((v % 360) + 360) % 360)
			}
			// For spawn mode, the value is just set, no submit action needed here as tap on canvas triggers spawn
		}
		currentSetInputValue('') // Clear input after submit/action
	}

	function handleCommand(command: string) {
		if (command === 'A' && mode === 'command' && selected) {
			onApproach()
		}
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
				{mode === 'spawn' ? (
					<div className="row" style={{ justifyContent: 'space-between' }}>
						<div>次の航空機</div>
						<div>{nextCallsign}</div>
					</div>
				) : (
					<div className="row" style={{ justifyContent: 'space-between' }}>
						<div>選択機</div>
						<div>{selTitle}</div>
					</div>
				)}
				<div className="row">
					<input
						ref={currentInputRef}
						inputMode="none"
						placeholder={currentPlaceholder}
						value={currentInputValue}
						onChange={(e) => currentSetInputValue(e.target.value)}
					/>
					{mode !== 'spawn' && (
						<button onClick={submitHeadingOrSpawn} disabled={currentSubmitDisabled}>
							指示
						</button>
					)}
				</div>
			</div>
			<div className="panel" style={{ paddingTop: 8 }}>
				<NumericKeyboard
					onDigit={(digit) => {
						currentSetInputValue((prev) => (prev.length >= 3 ? prev : prev + digit))
						currentInputRef.current?.focus()
					}}
					onClear={() => {
						currentSetInputValue('')
						currentInputRef.current?.focus()
					}}
					onCommand={handleCommand}
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


