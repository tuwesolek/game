// Server-side metrics collection and reporting
// Implements the TODO item from README.md

interface Metric {
	value: number;
	timestamp: number;
	labels?: Record<string, string>;
}

class MetricsCollector {
	private metrics = new Map<string, Metric[]>();
	private readonly MAX_METRICS_PER_KEY = 1000;

	constructor() {
		// Start periodic cleanup
		setInterval(() => this.cleanupOldMetrics(), 60000); // Every minute
	}

	// Record a gauge metric (instantaneous value)
	gauge(name: string, value: number, labels?: Record<string, string>): void {
		this.recordMetric(name, value, labels);
	}

	// Record a counter metric (cumulative count)
	counter(name: string, increment: number = 1, labels?: Record<string, string>): void {
		const key = this.getMetricKey(name, labels);
		const existing = this.metrics.get(key) || [];
		const currentValue = existing.length > 0 ? existing[existing.length - 1].value : 0;
		this.recordMetric(name, currentValue + increment, labels);
	}

	// Record a histogram metric (distribution of values)
	histogram(name: string, value: number, labels?: Record<string, string>): void {
		this.recordMetric(`${name}_histogram`, value, labels);
		
		// Also record summary statistics
		const key = this.getMetricKey(name, labels);
		const existing = this.metrics.get(key) || [];
		if (existing.length > 0) {
			const values = existing.map(m => m.value);
			const sum = values.reduce((a, b) => a + b, 0);
			const avg = sum / values.length;
			const min = Math.min(...values);
			const max = Math.max(...values);
			
			this.recordMetric(`${name}_avg`, avg, labels);
			this.recordMetric(`${name}_min`, min, labels);
			this.recordMetric(`${name}_max`, max, labels);
		}
	}

	private recordMetric(name: string, value: number, labels?: Record<string, string>): void {
		const key = this.getMetricKey(name, labels);
		const metric: Metric = { value, timestamp: Date.now(), labels };
		
		if (!this.metrics.has(key)) {
			this.metrics.set(key, []);
		}
		
		const metrics = this.metrics.get(key)!;
		metrics.push(metric);
		
		// Trim old metrics if we exceed the limit
		if (metrics.length > this.MAX_METRICS_PER_KEY) {
			metrics.splice(0, metrics.length - this.MAX_METRICS_PER_KEY);
		}
	}

	private getMetricKey(name: string, labels?: Record<string, string>): string {
		if (!labels) return name;
		const labelStr = Object.entries(labels)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([k, v]) => `${k}=${v}`)
			.join(',');
		return `${name}{${labelStr}}`;
	}

	private cleanupOldMetrics(): void {
		const cutoff = Date.now() - 3600000; // 1 hour ago
		
		for (const [key, metrics] of this.metrics.entries()) {
			const filtered = metrics.filter(m => m.timestamp > cutoff);
			if (filtered.length !== metrics.length) {
				this.metrics.set(key, filtered);
			}
		}
	}

	// Get current metrics
	getMetrics(): Record<string, Metric[]> {
		return Object.fromEntries(this.metrics);
	}

	// Get metrics in Prometheus format
	getPrometheusMetrics(): string {
		const lines: string[] = [];
		const timestamp = Date.now();
		
		for (const [key, metrics] of this.metrics.entries()) {
			if (metrics.length > 0) {
				const latest = metrics[metrics.length - 1];
				// Convert key back to name and labels for Prometheus format
				const braceIndex = key.indexOf('{');
				const name = braceIndex > 0 ? key.substring(0, braceIndex) : key;
				const labels = braceIndex > 0 ? key.substring(braceIndex) : '';
				
				lines.push(`# TYPE ${name} gauge`);
				lines.push(`${key} ${latest.value} ${timestamp}`);
			}
		}
		
		return lines.join('\n');
	}

	// Reset all metrics
	reset(): void {
		this.metrics.clear();
	}
}

// Global metrics collector instance
export const metricsCollector = new MetricsCollector();

// WebSocket connection metrics
export function trackWebSocketConnection(): void {
	metricsCollector.counter('websocket_connections_total');
	metricsCollector.gauge('websocket_active_connections', 
		(metricsCollector as any).metrics.get('websocket_active_connections')?.slice(-1)[0]?.value + 1 || 1);
}

export function trackWebSocketDisconnection(): void {
	metricsCollector.gauge('websocket_active_connections', 
		Math.max(0, (metricsCollector as any).metrics.get('websocket_active_connections')?.slice(-1)[0]?.value - 1 || 0));
}

export function trackWebSocketMessage(type: string): void {
	metricsCollector.counter('websocket_messages_total', 1, { type });
}

// API endpoint metrics
export function trackApiRequest(endpoint: string, method: string, statusCode: number, duration: number): void {
	metricsCollector.counter('api_requests_total', 1, { endpoint, method, status_code: statusCode.toString() });
	metricsCollector.histogram('api_request_duration_seconds', duration / 1000, { endpoint, method });
}

// Game state metrics
export function trackGameStateUpdate(updateType: string): void {
	metricsCollector.counter('game_state_updates_total', 1, { type: updateType });
}

export function trackPlayerCount(count: number): void {
	metricsCollector.gauge('game_active_players', count);
}

export function trackTerritoryCount(count: number): void {
	metricsCollector.gauge('game_territories_claimed', count);
}

// Resource metrics
export function trackResourceGeneration(resource: string, amount: number): void {
	metricsCollector.counter(`resource_generated_${resource}_total`, amount);
}

export function trackResourceConsumption(resource: string, amount: number): void {
	metricsCollector.counter(`resource_consumed_${resource}_total`, amount);
}

// Performance metrics
export function trackFrameRate(fps: number): void {
	metricsCollector.gauge('client_fps', fps);
}

export function trackLatency(latency: number): void {
	metricsCollector.histogram('network_latency_ms', latency);
}

export function trackMemoryUsage(heapUsed: number, heapTotal: number): void {
	metricsCollector.gauge('server_memory_heap_used_bytes', heapUsed);
	metricsCollector.gauge('server_memory_heap_total_bytes', heapTotal);
}

// Export for convenience
export default metricsCollector;