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
	speedDisplay: number // This is the initial speed value, not used in dynamic calculation
	currentSpeedKt?: number // Dynamically calculated current speed
	altitudeH: number // “H”単位（100ft単位）
	// 指示（ヘディングはリードターン考慮で漸近）
	targetHeadingDeg?: number
	turnDelaySec?: number
	pendingAltitudeH?: number
	// 進入モード
	isApproaching?: boolean
}

export interface HistoryItem {
	timestamp: number
	aircraftId: AircraftId
	action: string
}

export const TICK_SEC = 4

/**
 * Calculates speed during final approach based on distance.
 * @param rNm - Radial distance in nautical miles.
 * @returns Speed in knots.
 */
function calculateApproachSpeed(rNm: number): number {
	if (rNm <= 10) {
		// Inside 10NM, reduce speed by 10kt per NM
		return 210 - (10 - rNm) * 10
	}
	if (rNm <= 15) {
		// Inside 15NM (base of the rectangle)
		return 220
	}
	// Default speed when on approach but outside 15NM
	return 230
}

/**
 * Determines the aircraft speed in knots based on its state.
 * @param ac - The aircraft object.
 * @returns Speed in knots.
 */
function calculateCurrentSpeed(ac: Aircraft): number {
	// On final approach course (established on 360deg heading near the southern centerline)
	const isOnFinalCourse =
		ac.isApproaching &&
		Math.abs(shortestAngleDiffDeg(ac.headingDeg, 360)) < 5 &&
		ac.bearingDeg > 170 &&
		ac.bearingDeg < 190

	if (isOnFinalCourse) {
		return calculateApproachSpeed(ac.rNm)
	}

	// Default speed zones
	if (ac.rNm > 50) return 300 // Outside 50NM
	if (ac.rNm > 25) return 240 // Inside 50NM but outside 25NM
	return 230 // Inside 25NM
}

export function advanceAircraft(ac: Aircraft): Aircraft {
	let next: Aircraft = { ...ac }

	// --- Approach Logic ---
	if (next.isApproaching) {
		const finalApproachCourse = 360

		// This block decides if it's time to turn to the final course.
		// It should only run if the aircraft is not already turning to final or established on it.
		const isEstablished = Math.abs(shortestAngleDiffDeg(next.headingDeg, finalApproachCourse)) < 1
		const isTurningToFinal = next.targetHeadingDeg === finalApproachCourse

		if (!isEstablished && !isTurningToFinal) {
			const kt = calculateCurrentSpeed(next)
			// Estimate turn radius in NM based on speed. The formula R = V / (60 * PI) is used.
			const turnRadiusNm = kt / 188.5

			// Calculate the current intercept angle from the current heading.
			const interceptAngle = shortestAngleDiffDeg(next.headingDeg, finalApproachCourse)

			// Calculate the lead distance required to start the turn and roll out on the centerline.
			const turnLeadDistNm = turnRadiusNm * Math.abs(Math.sin(degToRad(interceptAngle)))

			const xNm = next.rNm * Math.sin(degToRad(next.bearingDeg))

			// When the aircraft's distance to the centerline is less than or equal to the calculated lead distance, start the turn.
			if (Math.abs(xNm) <= turnLeadDistNm) {
				next.targetHeadingDeg = finalApproachCourse
				next.turnDelaySec = 1
			}
		}
	}

	// --- Standard Movement ---
	// Heading
	if (typeof next.targetHeadingDeg === 'number') {
		const rateDegPerSec = 3
		const turnWindowSec = Math.max(0, TICK_SEC - (next.turnDelaySec ?? 0))
		const maxDelta = rateDegPerSec * turnWindowSec
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

	// Altitude
	if (typeof next.pendingAltitudeH === 'number') {
		if (next.pendingAltitudeH > next.altitudeH) {
			next.altitudeH += 1
		} else if (next.pendingAltitudeH < next.altitudeH) {
			next.altitudeH -= 1
		}
		if (next.altitudeH === next.pendingAltitudeH) {
			next.pendingAltitudeH = undefined
		}
	}

	// Speed and Position
	const kt = calculateCurrentSpeed(next)
	next.currentSpeedKt = kt
	const hours = TICK_SEC / 3600
	const dNm = kt * hours
	const hdg = degToRad(next.headingDeg)
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


