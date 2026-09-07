export function ConnectionLoader() {
	return (
		<div className="connection-loader" role="status">
			<svg
				aria-hidden="true"
				className="connection-loader__graphic"
				viewBox="0 0 240 240"
			>
				<circle
					className="connection-loader__ring connection-loader__ring--a"
					cx="120"
					cy="120"
					fill="none"
					r="105"
					strokeLinecap="round"
				/>
				<circle
					className="connection-loader__ring connection-loader__ring--b"
					cx="120"
					cy="120"
					fill="none"
					r="35"
					strokeLinecap="round"
				/>
				<circle
					className="connection-loader__ring connection-loader__ring--c"
					cx="85"
					cy="120"
					fill="none"
					r="70"
					strokeLinecap="round"
				/>
				<circle
					className="connection-loader__ring connection-loader__ring--d"
					cx="155"
					cy="120"
					fill="none"
					r="70"
					strokeLinecap="round"
				/>
			</svg>
			<span className="sr-only">Intentando recuperar la conexión</span>
		</div>
	);
}
