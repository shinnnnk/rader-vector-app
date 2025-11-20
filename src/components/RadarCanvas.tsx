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
	clearMeasureTrigger?: number
}

export const RadarCanvas: React.FC<RadarCanvasProps> = ({ rangeNm, mode, aircraft, onTapAircraft, onTapEmpty, clearMeasureTrigger }) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null)
	const containerRef = useRef<HTMLDivElement | null>(null)
	const dpr = useMemo(() => window.devicePixelRatio || 1, [])
	const [measureStart, setMeasureStart] = useState<{ x: number; y: number } | null>(null)
	const [measureCurrent, setMeasureCurrent] = useState<{ x: number; y: number } | null>(null)
	const isDraggingRef = useRef(false)

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
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [rangeNm, aircraft])

	function draw() {
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
		const maxR = Math.min(width, height) * 0.48
		const steps = rangeNm === 20 ? [0, 10, 20] : [0, 10, 20, 30, 40, 50]
		for (const nm of steps) {
			const r = (nm * pxPerNm)
			ctx.beginPath()
			ctx.arc(cx, cy, r, 0, Math.PI * 2)
			ctx.stroke()
		}
		// sector lines: N E S W
		ctx.strokeStyle = 'rgba(47,220,123,0.25)'
		const cardinal = [0, 90, 180, 270]
		for (const b of cardinal) {
			const rad = (b * Math.PI) / 180
			const x = cx + maxR * Math.sin(rad)
			const y = cy - maxR * Math.cos(rad)
			ctx.beginPath()
			ctx.moveTo(cx, cy)
			ctx.lineTo(x, y)
			ctx.stroke()
		}

		// PCA overlay（新仕様：同心円/南向き長方形/南側バウムクーヘン）
		// A) 同心円（10〜80NM）— 5本目（=50NM）を濃い青で強調
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
		// 方角の希望: 上=0(360)、右=270。内部実装は 0°=北・時計回り。
		// 本指定では配置角を 180°（下=南）に固定する。
		const shapeBearingNorth0 = 180
		// B) 長方形：方向= shapeBearing、r:5〜15、幅=4（±2）
		drawRadialRectangle(
			ctx,
			cx,
			cy,
			pxPerNm,
			shapeBearingNorth0,
			5,
			15,
			2,
			'rgba(120,170,255,0.8)'
		)
		// C) バウムクーヘン型：中心から2つ目の円（20NM）付近で、長方形と同じ方角に配置
		//    厚み5NM（17.5〜22.5）、弧長10NM → 角度 = 10/20 rad ≈ 28.647°
		const centerRadiusNm = 20
		const thicknessNm = 5
		const arcLengthNm = 15
		// 弧長は「短い方（内側=20NM）の円周上」で10NMになるよう角度を算出
		const arcAngleDeg = (arcLengthNm / centerRadiusNm) * (180 / Math.PI) // ≈ 28.647°
		// 指定方角（north0）を中心に弧を配置
		const start = shapeBearingNorth0 - arcAngleDeg / 2
		const end = shapeBearingNorth0 + arcAngleDeg / 2
		fillAnnularSector(
			ctx,
			cx,
			cy,
			pxPerNm,
			dpr,
			// 短い方（内側）の曲線を円周（20NMリング）に一致させる
			centerRadiusNm,
			centerRadiusNm + thicknessNm,
			start,
			end,
			'rgba(120,170,255,0.12)'
		)

		// D) 長方形中心を起点にした点線（200° / 160° 方向へ30NM）
		const rectCenterNm = { x: 0, y: -((5 + 15) / 2) } // bearing 180°, r=10NM
		drawDashedSegmentFromNm(ctx, cx, cy, pxPerNm, rectCenterNm, 200, 30, dpr)
		drawDashedSegmentFromNm(ctx, cx, cy, pxPerNm, rectCenterNm, 160, 30, dpr)

		// E) 長方形中心の2NM南側（=y-2）を起点にした点線（210° / 150° 方向へ30NM）
		const offsetAnchorNm = { x: rectCenterNm.x, y: rectCenterNm.y - 2 }
		drawDashedSegmentFromNm(ctx, cx, cy, pxPerNm, offsetAnchorNm, 210, 30, dpr)
		drawDashedSegmentFromNm(ctx, cx, cy, pxPerNm, offsetAnchorNm, 150, 30, dpr)

		// F) 中心から南31NM位置の2mm正方形
		const squareCenter = polarToScreen(cx, cy, 31, 180, pxPerNm)
		const halfSquarePx = mmToCanvasPx(1, dpr) / 2
		ctx.save()
		ctx.strokeStyle = 'rgba(255,255,255,0.95)'
		ctx.lineWidth = 1 * dpr
		ctx.strokeRect(
			squareCenter.x - halfSquarePx,
			squareCenter.y - halfSquarePx,
			halfSquarePx * 2,
			halfSquarePx * 2
		)
		ctx.restore()

		// aircraft
		for (const ac of aircraft) {
			const p = polarToScreen(cx, cy, ac.rNm, ac.bearingDeg, pxPerNm)
			// symbol: yellow circle with white rim + three short white slits behind motion
			drawAircraftIcon(ctx, p.x, p.y, 4 * dpr, ac.headingDeg)
			// heading line: 現在の進行方向に2NMの線
			drawHeadingLine(ctx, p.x, p.y, ac.headingDeg, pxPerNm * 2)
			// label: 1行目=コールサイン, 2行目=HDG ddd のみ
			const hdg = typeof ac.targetHeadingDeg === 'number' ? ac.targetHeadingDeg : ac.headingDeg
			let hdgInt = Math.round(hdg) % 360
			if (hdgInt < 0) hdgInt += 360
			const hdgDisplay = hdgInt === 0 ? 360 : hdgInt
			const label = `${ac.callsign}\nHDG ${String(hdgDisplay).padStart(3, '0')}`
			drawLabel(ctx, p.x, p.y, label, 12 * dpr)
		}

		// measure line
		if (mode === 'measure' && measureStart && measureCurrent) {
			drawMeasureLine(ctx, measureStart, measureCurrent, cx, cy, pxPerNm, dpr)
		}
	}

	useEffect(() => {
		draw()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [rangeNm, aircraft, measureStart, measureCurrent, mode])

	function getCanvasPoint(ev: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null {
		const canvas = canvasRef.current
		if (!canvas) return null
		const rect = canvas.getBoundingClientRect()
		let clientX: number, clientY: number
		if ('touches' in ev && ev.touches.length > 0) {
			clientX = ev.touches[0].clientX
			clientY = ev.touches[0].clientY
		} else if ('clientX' in ev) {
			clientX = ev.clientX
			clientY = ev.clientY
		} else {
			return null
		}
		return {
			x: (clientX - rect.left) * dpr,
			y: (clientY - rect.top) * dpr
		}
	}

	function handlePointerDown(ev: React.MouseEvent | React.TouchEvent) {
		if (mode !== 'measure') return
		const point = getCanvasPoint(ev)
		if (!point) return
		setMeasureStart(point)
		setMeasureCurrent(point)
		isDraggingRef.current = true
		if ('preventDefault' in ev) ev.preventDefault()
	}

	function handlePointerMove(ev: React.MouseEvent | React.TouchEvent) {
		if (mode !== 'measure' || !isDraggingRef.current) return
		const point = getCanvasPoint(ev)
		if (!point) return
		setMeasureCurrent(point)
		if ('preventDefault' in ev) ev.preventDefault()
	}

	function handlePointerUp(ev: React.MouseEvent | React.TouchEvent) {
		if (mode !== 'measure' || !isDraggingRef.current) return
		isDraggingRef.current = false
		if ('preventDefault' in ev) ev.preventDefault()
	}

	function handleClick(ev: React.MouseEvent) {
		if (mode === 'measure') {
			// 計測モードではクリックは無視（計測線は残す）
			return
		}
		if (!onTapAircraft && !onTapEmpty) return
		const canvas = canvasRef.current
		if (!canvas) return
		const rect = canvas.getBoundingClientRect()
		const x = (ev.clientX - rect.left) * dpr
		const y = (ev.clientY - rect.top) * dpr
		// hit test: nearest aircraft within 16px
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

	// モード変更時に計測をリセット
	useEffect(() => {
		setMeasureStart(null)
		setMeasureCurrent(null)
		isDraggingRef.current = false
	}, [mode])

	// clearMeasureTriggerが変更されたら計測をクリア
	useEffect(() => {
		if (clearMeasureTrigger !== undefined && clearMeasureTrigger > 0) {
			setMeasureStart(null)
			setMeasureCurrent(null)
			isDraggingRef.current = false
		}
	}, [clearMeasureTrigger])

	return (
		<div
			ref={containerRef}
			className="canvas-wrap"
			style={{ touchAction: mode === 'measure' ? 'none' : 'manipulation' }}
			onClick={handleClick}
			onMouseDown={handlePointerDown}
			onMouseMove={handlePointerMove}
			onMouseUp={handlePointerUp}
			onMouseLeave={handlePointerUp}
			onTouchStart={handlePointerDown}
			onTouchMove={handlePointerMove}
			onTouchEnd={handlePointerUp}
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
	const ux = Math.sin(rad)        // forward x (screen coords)
	const uy = -Math.cos(rad)       // forward y
	const pxv = -uy                 // perpendicular x
	const pyv = ux                  // perpendicular y
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
	return ((90 - bearingDeg) * Math.PI) / 180
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
	// 最短方向で描く
	let delta = (endRad - startRad) % (Math.PI * 2)
	if (delta < 0) delta += Math.PI * 2
	const anticlockwise = delta > Math.PI
	ctx.beginPath()
	ctx.arc(cx, cy, r, startRad, endRad, anticlockwise)
	ctx.stroke()
}

function fillAnnularSector(
	ctx: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	pxPerNm: number,
	dpr: number,
	rInnerNm: number,
	rOuterNm: number,
	startBearingDeg: number,
	endBearingDeg: number,
	fillStyle: string
) {
	// 数学的/Canvas角度の取り扱いで混乱しないよう、極座標→画面座標の関数を使って
	// 方位角を直接サンプリングして多角形として塗る
	function norm(b: number): number {
		let v = b % 360
		if (v < 0) v += 360
		return v
	}
	const b0 = norm(startBearingDeg)
	const b1 = norm(endBearingDeg)
	// 進行方向は短い方（b0→b1）を採用
	let forward = b1 - b0
	if (forward < 0) forward += 360
	const stepDeg = Math.max(1, Math.min(4, forward / 12)) // 分割数は最大約12セグメント
	ctx.save()
	ctx.fillStyle = fillStyle
	ctx.beginPath()
	// 外周（b0→b1）
	for (let b = 0; b <= forward; b += stepDeg) {
		const bearing = b0 + b
		const p = polarToScreen(cx, cy, rOuterNm, bearing, pxPerNm)
		if (b === 0) ctx.moveTo(p.x, p.y)
		else ctx.lineTo(p.x, p.y)
	}
	// 内周（b1→b0）
	for (let b = forward; b >= 0; b -= stepDeg) {
		const bearing = b0 + b
		const p = polarToScreen(cx, cy, rInnerNm, bearing, pxPerNm)
		ctx.lineTo(p.x, p.y)
	}
	ctx.closePath()
	ctx.fill()
	ctx.restore()
}

function bearingToUnitVector(bearingDeg: number) {
	const rad = (bearingDeg * Math.PI) / 180
	return { x: Math.sin(rad), y: Math.cos(rad) }
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
	ctx.strokeStyle = 'rgba(120,170,255,0.9)'
	ctx.lineWidth = 1.5 * dpr
	ctx.setLineDash([6 * dpr, 6 * dpr])
	ctx.beginPath()
	ctx.moveTo(startPx.x, startPx.y)
	ctx.lineTo(endPx.x, endPx.y)
	ctx.stroke()
	ctx.restore()
}

function mmToCanvasPx(mm: number, dpr: number) {
	const cssPxPerMm = 96 / 25.4
	return mm * cssPxPerMm * dpr
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
	// 前方単位ベクトル（NM座標）
	const rad = (bearingDeg * Math.PI) / 180
	const fx = Math.sin(rad)
	const fy = Math.cos(rad)
	// 垂直方向単位ベクトル（NM座標）
	const px = Math.cos(rad)
	const py = -Math.sin(rad)
	// 4隅（NM座標）
	const aNm = { x: fx * rStartNm + px * halfWidthNm, y: fy * rStartNm + py * halfWidthNm }
	const bNm = { x: fx * rEndNm + px * halfWidthNm, y: fy * rEndNm + py * halfWidthNm }
	const cNm = { x: fx * rEndNm - px * halfWidthNm, y: fy * rEndNm - py * halfWidthNm }
	const dNm = { x: fx * rStartNm - px * halfWidthNm, y: fy * rStartNm - py * halfWidthNm }
	// NM→画面座標
	function toScreen(p: { x: number; y: number }) {
		return { x: cx + p.x * pxPerNm, y: cy - p.y * pxPerNm }
	}
	const a = toScreen(aNm)
	const b = toScreen(bNm)
	const c = toScreen(cNm)
	const d = toScreen(dNm)
	// 描画
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
	const bearingStr = Math.round(bearingDeg).toString().padStart(3, '0')
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


