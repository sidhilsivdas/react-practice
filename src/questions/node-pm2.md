## Short answer

**PM2 is a production process manager for Node.js.** It keeps your app **running forever**:

- **Restarts it automatically** if it crashes.
- **Runs it in cluster mode** across all CPU cores, with no cluster code needed.
- **Reloads with zero downtime** on deploy.
- **Manages logs**, monitors CPU and memory, and **starts the app when the server boots**.

**Analogy: a restaurant manager** 👔

- **A cook faints (crash)?** The manager immediately brings in a replacement.
- **A busy night?** The manager opens more stations (cluster mode).
- **Menu change (deploy)?** The manager swaps cooks one at a time, so the kitchen never closes (reload).

---

## Essential commands

```bash
npm install -g pm2

pm2 start app.js --name api        # start (and restart on crash)
pm2 start app.js -i max            # ⭐ cluster mode: one process per CPU core
pm2 list                           # status of all apps (CPU, memory, restarts)
pm2 logs api                       # live logs
pm2 monit                          # live dashboard
pm2 restart api                    # hard restart (brief downtime)
pm2 reload api                     # ⭐ zero-downtime reload (cluster mode)
pm2 stop api                       # stop
pm2 delete api                     # remove from PM2

pm2 startup                        # generate a command to start PM2 when the server boots
pm2 save                           # remember the current app list for the next boot
```

---

## Cluster mode

```bash
pm2 start app.js -i max      # one process per core
pm2 start app.js -i 4        # exactly 4 processes
pm2 scale api +2             # add 2 more while running
```

- **Uses Node's `cluster` module internally**, so your code doesn't change.
- **All processes share the port**, and PM2 load-balances between them.
- **The same rules apply:** processes **don't share memory**, so sessions and caches go in Redis.

### `restart` vs `reload`

| | `pm2 restart` | `pm2 reload` |
|---|---|---|
| How | kills all processes, then starts them | replaces processes **one at a time** |
| Downtime | brief | **none** (in cluster mode) |
| Use for | config changes, fork mode | **deploys** |

**For a safe reload, the app should finish in-flight requests when it receives `SIGINT`** (graceful shutdown), and can tell PM2 when it's ready:

```js
const server = app.listen(3000, () => {
  process.send?.('ready')                    // with wait_ready: true, PM2 waits for this
})

process.on('SIGINT', () => {                 // PM2 sends SIGINT to stop a process
  server.close(() => process.exit(0))        // stop taking new requests, finish current ones
})
```

---

## Ecosystem file

**Keep the configuration in code** instead of long command lines:

```js
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'api',
      script: './src/server.js',
      instances: 'max',               // cluster mode on all cores
      exec_mode: 'cluster',
      max_memory_restart: '500M',     // restart if a process leaks past 500 MB
      wait_ready: true,               // wait for process.send('ready')
      listen_timeout: 10000,
      kill_timeout: 5000,             // time for graceful shutdown before force-kill
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8080,
      },
    },
    {
      name: 'worker',                 // a second app, e.g. a queue consumer
      script: './src/worker.js',
      instances: 2,
    },
  ],
}
```

```bash
pm2 start ecosystem.config.js --env production
pm2 reload ecosystem.config.js --env production   # deploy
```

---

## Useful features

| Feature | How |
|---|---|
| **Auto-restart on crash** | default |
| **Restart on high memory** (leak safety net) | `max_memory_restart: '500M'` |
| **Restart on file changes** (development only) | `--watch` |
| **Log rotation** | `pm2 install pm2-logrotate` |
| **Cron restarts** | `cron_restart: '0 3 * * *'` (every day at 3 AM) |
| **Restart delay / backoff** | `restart_delay`, `exp_backoff_restart_delay` (avoid crash loops) |
| **Run inside Docker** | `pm2-runtime start ecosystem.config.js` (stays in the foreground) |

---

## PM2 vs alternatives

| Tool | Notes |
|---|---|
| **PM2** | All-in-one for VMs and bare servers: restarts, cluster, logs, reload |
| **Docker + Kubernetes** | The container platform restarts and scales containers. Usually **one Node process per container**, so PM2 often isn't needed there. |
| **systemd** | The Linux service manager. Restarts on crash, but no cluster mode or Node-specific features. |
| **nodemon** | **Development only**: restarts when files change. Not a production tool. |

---

## Quick Q&A

**Q: What is PM2?**
A production process manager for Node.js that keeps apps alive with automatic restarts, runs them in cluster mode, does zero-downtime reloads, manages logs, and starts apps on boot.

**Q: How do you run a Node app on all CPU cores with PM2?**
`pm2 start app.js -i max` (cluster mode).

**Q: `pm2 restart` vs `pm2 reload`?**
`restart` kills and restarts everything (brief downtime). `reload` replaces processes one by one with zero downtime in cluster mode.

**Q: How does PM2 survive a server reboot?**
`pm2 startup` registers PM2 as a system service, and `pm2 save` stores the app list to restore.

**Q: What's an ecosystem file?**
`ecosystem.config.js`: a config file listing apps, instances, environment variables, memory limits and other options, so deploys are repeatable.

**Q: Do you need PM2 with Kubernetes?**
Usually not. Kubernetes handles restarts and scaling, and you run one Node process per container (or `pm2-runtime` if you want PM2 features inside a container).

---

## 🎯 Interview answer

> "PM2 is a production process manager for Node. It restarts the app automatically when it crashes, and with `pm2 start app.js -i max` it runs in cluster mode, one process per CPU core sharing the port, without writing any cluster code. For deploys, `pm2 reload` replaces processes one at a time for zero downtime, which works best if the app handles SIGINT by closing the server gracefully and signals readiness with `process.send('ready')`. I keep the config in an `ecosystem.config.js` with instances, environment variables per environment, `max_memory_restart` as a safety net for leaks, and graceful shutdown timeouts, use `pm2 logs` and `monit` for monitoring with log rotation, and `pm2 startup` plus `pm2 save` to survive reboots. Because cluster processes don't share memory, sessions and caches go in Redis. In Kubernetes I'd usually skip PM2 and let the platform handle restarts and scaling."
