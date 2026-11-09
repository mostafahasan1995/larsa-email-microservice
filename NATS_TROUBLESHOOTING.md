# NATS Connection Troubleshooting Guide

## Common Issues and Solutions

### 1. PING Failure Errors
**Error**: `stan: connection lost due to PING failure`

**Causes**:
- Network connectivity issues
- NATS server overload
- Incorrect connection configuration
- Firewall blocking connections

**Solutions**:
- ✅ **Fixed**: Updated ping intervals and timeouts in `util/nats/index.js`
- ✅ **Fixed**: Changed connection URL from `http://` to `nats://`
- ✅ **Fixed**: Added retry mechanism with exponential backoff

### 2. Connection Configuration

**Production Environment Variables**:
```bash
NATS_HOST=pro-nats
NATS_PORT=4222
NATS_JETSTREAM=false  # Important: Set this for streaming mode
```

**Connection URL Format**:
- ✅ **Correct**: `nats://pro-nats:4222`
- ❌ **Wrong**: `http://pro-nats:4222`

### 3. Network Connectivity

**Check NATS Server Accessibility**:
```bash
# Test if NATS server is reachable
telnet pro-nats 4222

# Or using netcat
nc -zv pro-nats 4222
```

**Kubernetes Service Check**:
```bash
# Check if NATS service exists
kubectl get svc | grep nats

# Check NATS pod status
kubectl get pods | grep nats

# Check NATS logs
kubectl logs -l app=nats
```

### 4. Connection Timeouts

**Updated Configuration**:
- `connectTimeout`: 10000ms (was 3000ms)
- `ackTimeout`: 30000ms (was 3000ms)
- `pingInterval`: 5000ms (was 1000ms)
- `pingMaxOut`: 5 (was 3)
- `reconnectTimeWait`: 5000ms (was 2000ms)

### 5. Retry Mechanism

**New Features**:
- Exponential backoff retry (up to 5 attempts)
- Maximum delay of 30 seconds between retries
- Detailed logging for each attempt

### 6. Monitoring and Debugging

**Log Messages to Watch**:
```
🚀 Attempting to connect to NATS (attempt 1/5): nats://pro-nats:4222
🚀 NATS Connected 🚀
Connected to NATS server: nats://pro-nats:4222
```

**Error Messages**:
```
NATS connection_lost: - [timestamp] - Error: stan: connection lost due to PING failure
Connection lost to: nats://pro-nats:4222
```

### 7. Deployment Checklist

Before deploying to production:

1. ✅ Set `NATS_JETSTREAM=false` in environment variables
2. ✅ Verify `NATS_HOST` and `NATS_PORT` are correct
3. ✅ Ensure NATS server is running and accessible
4. ✅ Check network policies allow connection to NATS
5. ✅ Monitor logs for connection status

### 8. Quick Fix Commands

**Restart NATS Server**:
```bash
kubectl rollout restart deployment/nats
```

**Check NATS Health**:
```bash
kubectl exec -it <nats-pod> -- nats-server --version
```

**Test Connection from Pod**:
```bash
kubectl exec -it <email-service-pod> -- telnet pro-nats 4222
```

## Recent Fixes Applied

1. **URL Protocol**: Changed from `http://` to `nats://`
2. **Timeout Values**: Increased all timeout values for production stability
3. **Retry Logic**: Added exponential backoff retry mechanism
4. **Better Logging**: Enhanced error messages and connection status logging
5. **Environment Variables**: Created example configuration file 