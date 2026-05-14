import v8 from 'v8';
import mongoose from 'mongoose';

export type HealthStatus = 'healthy' | 'unhealthy' | 'degraded';

export interface HealthCheck {
  status: HealthStatus;
  timestamp: string;
  service: string;
  version: string;
  uptime: number;
  checks: {
    mongodb?: HealthCheckResult;
    memory?: HealthCheckResult;
  };
}

export interface HealthCheckResult {
  status: HealthStatus;
  latency?: number;
  message?: string;
}

export function createHealthCheck(serviceName: string, version: string = '1.0.0') {
  const startTime = Date.now();

  return async function checkHealth(): Promise<HealthCheck> {
    const checks: HealthCheck['checks'] = {};

    // MongoDB check
    const mongoStatus = mongoose.connection.readyState;
    checks.mongodb = {
      status: mongoStatus === 1 ? 'healthy' : 'unhealthy',
      message: mongoStatus === 1 ? 'Connected' : mongoStatus === 0 ? 'Disconnected' : 'Connecting',
    };

    // Memory check — compare heapUsed against V8's actual heap size limit,
    // not heapTotal (currently allocated pages), which sits close to heapUsed by design.
    const heapStats = v8.getHeapStatistics();
    const memUsedMB = heapStats.used_heap_size / 1024 / 1024;
    const memLimitMB = heapStats.heap_size_limit / 1024 / 1024;
    const memUsagePercent = (memUsedMB / memLimitMB) * 100;

    checks.memory = {
      status: memUsagePercent > 90 ? 'unhealthy' : memUsagePercent > 70 ? 'degraded' : 'healthy',
      message: `${memUsedMB.toFixed(0)}MB / ${memLimitMB.toFixed(0)}MB`,
    };

    const overallStatus = determineOverallStatus(checks);

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      service: serviceName,
      version,
      uptime: Math.floor((Date.now() - startTime) / 1000),
      checks,
    };
  };
}

function determineOverallStatus(checks: HealthCheck['checks']): HealthStatus {
  const hasUnhealthy = Object.values(checks).some((c) => c?.status === 'unhealthy');
  const hasDegraded = Object.values(checks).some((c) => c?.status === 'degraded');

  if (hasUnhealthy) return 'unhealthy';
  if (hasDegraded) return 'degraded';
  return 'healthy';
}

export function formatHealthResponse(check: HealthCheck): { status: number; body: object } {
  const statusCode = check.status === 'healthy' ? 200 : check.status === 'degraded' ? 200 : 503;
  return {
    status: statusCode,
    body: {
      status: check.status,
      service: check.service,
      timestamp: check.timestamp,
      version: check.version,
      uptime: check.uptime,
      checks: check.checks,
    },
  };
}
