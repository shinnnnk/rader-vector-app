import React from 'react'

export interface NumericKeyboardProps {
	onDigit: (digit: string) => void
	onClear: () => void
	onCommand: (command: string) => void
}

export const NumericKeyboard: React.FC<NumericKeyboardProps> = ({ onDigit, onClear, onCommand }) => {
	return (
		<div
			style={{
				display: 'grid',
				gridTemplateColumns: 'repeat(3, minmax(44px, 1fr))',
				gap: 6,
				padding: 8,
				backgroundColor: '#1a1a1a',
				borderRadius: 8,
				width: '100%',
				margin: '0 auto'
			}}
		>
			{[7, 8, 9, 4, 5, 6, 1, 2, 3].map((digit) => (
				<button
					key={digit}
					onClick={() => onDigit(String(digit))}
					style={{
						padding: '10px 0',
						fontSize: 16,
						fontWeight: 600,
						backgroundColor: '#2a2a2a',
						color: '#ffffff',
						border: '1px solid #3a3a3a',
						borderRadius: 6,
						cursor: 'pointer',
						userSelect: 'none',
						touchAction: 'manipulation'
					}}
					onMouseDown={(e) => e.preventDefault()}
					onTouchStart={(e) => e.preventDefault()}
				>
					{digit}
				</button>
			))}
			{/* Separate button for 0 */}
			<button
				key={0}
				onClick={() => onDigit('0')}
				style={{
					gridColumn: '1',
					padding: '10px 0',
					fontSize: 16,
					fontWeight: 600,
					backgroundColor: '#2a2a2a',
					color: '#ffffff',
					border: '1px solid #3a3a3a',
					borderRadius: 6,
					cursor: 'pointer',
					userSelect: 'none',
					touchAction: 'manipulation'
				}}
				onMouseDown={(e) => e.preventDefault()}
				onTouchStart={(e) => e.preventDefault()}
			>
				0
			</button>
			<button
				onClick={() => onCommand('A')}
				style={{
					gridColumn: '2',
					padding: '10px 0',
					fontSize: 14,
					fontWeight: 600,
					backgroundColor: '#2a4a2a',
					color: '#ffffff',
					border: '1px solid #3a5a3a',
					borderRadius: 6,
					cursor: 'pointer',
					userSelect: 'none',
					touchAction: 'manipulation'
				}}
				onMouseDown={(e) => e.preventDefault()}
				onTouchStart={(e) => e.preventDefault()}
			>
				A
			</button>
			<button
				onClick={onClear}
				style={{
					gridColumn: '3',
					padding: '10px 0',
					fontSize: 14,
					fontWeight: 600,
					backgroundColor: '#4a2a2a',
					color: '#ffffff',
					border: '1px solid #5a3a3a',
					borderRadius: 6,
					cursor: 'pointer',
					userSelect: 'none',
					touchAction: 'manipulation'
				}}
				onMouseDown={(e) => e.preventDefault()}
				onTouchStart={(e) => e.preventDefault()}
			>
				クリア
			</button>
		</div>
	)
}

