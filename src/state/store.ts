import { useEffect, useMemo, useRef, useState } from 'react'
import { Aircraft, AircraftId, HistoryItem, TICK_SEC, advanceAircraft } from '../models/aircraft'

const CALLSIGN_PREFIXES = [
	'ADO',
	'APJ',
	'JJP',
	'JTA',
	'SNJ',
	'AAL',
	'AAR',
	'ABL',
	'ACA',
	'AIC',
	'AFL',
	'AFR',
	'AHK',
	'ALK',
	'ANG',
	'ANZ',
	'AMU',
	'AUA',
	'BAW',
	'CAL',
	'CCA',
	'CES',
	'CQH',
	'CLX',
	'CHH',
	'CPA',
	'CSH',
	'CSN',
	'CSZ',
	'DAL',
	'DKH',
	'DLH',
	'EVA',
	'ETD',
	'FDX',
	'FIN',
	'FJI',
	'GIA',
	'GTI',
	'HVN',
	'ITY',
	'JJA',
	'KAL',
	'KLM',
	'MAS',
	'MGL',
	'MSR',
	'PAL',
	'PAC',
	'PIA',
	'QFA',
	'RNA',
	'SAS',
	'SIA',
	'SJX',
	'SWR',
	'THA',
	'THT',
	'THY',
	'UAE',
	'UAL',
	'UPS',
	'UZB',
	'TZP'
];

export type RadarMode = 'spawn' | 'command' | 'measure'

const SPEED_PRESETS = [0.5, 1, 2, 5] as const
export type SimSpeed = (typeof SPEED_PRESETS)[number]

let callsignSeq = 1;
function generateCallsign(existingAircraft: Aircraft[]): string {
	const maxAttempts = 10
	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		const prefix = CALLSIGN_PREFIXES[Math.floor(Math.random() * CALLSIGN_PREFIXES.length)]
		const flightNumber = String(Math.floor(Math.random() * 900) + 100)
		const candidate = `${prefix}${flightNumber}`
		if (!existingAircraft.some((a) => a.id === candidate)) {
			return candidate
		}
	}
	// Fallback
	return `AC${String(callsignSeq++).padStart(3, '0')}`
}

export function useRadarState(initial: Aircraft[]) {
	const [rangeNm, setRangeNm] = useState<50>(50)
	const [mode, setMode] = useState<RadarMode>('spawn')
	const [aircraft, setAircraft] = useState<Aircraft[]>(initial)
	const [selectedId, setSelectedId] = useState<AircraftId | null>(null)
	const [history, setHistory] = useState<HistoryItem[]>([])
	const [simSpeed, setSimSpeed] = useState<SimSpeed>(1)
	const [nextCallsign, setNextCallsign] = useState<string>('')
	const timerRef = useRef<number | null>(null)
	const initialRef = useRef<Aircraft[]>(initial)

	useEffect(() => {
		setNextCallsign(generateCallsign(initial))
	}, [initial])

	// 4秒ごと更新（速度倍率に応じて間隔を調整）
	useEffect(() => {
		if (timerRef.current) window.clearInterval(timerRef.current)
		const intervalMs = (TICK_SEC * 1000) / simSpeed
		timerRef.current = window.setInterval(() => {
			setAircraft((list) =>
				list.map((a) => advanceAircraft(a)).filter((a) => !a.isApproaching || a.rNm > 2.0)
			)
		}, intervalMs)
		return () => {
			if (timerRef.current) window.clearInterval(timerRef.current)
		}
	}, [simSpeed])

	const selected = useMemo(
		() => aircraft.find((a) => a.id === selectedId) ?? null,
		[aircraft, selectedId]
	)

	function issueApproach(id: AircraftId) {
		setAircraft((list) =>
			list.map((a) => (a.id === id ? { ...a, isApproaching: true } : a))
		)
		logHistory(id, 'APPROACH')
	}

	function issueHeading(id: AircraftId, headingDeg: number) {
		setAircraft((list) =>
			list.map((a) =>
				a.id === id
					? { ...a, targetHeadingDeg: headingDeg, turnDelaySec: 1 }
					: a
			)
		)
		let v = Math.round(headingDeg) % 360
		if (v < 0) v += 360
		const disp = v === 0 ? 360 : v
		logHistory(id, `HDG ${String(disp).padStart(3, '0')}`)
	}
	function logHistory(id: AircraftId, action: string) {
		setHistory((h) => [{ timestamp: Date.now(), aircraftId: id, action }, ...h].slice(0, 200))
	}

	function spawnAircraftAt(rNm: number, bearingDeg: number, initialHeadingDeg?: number) {
		const callsign = nextCallsign
		const id = callsign
		const code = String(Math.floor(Math.random() * 1000)).padStart(3, '0')
		const type = ['A320', 'B738', 'B772'][Math.floor(Math.random() * 3)]
		const speedDisplay = 34
		const altitudeH = 25
		const headingDeg =
			typeof initialHeadingDeg === 'number'
				? ((Math.round(initialHeadingDeg) % 360) + 360) % 360
				: bearingDeg
		const ac: Aircraft = {
			id,
			callsign,
			code,
			type,
			rNm,
			bearingDeg,
			headingDeg,
			speedDisplay,
			altitudeH
		}
		setAircraft((list) => {
			const newList = [ac, ...list]
			setNextCallsign(generateCallsign(newList)) // Generate next callsign after update
			return newList
		})
		setSelectedId(id)
		logHistory(
			id,
			`SPAWN r=${rNm.toFixed(1)}nm brg=${Math.round(bearingDeg)} hdg=${Math.round(headingDeg)}`
		)
	}

	function resetAll() {
		setRangeNm(50)
		// 深いコピーで初期状態へ
		const initialAircraft = initialRef.current.map((a) => ({ ...a }))
		setAircraft(initialAircraft)
		setSelectedId(null)
		setHistory([])
		setNextCallsign(generateCallsign(initialAircraft))
	}

	return {
		rangeNm,
		setRangeNm,
		mode,
		setMode,
		aircraft,
		setAircraft,
		selectedId,
		setSelectedId,
		selected,
		history,
		simSpeed,
		speedPresets: SPEED_PRESETS,
		setSimSpeed,
		issueApproach,
		issueHeading,
		resetAll,
		spawnAircraftAt,
		nextCallsign
	}
}


