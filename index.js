/**
 * Host half of dsh-shortcut-restart: one webServer route.
 *
 * POST /dsh-shortcut-restart/reboot runs the deployment's reboot command
 * (for this image: /usr/local/bin/reboot, i.e. `sudo -n kill -TERM 1`). The
 * container's restart policy then brings the same container back. The Host
 * process tree dies with the container, so the route answers before the
 * signal lands and nothing waits on the child.
 *
 * GET (and HEAD) on the same path is a readiness probe that never reboots:
 * it reports which reboot command would run, so the capability can be
 * verified without terminating the container.
 */
import { spawn } from 'node:child_process'
import { accessSync, constants as fsConstants } from 'node:fs'

export const inject = ['webServer', 'connection']

const ROUTE_PATH = '/dsh-shortcut-restart/reboot'
const REBOOT_HELPER = '/usr/local/bin/reboot'

/** First executable `reboot` on the filesystem or PATH, else undefined. */
const resolveRebootCommand = () => {
  for (const candidate of [REBOOT_HELPER, ...(process.env.PATH ?? '').split(':')]) {
    const path = candidate === '' ? undefined : candidate.endsWith('/reboot') || candidate === REBOOT_HELPER ? candidate : `${candidate}/reboot`
    if (path === undefined) continue
    try {
      accessSync(path, fsConstants.X_OK)
      return path
    } catch {
      // Not present or not executable in this deployment; keep looking.
    }
  }
  return undefined
}

/** Start the reboot and never wait for it: the whole tree exits with the container. */
const fireReboot = (log) => {
  const resolved = resolveRebootCommand()
  const child = resolved === undefined
    // Deployment without the reboot helper: deliver the same signal directly.
    ? spawn('sudo', ['-n', 'kill', '-TERM', '1'], { stdio: 'ignore', detached: true })
    : spawn(resolved, [], { stdio: 'ignore', detached: true })
  child.unref()
  child.on('error', (error) => { log(`reboot command failed to start: ${error.message}`) })
  return { kind: 'started', command: resolved ?? 'sudo -n kill -TERM 1' }
}

export function apply(ctx) {
  const log = (message) => { ctx.logger?.warn(`dsh-shortcut-restart: ${message}`) }

  /** Reject an untrusted or unauthenticated request; true when it was rejected. */
  const rejected = (req, res) => {
    const rejection = ctx.connection.requestRejection(req)
    if (rejection === undefined) return false
    res.statusCode = rejection
    res.end()
    return true
  }

  const sendJson = (res, status, body) => {
    res.statusCode = status
    res.setHeader('content-type', 'application/json; charset=utf-8')
    res.setHeader('cache-control', 'no-store')
    res.end(JSON.stringify(body))
  }

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: ROUTE_PATH,
    handler: async (req, res) => {
      if (rejected(req, res)) return
      if (req.method === 'GET' || req.method === 'HEAD') {
        // Readiness probe only; never reboots.
        sendJson(res, 200, { ok: true, route: ROUTE_PATH, reboot: resolveRebootCommand() })
        return
      }
      if (req.method !== 'POST') {
        res.setHeader('allow', 'GET, HEAD, POST')
        sendJson(res, 405, { code: 'method-not-allowed' })
        return
      }
      log('reboot requested from the account menu')
      sendJson(res, 200, fireReboot(log))
    },
  }), `dsh-shortcut-restart: ${ROUTE_PATH}`)
}
