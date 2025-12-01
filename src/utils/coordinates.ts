export type RangeNm = 10 | 20 | 30 | 40 | 50

export function computePxPerNm(viewW: number, viewH: number, rangeNm: RangeNm): number {
	const radiusPx = Math.min(viewW, viewH) * 0.48
	return radiusPx / rangeNm
}

export function degToRad(deg: number): number {
	return (deg * Math.PI) / 180
}
export function radToDeg(rad: number): number {
	return (rad * 180) / Math.PI
}

export function normalizeBearingDeg(b: number): number {
	let v = b % 360
	if (v < 0) v += 360
	return v
}

export function nmToPx(nm: number, pxPerNm: number): number {
	return nm * pxPerNm
}
export function pxToNm(px: number, pxPerNm: number): number {
	return px / pxPerNm
}

export function polarToScreen(
	cx: number,
	cy: number,
	rNm: number,
	bearingDeg: number,
	pxPerNm: number
): { x: number; y: number } {
	const rad = degToRad(bearingDeg)
	const xNm = rNm * Math.sin(rad)
	const yNm = rNm * Math.cos(rad)
	return {
		x: cx + nmToPx(xNm, pxPerNm),
		y: cy - nmToPx(yNm, pxPerNm)
	}
}

export function screenToPolar(
	cx: number,
	cy: number,
	x: number,
	y: number,
	pxPerNm: number
): { rNm: number; bearingDeg: number } {
	const dxPx = x - cx
	const dyPx = cy - y
	const dxNm = pxToNm(dxPx, pxPerNm)
	const dyNm = pxToNm(dyPx, pxPerNm)
	const rNm = Math.hypot(dxNm, dyNm)
	const bearingRad = Math.atan2(dxNm, dyNm)
	const bearingDeg = normalizeBearingDeg(radToDeg(bearingRad))
	return { rNm, bearingDeg }
}


