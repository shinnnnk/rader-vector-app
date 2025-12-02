import React, { useEffect, useMemo, useRef, useState } from 'react'
import { computePxPerNm, polarToScreen, RangeNm, screenToPolar } from '../utils/coordinates'
import { Aircraft } from '../models/aircraft'
import { RadarMode } from '../state/store'

export interface RadarCanvasProps {
	rangeNm: RangeNm
	mode: RadarMode
	aircraft: Aircraft[]
	onTapAircraft?: (id: string) => void
	onTapEmpty?: (rNm: number, bearingDeg: number) => void
}

export const RadarCanvas: React.FC<RadarCanvasProps> = ({ rangeNm, mode, aircraft, onTapAircraft, onTapEmpty }) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null)
	const containerRef = useRef<HTMLDivElement | null>(null)
	const dpr = useMemo(() => window.devicePixelRatio || 1, [])
	const halfSquarePx = mmToCanvasPx(1, dpr) / 2
	const triangleSize = halfSquarePx * 2.5
	const [measureStart, setMeasureStart] = useState<{ x: number; y: number } | null>(null)
	const [measureCurrent, setMeasureCurrent] = useState<{ x: number; y: number } | null>(null)
	const isDraggingRef = useRef(false)

	const draw = useMemo(
		() => () => {
			const canvas = canvasRef.current
			if (!canvas) return
			const ctx = canvas.getContext('2d')
			if (!ctx) return
			const width = canvas.width
			const height = canvas.height
			const cx = width / 2
			const cy = height / 2
			const pxPerNm = computePxPerNm(width / dpr, height / dpr, rangeNm) * dpr

			// clear
			ctx.clearRect(0, 0, width, height)
			ctx.fillStyle = '#000000'
			ctx.fillRect(0, 0, width, height)

			// grid rings
			ctx.strokeStyle = 'rgba(47,220,123,0.35)'
			ctx.lineWidth = 1 * dpr
			const steps = [0, 10, 20, 30, 40, 50]
			for (const nm of steps) {
				const r = nm * pxPerNm
				ctx.beginPath()
				ctx.arc(cx, cy, r, 0, Math.PI * 2)
				ctx.stroke()
			}

			// Speed labels (飛行速度の凡例)
			ctx.save()
			ctx.fillStyle = 'rgba(120,170,255,0.95)'
			ctx.font = `${10 * dpr}px ui-monospace, SFMono-Regular, Menlo, Consolas, Monaco`
			ctx.textAlign = 'center'
			ctx.textBaseline = 'middle'
			// 速度15: 15NM円上の225°位置に配置
			const pSpeed15 = polarToScreen(cx, cy, 15, 225, pxPerNm)
			ctx.fillText('15', pSpeed15.x, pSpeed15.y)
			// 速度30: 25NM円上の120°と240°位置に配置（内側の真ん中あたり）
			const pSpeed30_1 = polarToScreen(cx, cy, 25, 120, pxPerNm)
			ctx.fillText('30', pSpeed30_1.x, pSpeed30_1.y)
			const pSpeed30_2 = polarToScreen(cx, cy, 25, 240, pxPerNm)
			ctx.fillText('30', pSpeed30_2.x, pSpeed30_2.y)
			// 速度35: 17NM円上の10°位置に配置
			const pSpeed35 = polarToScreen(cx, cy, 17, 10, pxPerNm)
			ctx.fillText('35', pSpeed35.x, pSpeed35.y)
			// 速度40: 32NM円上の197°位置に配置
			const pSpeed40 = polarToScreen(cx, cy, 32, 197, pxPerNm)
			ctx.fillText('40', pSpeed40.x, pSpeed40.y)
			// 速度50: 45NM円上の190°位置に配置
			const pSpeed50 = polarToScreen(cx, cy, 45, 190, pxPerNm)
			ctx.fillText('50', pSpeed50.x, pSpeed50.y)
			// 速度60: 45NM円上の315°位置に配置
			const pSpeed60 = polarToScreen(cx, cy, 45, 315, pxPerNm)
			ctx.fillText('60', pSpeed60.x, pSpeed60.y)
			// 速度70: 37NM円上の63°位置に配置
			const pSpeed70 = polarToScreen(cx, cy, 37, 63, pxPerNm)
			ctx.fillText('70', pSpeed70.x, pSpeed70.y)
			ctx.restore()

			// PCA overlay
			for (let i = 1, nm = 10; nm <= 80; i++, nm += 10) {
				const r = nm * pxPerNm
				if (i === 5) {
					ctx.strokeStyle = 'rgba(60,120,255,0.95)' // 濃い青
					ctx.lineWidth = 2 * dpr
				} else {
					ctx.strokeStyle = 'rgba(120,170,255,0.45)'
					ctx.lineWidth = 1 * dpr
				}
				ctx.beginPath()
				ctx.arc(cx, cy, r, 0, Math.PI * 2)
				ctx.stroke()
			}
			const shapeBearingNorth0 = 180
			drawRadialRectangle(ctx, cx, cy, pxPerNm, shapeBearingNorth0, 5, 15, 2, 'rgba(120,170,255,0.8)')

			// --- START: Triangles in and around Southern Rectangle ---
			const southernRectCenterPt = polarToScreen(cx, cy, 10, 180, pxPerNm)
			const southernRectAboveCenterPt = polarToScreen(cx, cy, 8, 180, pxPerNm)
			const southernRectBottomCenterPt = polarToScreen(cx, cy, 15, 180, pxPerNm)

			drawTriangle(ctx, southernRectCenterPt.x, southernRectCenterPt.y, triangleSize, 0) // Pointing up
			drawTriangle(ctx, southernRectAboveCenterPt.x, southernRectAboveCenterPt.y, triangleSize, 0) // Pointing up
			drawTriangle(ctx, southernRectBottomCenterPt.x, southernRectBottomCenterPt.y, triangleSize, 0) // Pointing up
			// --- END: Triangles in and around Southern Rectangle ---

			// --- Modified "Baumkuchen" ---
			const centerRadiusNm = 20
			const thicknessNm = 5
			const arcLengthNm = 20
			const arcAngleDeg = (arcLengthNm / centerRadiusNm) * (180 / Math.PI)
			const start = shapeBearingNorth0 - arcAngleDeg / 2
			const end = shapeBearingNorth0 + arcAngleDeg / 2
			ctx.save()
			ctx.strokeStyle = 'rgba(120,170,255,0.8)'
			ctx.lineWidth = 1 * dpr
			drawArcSegment(ctx, cx, cy, pxPerNm, centerRadiusNm, start, end)
			drawArcSegment(ctx, cx, cy, pxPerNm, centerRadiusNm + thicknessNm, start, end)
			drawRadial(ctx, cx, cy, pxPerNm, start, centerRadiusNm, centerRadiusNm + thicknessNm)
			drawRadial(ctx, cx, cy, pxPerNm, end, centerRadiusNm, centerRadiusNm + thicknessNm)

			// "20" label inside (右側にずらす)
			const labelPos = polarToScreen(cx, cy, centerRadiusNm + thicknessNm / 2, shapeBearingNorth0 - 5, pxPerNm)
			ctx.fillStyle = 'rgba(120,170,255,0.95)'
			ctx.font = `${12 * dpr}px ui-monospace, SFMono-Regular, Menlo, Consolas, Monaco`
			ctx.textAlign = 'center'
			ctx.textBaseline = 'middle'
			ctx.fillText('20', labelPos.x, labelPos.y)
			ctx.restore()

			const rectCenterNm = { x: 0, y: -((5 + 15) / 2) }
			drawDashedSegmentFromNm(ctx, cx, cy, pxPerNm, rectCenterNm, 200, 20.41, dpr)
			drawDashedSegmentFromNm(ctx, cx, cy, pxPerNm, rectCenterNm, 160, 20.41, dpr)
			const offsetAnchorNm = { x: rectCenterNm.x, y: rectCenterNm.y - 2 }
			drawDashedSegmentFromNm(ctx, cx, cy, pxPerNm, offsetAnchorNm, 210, 18.8, dpr)
			drawDashedSegmentFromNm(ctx, cx, cy, pxPerNm, offsetAnchorNm, 150, 18.8, dpr)

			// --- START: Corrected drawing logic for user request ---
			const endRadiusNm = 50

			// Define start points in NM coordinates (x East, y North)
			const southernSquareStartNm = { r: 31, b: 180 }
			const southernSquareStartNmX = southernSquareStartNm.r * Math.sin((southernSquareStartNm.b * Math.PI) / 180)
			const southernSquareStartNmY = southernSquareStartNm.r * Math.cos((southernSquareStartNm.b * Math.PI) / 180)
			const southernSquareStartPointNm = { x: southernSquareStartNmX, y: southernSquareStartNmY }
			const southernSquareCenterPt = nmToScreen(cx, cy, pxPerNm, southernSquareStartPointNm)

			const point064_33_StartNm = { r: 33, b: 64 }
			const point064_33_StartNmX = point064_33_StartNm.r * Math.sin((point064_33_StartNm.b * Math.PI) / 180)
			const point064_33_StartNmY = point064_33_StartNm.r * Math.cos((point064_33_StartNm.b * Math.PI) / 180)
			const point064_33_StartPointNm = { x: point064_33_StartNmX, y: point064_33_StartNmY }
			const point064_33_Pt = nmToScreen(cx, cy, pxPerNm, point064_33_StartPointNm)

			// Draw the squares at start points
			ctx.save()
			ctx.strokeStyle = 'rgba(255,255,255,0.95)'
			ctx.lineWidth = 1 * dpr
			ctx.strokeRect(
				southernSquareCenterPt.x - halfSquarePx,
				southernSquareCenterPt.y - halfSquarePx,
				halfSquarePx * 2,
				halfSquarePx * 2
			)
			ctx.strokeRect(
				point064_33_Pt.x - halfSquarePx,
				point064_33_Pt.y - halfSquarePx,
				halfSquarePx * 2,
				halfSquarePx * 2
			)
			// Also draw square at center
			const centerPt = { x: cx, y: cy }
			ctx.strokeRect(centerPt.x - halfSquarePx, centerPt.y - halfSquarePx, halfSquarePx * 2, halfSquarePx * 2)
			ctx.restore()

			// Draw line from center to 064/33 point
			drawDashedLine(ctx, centerPt, point064_33_Pt, dpr)

			// Line from southern square to center
			const distToCenter = Math.hypot(southernSquareStartPointNm.x, southernSquareStartPointNm.y)
			drawDashedSegmentFromNm(ctx, cx, cy, pxPerNm, southernSquareStartPointNm, 0, distToCenter, dpr)

			// --- NEW: User requested features (non-extended lines) ---
			// 1. 中心から111°/38NMに白色点線 + 正三角形
			const point111_38_StartNm = { r: 38, b: 111 }
			const point111_38_StartNmX = point111_38_StartNm.r * Math.sin((point111_38_StartNm.b * Math.PI) / 180)
			const point111_38_StartNmY = point111_38_StartNm.r * Math.cos((point111_38_StartNm.b * Math.PI) / 180)
			const point111_38_StartPointNm = { x: point111_38_StartNmX, y: point111_38_StartNmY }
			const point111_38_Pt = nmToScreen(cx, cy, pxPerNm, point111_38_StartPointNm)

			// 中心から111°/38NMへの点線
			drawDashedLine(ctx, centerPt, point111_38_Pt, dpr)
			// 111°/38NM地点に正三角形
			drawTriangle(ctx, point111_38_Pt.x, point111_38_Pt.y, triangleSize, 111)

			// 2. 中心から308°/20NMに白色点線 + 正方形
			const point308_20_StartNm = { r: 20, b: 308 }
			const point308_20_StartNmX = point308_20_StartNm.r * Math.sin((point308_20_StartNm.b * Math.PI) / 180)
			const point308_20_StartNmY = point308_20_StartNm.r * Math.cos((point308_20_StartNm.b * Math.PI) / 180)
			const point308_20_StartPointNm = { x: point308_20_StartNmX, y: point308_20_StartNmY }
			const point308_20_Pt = nmToScreen(cx, cy, pxPerNm, point308_20_StartPointNm)

			// 中心から308°/20NMへの点線
			drawDashedLine(ctx, centerPt, point308_20_Pt, dpr)
			// 308°/20NM地点に正方形
			ctx.save()
			ctx.strokeStyle = 'rgba(255,255,255,0.95)'
			ctx.lineWidth = 1 * dpr
			ctx.strokeRect(
				point308_20_Pt.x - halfSquarePx,
				point308_20_Pt.y - halfSquarePx,
				halfSquarePx * 2,
				halfSquarePx * 2
			)
			ctx.restore()

			// --- START: User-defined intersection logic ---
			const lines = [
				/* 1 */ { startNm: point308_20_StartPointNm, bearing: 40, startPx: point308_20_Pt },
				/* 2 */ { startNm: point111_38_StartPointNm, bearing: 50, startPx: point111_38_Pt },
				/* 3 */ { startNm: point064_33_StartPointNm, bearing: 90, startPx: point064_33_Pt },
				/* 4 */ { startNm: southernSquareStartPointNm, bearing: 129, startPx: southernSquareCenterPt },
				/* 5 */ { startNm: point111_38_StartPointNm, bearing: 180, startPx: point111_38_Pt },
				/* 6 */ { startNm: point308_20_StartPointNm, bearing: 220, startPx: point308_20_Pt },
				/* 7 */ { startNm: southernSquareStartPointNm, bearing: 262, startPx: southernSquareCenterPt },
				/* 8 */ { startNm: point064_33_StartPointNm, bearing: 360, startPx: point064_33_Pt }
			].map(line => ({ ...line, dir: bearingToUnitVector(line.bearing) }))

			const pairs = [
				{ line1: lines[0], line2: lines[7] }, // 1 and 8
				{ line1: lines[2], line2: lines[1] }, // 3 and 2
				{ line1: lines[4], line2: lines[3] }, // 5 and 4
				{ line1: lines[6], line2: lines[5] } // 7 and 6
			]

			for (const pair of pairs) {
				const intersectionNm = findLineIntersection(
					pair.line1.startNm,
					pair.line1.dir,
					pair.line2.startNm,
					pair.line2.dir
				)

				if (intersectionNm) {
					const intersectionPx = nmToScreen(cx, cy, pxPerNm, intersectionNm)

					// Draw the two lines extending to the intersection
					drawDashedLine(ctx, pair.line1.startPx, intersectionPx, dpr)
					drawDashedLine(ctx, pair.line2.startPx, intersectionPx, dpr)

					// Draw one triangle at the intersection point, using the first line's bearing
					drawTriangle(ctx, intersectionPx.x, intersectionPx.y, triangleSize, pair.line1.bearing)
				}
			}
			// --- END: User-defined intersection logic ---

			// --- ADDITIONAL: 東側正方形から212°/39NM + 円弧 ---
			// 64°/33NMの正方形（東側30NM付近）から212°方向に39NMの点線
			const bearing064_212 = 212
			const dir064_212 = bearingToUnitVector(bearing064_212)
			const endPointNm064_212 = {
				x: point064_33_StartPointNm.x + dir064_212.x * 39,
				y: point064_33_StartPointNm.y + dir064_212.y * 39
			}
			const endPt064_212 = nmToScreen(cx, cy, pxPerNm, endPointNm064_212)

			// 点線を描画
			drawDashedLine(ctx, point064_33_Pt, endPt064_212, dpr)
			// 終点に正三角形
			drawTriangle(ctx, endPt064_212.x, endPt064_212.y, triangleSize, bearing064_212)

			// 上記正三角形と中心から180°方向16NMの地点を円弧で結ぶ
			// 中心から180°方向16NMの地点
			const point180_16_StartNm = { r: 16, b: 180 }
			const point180_16_StartNmX = point180_16_StartNm.r * Math.sin((point180_16_StartNm.b * Math.PI) / 180)
			const point180_16_StartNmY = point180_16_StartNm.r * Math.cos((point180_16_StartNm.b * Math.PI) / 180)
			const point180_16_StartPointNm = { x: point180_16_StartNmX, y: point180_16_StartNmY }
			const point180_16_Pt = nmToScreen(cx, cy, pxPerNm, point180_16_StartPointNm)

			// 2点を結ぶ円弧を描画
			drawArcBetweenPoints(ctx, point180_16_Pt, endPt064_212, dpr)

			// --- END: User requested features ---

			// --- END: Corrected drawing logic ---

			// aircraft
			for (const ac of aircraft) {
				const p = polarToScreen(cx, cy, ac.rNm, ac.bearingDeg, pxPerNm)
				drawAircraftIcon(ctx, p.x, p.y, 4 * dpr, ac.headingDeg)
				drawHeadingLine(ctx, p.x, p.y, ac.headingDeg, pxPerNm * 2)
				const hdg = typeof ac.targetHeadingDeg === 'number' ? ac.targetHeadingDeg : ac.headingDeg
				let hdgInt = Math.round(hdg) % 360
				if (hdgInt < 0) hdgInt += 360
				const hdgDisplay = hdgInt === 0 ? 360 : hdgInt
				const speedDisplay = ac.currentSpeedKt ? ` SPD ${String(Math.floor(ac.currentSpeedKt / 10))}${Math.random() < 0.5 ? 'H' : 'M'}` : ''
				const approachDisplay = ac.isApproaching ? ' APC' : ''
				const label = `${ac.callsign}\nHDG ${String(hdgDisplay).padStart(3, '0')}${speedDisplay}${approachDisplay}`
				drawLabel(ctx, p.x, p.y, label, 12 * dpr)
			}

			// measure line
			if (mode === 'measure' && measureStart && measureCurrent) {
				drawMeasureLine(ctx, measureStart, measureCurrent, cx, cy, pxPerNm, dpr)
			}
		},
		[aircraft, dpr, measureCurrent, measureStart, mode, rangeNm, triangleSize, halfSquarePx]
	)

	useEffect(() => {
		function resize() {
			const el = containerRef.current
			const canvas = canvasRef.current
			if (!el || !canvas) return
			const rect = el.getBoundingClientRect()
			canvas.width = Math.floor(rect.width * dpr)
			canvas.height = Math.floor(rect.height * dpr)
			canvas.style.width = `${rect.width}px`
			canvas.style.height = `${rect.height}px`
			draw()
		}
		resize()
		window.addEventListener('resize', resize)
		return () => window.removeEventListener('resize', resize)
	}, [dpr, draw])

	useEffect(() => {
		draw()
	}, [draw])

	const getCanvasPoint = useMemo(
		() => (ev: MouseEvent | TouchEvent): { x: number; y: number } | null => {
			const canvas = canvasRef.current
			if (!canvas) return null
			const rect = canvas.getBoundingClientRect()
			let clientX: number, clientY: number
			if ('touches' in ev) {
				if (ev.touches.length === 0) return null
				clientX = ev.touches[0].clientX
				clientY = ev.touches[0].clientY
			} else {
				clientX = ev.clientX
				clientY = ev.clientY
			}
			return {
				x: (clientX - rect.left) * dpr,
				y: (clientY - rect.top) * dpr
			}
		},
		[dpr]
	)

	// #endregion

	// #region Event Handlers
	// --- Mouse Handlers ---
	const handleMouseDown = (ev: React.MouseEvent) => {
		if (mode !== 'measure') return
		const point = getCanvasPoint(ev.nativeEvent)
		if (!point) return
		setMeasureStart(point)
		setMeasureCurrent(point)
		isDraggingRef.current = true
	}
	const handleMouseMove = (ev: React.MouseEvent) => {
		if (mode !== 'measure' || !isDraggingRef.current) return
		const point = getCanvasPoint(ev.nativeEvent)
		if (!point) return
		setMeasureCurrent(point)
	}
	const handleMouseUp = () => {
		if (mode !== 'measure' || !isDraggingRef.current) return
		isDraggingRef.current = false
	}

	const handleClick = (ev: React.MouseEvent) => {
		if (mode === 'measure') return
		if (!onTapAircraft && !onTapEmpty) return
		const canvas = canvasRef.current
		if (!canvas) return
		const rect = canvas.getBoundingClientRect()
		const x = (ev.clientX - rect.left) * dpr
		const y = (ev.clientY - rect.top) * dpr
		const width = canvas.width
		const height = canvas.height
		const cx = width / 2
		const cy = height / 2
		const pxPerNm = computePxPerNm(width / dpr, height / dpr, rangeNm) * dpr
		let bestId: string | null = null
		let bestDist = 1e9
		for (const ac of aircraft) {
			const p = polarToScreen(cx, cy, ac.rNm, ac.bearingDeg, pxPerNm)
			const d = Math.hypot(p.x - x, p.y - y)
			if (d < bestDist && d <= 16 * dpr) {
				bestDist = d
				bestId = ac.id
			}
		}
		if (mode === 'command' && bestId && onTapAircraft) {
			onTapAircraft(bestId)
			return
		}
		if (mode === 'spawn' && !bestId && onTapEmpty) {
			const polar = screenToPolar(cx, cy, x, y, pxPerNm)
			onTapEmpty(polar.rNm, polar.bearingDeg)
		}
	}

	// --- Touch Handlers (manual, non-passive) ---
	useEffect(() => {
		const el = containerRef.current
		if (!el) return

		const handleTouchStart = (ev: TouchEvent) => {
			if (mode !== 'measure') return
			if (ev.touches.length === 1) {
				const point = getCanvasPoint(ev)
				if (!point) return
				setMeasureStart(point)
				setMeasureCurrent(point)
				isDraggingRef.current = true
			}
		}

		const handleTouchMove = (ev: TouchEvent) => {
			if (mode !== 'measure' || !isDraggingRef.current) return
			if (ev.touches.length === 1) {
				ev.preventDefault()
				const point = getCanvasPoint(ev)
				if (!point) return
				setMeasureCurrent(point)
			}
		}

		const handleTouchEnd = () => {
			if (isDraggingRef.current) {
				isDraggingRef.current = false
			}
		}

		el.addEventListener('touchstart', handleTouchStart)
		el.addEventListener('touchmove', handleTouchMove, { passive: false })
		el.addEventListener('touchend', handleTouchEnd)
		el.addEventListener('touchcancel', handleTouchEnd)

		return () => {
			el.removeEventListener('touchstart', handleTouchStart)
			el.removeEventListener('touchmove', handleTouchMove)
			el.removeEventListener('touchend', handleTouchEnd)
			el.removeEventListener('touchcancel', handleTouchEnd)
		}
	}, [getCanvasPoint, mode])

	// モード変更時に計測をリセット
	useEffect(() => {
		setMeasureStart(null)
		setMeasureCurrent(null)
		isDraggingRef.current = false
	}, [mode])
	// #endregion

	return (
		<div
			ref={containerRef}
			className="canvas-wrap"
			onClick={handleClick}
			onMouseDown={handleMouseDown}
			onMouseMove={handleMouseMove}
			onMouseUp={handleMouseUp}
			onMouseLeave={handleMouseUp}
		>
			<canvas ref={canvasRef} />
		</div>
	)
}

function drawAircraftIcon(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	radius: number,
	headingDeg: number
) {
	// yellow filled circle
	ctx.fillStyle = '#ffd43b'
	ctx.beginPath()
	ctx.arc(x, y, radius, 0, Math.PI * 2)
	ctx.fill()
	// thin white rim
	ctx.strokeStyle = 'rgba(255,255,255,0.9)'
	ctx.lineWidth = Math.max(1, Math.floor(radius * 0.4))
	ctx.beginPath()
	ctx.arc(x, y, radius + ctx.lineWidth * 0.5, 0, Math.PI * 2)
	ctx.stroke()
	// three short white slits behind the motion (opposite to heading), oriented perpendicular
	const rad = (headingDeg * Math.PI) / 180
	const ux = Math.sin(rad) // forward x (screen coords)
	const uy = -Math.cos(rad) // forward y
	const pxv = -uy // perpendicular x
	const pyv = ux // perpendicular y
	const gap = radius * 1.0
	const len = radius * 1.4
	ctx.strokeStyle = 'rgba(255,255,255,0.85)'
	ctx.lineWidth = Math.max(1, Math.floor(radius * 0.5))
	for (let i = 0; i < 3; i++) {
		const dist = radius + (i + 1) * gap
		const cxp = x - ux * dist
		const cyp = y - uy * dist
		const sx = cxp - pxv * (len * 0.5)
		const sy = cyp - pyv * (len * 0.5)
		const ex = cxp + pxv * (len * 0.5)
		const ey = cyp + pyv * (len * 0.5)
		ctx.beginPath()
		ctx.moveTo(sx, sy)
		ctx.lineTo(ex, ey)
		ctx.stroke()
	}
}

function drawLabel(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	text: string,
	fontSize: number
) {
	const offsetX = 14
	const offsetY = -14
	const lines = text.split('\n')
	ctx.save()
	ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, Consolas, Monaco`
	ctx.fillStyle = '#ffffff'
	let ty = y + offsetY
	for (const line of lines) {
		ctx.fillText(line, x + offsetX, ty)
		ty += fontSize + 2
	}
	ctx.restore()
}

function drawHeadingLine(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	headingDeg: number,
	lengthPx: number
) {
	const rad = (headingDeg * Math.PI) / 180
	const ux = Math.sin(rad)
	const uy = -Math.cos(rad)
	const x2 = x + ux * lengthPx
	const y2 = y + uy * lengthPx
	ctx.save()
	ctx.strokeStyle = 'rgba(255,255,255,0.9)'
	ctx.lineWidth = 1
	ctx.beginPath()
	ctx.moveTo(x, y)
	ctx.lineTo(x2, y2)
	ctx.stroke()
	ctx.restore()
}

// Helpers for PCA drawing
function drawRadial(
	ctx: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	pxPerNm: number,
	bearingDeg: number,
	rStartNm: number,
	rEndNm: number
) {
	const s = polarToScreen(cx, cy, rStartNm, bearingDeg, pxPerNm)
	const e = polarToScreen(cx, cy, rEndNm, bearingDeg, pxPerNm)
	ctx.beginPath()
	ctx.moveTo(s.x, s.y)
	ctx.lineTo(e.x, e.y)
	ctx.stroke()
}

function bearingToCanvasAngle(bearingDeg: number): number {
	// Bearing(北=0,時計回り) -> Canvas角度（右=0,時計回り）
	return ((bearingDeg - 90) * Math.PI) / 180
}

function drawArcSegment(
	ctx: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	pxPerNm: number,
	rNm: number,
	startBearingDeg: number,
	endBearingDeg: number
) {
	const r = rNm * pxPerNm
	const startRad = bearingToCanvasAngle(startBearingDeg)
	const endRad = bearingToCanvasAngle(endBearingDeg)

	// 角度の正規化と最短方向の決定
	const twoPi = Math.PI * 2
	let delta = (endRad - startRad) % twoPi
	if (delta < -Math.PI) delta += twoPi
	if (delta > Math.PI) delta -= twoPi
	const finalEndRad = startRad + delta

	ctx.beginPath()
	ctx.arc(cx, cy, r, startRad, finalEndRad)
	ctx.stroke()
}

function drawDashedLine(
	ctx: CanvasRenderingContext2D,
	start: { x: number; y: number },
	end: { x: number; y: number },
	dpr: number
) {
	ctx.save()
	ctx.strokeStyle = 'rgba(255,255,255,0.95)'
	ctx.lineWidth = 1 * dpr
	ctx.setLineDash([4 * dpr, 4 * dpr])
	ctx.beginPath()
	ctx.moveTo(start.x, start.y)
	ctx.lineTo(end.x, end.y)
	ctx.stroke()
	ctx.restore()
}

function drawTriangle(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	rotationDeg: number
) {
	const h = (size * Math.sqrt(3)) / 2
	const angleRad = (rotationDeg * Math.PI) / 180

	ctx.save()
	ctx.translate(x, y)
	ctx.rotate(angleRad)
	ctx.fillStyle = 'rgba(255,255,255,0.95)'
	ctx.beginPath()
	// Triangle points "North" (up) before rotation
	ctx.moveTo(0, -h / 1.5)
	ctx.lineTo(-size / 2, h / 3)
	ctx.lineTo(size / 2, h / 3)
	ctx.closePath()
	ctx.fill()
	ctx.restore()
}

function mmToCanvasPx(mm: number, dpr: number) {
	const cssPxPerMm = 96 / 25.4
	return mm * cssPxPerMm * dpr
}

/**
 * Calculates the distance from a point along a ray to the intersection with a circle centered at the origin.
 * @param startPtNm - The starting point of the ray, in NM coordinates {x, y} where Y is North.
 * @param bearingDeg - The direction of the ray in degrees (bearing).
 * @param circleRadiusNm - The radius of the circle to intersect with.
 * @returns The distance (t) along the ray to the intersection, or null if no intersection.
 */
function getRayCircleIntersection(
	startPtNm: { x: number; y: number },
	bearingDeg: number,
	circleRadiusNm: number
): number | null {
	const dir = bearingToUnitVector(bearingDeg)
	const O = startPtNm // Ray origin
	const D = dir // Ray direction
	const r = circleRadiusNm

	// a*t^2 + b*t + c = 0
	const a = D.x * D.x + D.y * D.y // Should be 1 if D is a unit vector
	const b = 2 * (O.x * D.x + O.y * D.y)
	const c = O.x * O.x + O.y * O.y - r * r

	const discriminant = b * b - 4 * a * c

	if (discriminant < 0) {
		// No intersection
		return null
	}

	// Find the two solutions for t (distance along the ray)
	const t1 = (-b + Math.sqrt(discriminant)) / (2 * a)
	const t2 = (-b - Math.sqrt(discriminant)) / (2 * a)

	// We want the intersection point in the forward direction of the ray, so t must be positive.
	if (t1 > 0 && t2 > 0) {
		return Math.min(t1, t2)
	}
	if (t1 > 0) {
		return t1
	}
	if (t2 > 0) {
		return t2
	}
	return null
}

function findLineIntersection(
	p1: { x: number; y: number },
	d1: { x: number; y: number },
	p2: { x: number; y: number },
	d2: { x: number; y: number }
): { x: number; y: number } | null {
	const det = d1.x * d2.y - d1.y * d2.x
	if (Math.abs(det) < 1e-9) {
		// Lines are parallel
		return null
	}
	const t = ((p2.x - p1.x) * d2.y - (p2.y - p1.y) * d2.x) / det
	return {
		x: p1.x + t * d1.x,
		y: p1.y + t * d1.y
	}
}

function bearingToUnitVector(bearingDeg: number) {
	const rad = (bearingDeg * Math.PI) / 180
	// Convert bearing to standard angle (0 deg = East), then get vector
	const angleRad = (90 - bearingDeg) * (Math.PI / 180)
	return { x: Math.cos(angleRad), y: Math.sin(angleRad) }
}

function nmToScreen(
	cx: number,
	cy: number,
	pxPerNm: number,
	pointNm: { x: number; y: number }
) {
	return {
		x: cx + pointNm.x * pxPerNm,
		y: cy - pointNm.y * pxPerNm
	}
}

function drawDashedSegmentFromNm(
	ctx: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	pxPerNm: number,
	startNm: { x: number; y: number },
	bearingDeg: number,
	lengthNm: number,
	dpr: number
) {
	const dir = bearingToUnitVector(bearingDeg)
	const endNm = {
		x: startNm.x + dir.x * lengthNm,
		y: startNm.y + dir.y * lengthNm
	}
	const startPx = nmToScreen(cx, cy, pxPerNm, startNm)
	const endPx = nmToScreen(cx, cy, pxPerNm, endNm)
	ctx.save()
	ctx.strokeStyle = 'rgba(255,255,255,0.9)'
	ctx.lineWidth = 1.5 * dpr
	ctx.setLineDash([6 * dpr, 6 * dpr])
	ctx.beginPath()
	ctx.moveTo(startPx.x, startPx.y)
	ctx.lineTo(endPx.x, endPx.y)
	ctx.stroke()
	ctx.restore()
}

function drawRadialRectangle(
	ctx: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	pxPerNm: number,
	bearingDeg: number,
	rStartNm: number,
	rEndNm: number,
	halfWidthNm: number,
	strokeStyle: string
) {
	const dir = bearingToUnitVector(bearingDeg)
	const fx = dir.x
	const fy = dir.y
	const px = -fy
	const py = fx
	const aNm = { x: fx * rStartNm + px * halfWidthNm, y: fy * rStartNm + py * halfWidthNm }
	const bNm = { x: fx * rEndNm + px * halfWidthNm, y: fy * rEndNm + py * halfWidthNm }
	const cNm = { x: fx * rEndNm - px * halfWidthNm, y: fy * rEndNm - py * halfWidthNm }
	const dNm = { x: fx * rStartNm - px * halfWidthNm, y: fy * rStartNm - py * halfWidthNm }
	function toScreen(p: { x: number; y: number }) {
		return { x: cx + p.x * pxPerNm, y: cy - p.y * pxPerNm }
	}
	const a = toScreen(aNm)
	const b = toScreen(bNm)
	const c = toScreen(cNm)
	const d = toScreen(dNm)
	ctx.save()
	ctx.strokeStyle = strokeStyle
	ctx.lineWidth = Math.max(1, Math.floor(1 * (window.devicePixelRatio || 1)))
	ctx.beginPath()
	ctx.moveTo(a.x, a.y)
	ctx.lineTo(b.x, b.y)
	ctx.lineTo(c.x, c.y)
	ctx.lineTo(d.x, d.y)
	ctx.closePath()
	ctx.stroke()
	ctx.restore()
}

function drawMeasureLine(
	ctx: CanvasRenderingContext2D,
	start: { x: number; y: number },
	current: { x: number; y: number },
	cx: number,
	cy: number,
	pxPerNm: number,
	dpr: number
) {
	// 計測線を描画
	ctx.save()
	ctx.strokeStyle = 'rgba(255,255,0,0.9)'
	ctx.lineWidth = 2 * dpr
	ctx.beginPath()
	ctx.moveTo(start.x, start.y)
	ctx.lineTo(current.x, current.y)
	ctx.stroke()

	// 開始点にマーカー
	ctx.fillStyle = 'rgba(255,255,0,0.9)'
	ctx.beginPath()
	ctx.arc(start.x, start.y, 4 * dpr, 0, Math.PI * 2)
	ctx.fill()

	// 終了点にマーカー
	ctx.beginPath()
	ctx.arc(current.x, current.y, 4 * dpr, 0, Math.PI * 2)
	ctx.fill()

	// 距離と方位を計算
	const dxPx = current.x - start.x
	const dyPx = start.y - current.y // y軸反転
	const dxNm = dxPx / pxPerNm
	const dyNm = dyPx / pxPerNm
	const distanceNm = Math.hypot(dxNm, dyNm)
	const bearingRad = Math.atan2(dxNm, dyNm)
	let bearingDeg = (bearingRad * 180) / Math.PI
	if (bearingDeg < 0) bearingDeg += 360

	// ラベルを表示（線の中点付近）
	const midX = (start.x + current.x) / 2
	const midY = (start.y + current.y) / 2
	const distanceStr = distanceNm.toFixed(1)
	const bearingStr = Math.round(bearingDeg)
		.toString()
		.padStart(3, '0')
	const label = `${distanceStr} NM\nBRG ${bearingStr}°`

	ctx.fillStyle = 'rgba(0,0,0,0.7)'
	ctx.fillRect(midX - 40 * dpr, midY - 20 * dpr, 80 * dpr, 40 * dpr)

	ctx.font = `${12 * dpr}px ui-monospace, SFMono-Regular, Menlo, Consolas, Monaco`
	ctx.fillStyle = '#ffff00'
	ctx.textAlign = 'center'
	ctx.textBaseline = 'middle'
	const lines = label.split('\n')
	lines.forEach((line, i) => {
		ctx.fillText(line, midX, midY - (lines.length - 1 - i * 2) * 7 * dpr)
	})
	ctx.textAlign = 'left'
	ctx.textBaseline = 'alphabetic'
	ctx.restore()
}

function drawArcBetweenPoints(
	ctx: CanvasRenderingContext2D,
	point1: { x: number; y: number },
	point2: { x: number; y: number },
	dpr: number
) {
	// 2点を結ぶ円弧を描画（2点の中点を通る円弧）
	const dx = point2.x - point1.x
	const dy = point2.y - point1.y
	const distance = Math.hypot(dx, dy)

	// 2点の中点
	const midX = (point1.x + point2.x) / 2
	const midY = (point1.y + point2.y) / 2

	// 円弧の半径を距離の60%とする（適度なカーブ）
	const radius = distance * 0.6

	// 2点間の角度
	const angle = Math.atan2(dy, dx)

	// 制御点を中点から垂直方向にオフセット
	const controlX = midX - Math.sin(angle) * (distance * 0.2)
	const controlY = midY + Math.cos(angle) * (distance * 0.2)

	ctx.save()
	ctx.strokeStyle = 'rgba(255,255,255,0.95)'
	ctx.lineWidth = 1 * dpr
	ctx.beginPath()
	ctx.moveTo(point1.x, point1.y)
	ctx.quadraticCurveTo(controlX, controlY, point2.x, point2.y)
	ctx.stroke()
	ctx.restore()
}


