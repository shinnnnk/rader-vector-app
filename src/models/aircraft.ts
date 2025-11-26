export type AircraftId = string

export interface Aircraft {
	id: AircraftId
	callsign: string
	code: string // 3桁 “030” など
	type: string // “B772” など
	// 位置（極座標、原点=画面中心）
	rNm: number
	bearingDeg: number // 北=0 時計回り
	// 運動
	headingDeg: number // 現在針路（真方位）
	speedDisplay: number // 例: 36（= 360kt と解釈） - この値は初期値としてのみ使用され、速度は動的に決定される
	currentSpeedKt?: number // 動的に計算された現在の速度
	altitudeH: number // “H”単位（100ft単位）
	// 指示（ヘディングはリードターン考慮で漸近）
	targetHeadingDeg?: number
	turnDelaySec?: number
	pendingAltitudeH?: number
}

export interface HistoryItem {
	timestamp: number
	aircraftId: AircraftId
	action: string
}

export const TICK_SEC = 4

/**
 * Determines the aircraft speed in knots based on its radial distance (rNm).
 * @param rNm Radial distance from the radar center in nautical miles.
 * @returns Speed in knots.
 */
function getSpeedByNm(rNm: number): number {
	if (rNm > 50) return 300 // Outside 50NM
	if (rNm > 25) return 240 // Inside 50NM but outside 25NM
	return 230 // Inside 25NM
}

export function advanceAircraft(ac: Aircraft): Aircraft {
	const next: Aircraft = { ...ac }
	// ヘディング：リードターン（指示後1秒遅延で3°/s）
	if (typeof next.targetHeadingDeg === 'number') {
		const rateDegPerSec = 3
		const turnWindowSec = Math.max(0, TICK_SEC - (next.turnDelaySec ?? 0))
		const maxDelta = rateDegPerSec * turnWindowSec
		// 遅延消化
		const remaining = Math.max(0, (next.turnDelaySec ?? 0) - TICK_SEC)
		next.turnDelaySec = remaining > 0 ? remaining : 0

		const delta = shortestAngleDiffDeg(next.headingDeg, next.targetHeadingDeg)
		if (Math.abs(delta) <= maxDelta + 1e-6) {
			next.headingDeg = normalize360(next.targetHeadingDeg)
			next.targetHeadingDeg = undefined
			next.turnDelaySec = undefined
		} else {
			const step = clamp(delta, -maxDelta, maxDelta)
			next.headingDeg = normalize360(next.headingDeg + step)
		}
	}
	if (typeof next.pendingAltitudeH === 'number') {
		// 段階的に変化：1H/ティック（=約1500fpm相当）
		if (next.pendingAltitudeH > next.altitudeH) {
			next.altitudeH += 1
		} else if (next.pendingAltitudeH < next.altitudeH) {
			next.altitudeH -= 1
		}
		// 目標到達で解除
		if (next.altitudeH === next.pendingAltitudeH) {
			next.pendingAltitudeH = undefined
		}
	}
	// 速度→移動距離（NM）
	const kt = getSpeedByNm(next.rNm) // 動的に速度を決定
	next.currentSpeedKt = kt // 現在速度を更新
	const hours = TICK_SEC / 3600
	const dNm = kt * hours
	// 見かけ上：針路に沿って方位・半径を直交に変換して並進
	// r/bearingのまま更新するより直交で更新して再変換の方が自然
	const hdg = degToRad(next.headingDeg)
	// 直交（北=0, 東=+）
	let xNm = next.rNm * Math.sin(degToRad(next.bearingDeg))
	let yNm = next.rNm * Math.cos(degToRad(next.bearingDeg))
	xNm += dNm * Math.sin(hdg)
	yNm += dNm * Math.cos(hdg)
	const rNm = Math.hypot(xNm, yNm)
	const bearingDeg = normalize360(radToDeg(Math.atan2(xNm, yNm)))
	next.rNm = rNm
	next.bearingDeg = bearingDeg
	return next
}

export function normalize360(deg: number): number {
	let v = deg % 360
	if (v < 0) v += 360
	return v
}

export function shortestAngleDiffDeg(fromDeg: number, toDeg: number): number {
	let diff = normalize360(toDeg) - normalize360(fromDeg)
	if (diff > 180) diff -= 360
	if (diff < -180) diff += 360
	return diff
}

export function clamp(v: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, v))
}

export function degToRad(deg: number): number {
	return (deg * Math.PI) / 180
}
export function radToDeg(rad: number): number {
	return (rad * 180) / Math.PI
}


