/**
 * Client half of dsh-shortcut-restart.
 *
 * The account menu at the sidebar foot offers no item slot, so this plugin
 * renders an inert `shell.overlay` entry whose observer waits for that menu
 * to open, then inserts one row — cloned from the menu's own last row, so it
 * inherits the shipped markup, styling, and keyboard walk — second-to-last,
 * labelled “Restart container”.
 *
 * Selecting the row first consults the client session catalog: when any
 * session reports `running`, or holds a live background job (every session's
 * `job.list` roster is swept briefly), a dialog lists the offenders and
 * declines to restart. Otherwise a confirmation dialog gates the action;
 * confirming POSTs the Host half's route (which runs the deployment's reboot
 * command), shows a notice, and that notice dismisses itself once the browser
 * has seen the connection drop and reconnect.
 */
window.__ModuleLoader__.load({
  id: 'dsh-shortcut-restart',
  factory(require) {
    const React = require('react')
    const { useEffect, useRef, useState } = React
    const h = React.createElement

    const NAMESPACE = 'restartContainer'
    const ROUTE = '/dsh-shortcut-restart/reboot'
    const ROW_ATTRIBUTE = 'data-dsh-shortcut-restart'

    /** The account trigger's accessible name, in every locale the account package ships. */
    const ACCOUNT_MENU_LABELS = new Set([
      'Account menu', '账号菜单', 'アカウントメニュー', 'Menú de cuenta', 'Menu du compte', 'Kontomenü', 'Меню аккаунта', 'Menu da conta',
    ])

    /** Restart glyph in the shipped menu-row style: 16 grid, 1.3 stroke, currentColor. */
    const RESTART_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" aria-hidden="true">'
      + '<path d="M13.3 8A5.3 5.3 0 1 1 11.04 3.66" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"></path>'
      + '<path d="M12.6 5.4 9.9 4.2 12.1 2.7Z" fill="currentColor"></path></svg>'

    const dictionaries = {
      zh: {
        menuLabel: '重启容器',
        overlayTitle: '正在重启容器…',
        overlayBody: '容器正在重启；重启后页面将自动重连。',
        overlayFailedTitle: '重启命令未能发送',
        overlayFailedBody: '插件宿主没有响应。请确认 dsh-shortcut-restart 已启用，或在终端里执行 reboot。',
        confirmTitle: '重启容器？',
        confirmBody: '容器将重启，页面会短暂断开，恢复后自动重连。确认现在重启吗？',
        confirmRestart: '确认重启',
        cancel: '取消',
        blockedTitle: '暂时不能重启容器',
        blockedIntro: '以下会话正在运行或带有后台任务，重启会中断它们。请等它们结束后再重试：',
        blockedUnknown: '暂时无法确认是否有会话正在运行，请稍后再试。',
        gotIt: '知道了',
        close: '关闭',
      
        jobsCountPrefix: '后台任务 × ',
        unownedJobs: '不属于任何会话的后台任务',},
      en: {
        menuLabel: 'Restart container',
        overlayTitle: 'Restarting the container…',
        overlayBody: 'The container is restarting; the page reconnects automatically.',
        overlayFailedTitle: 'Could not send the restart command',
        overlayFailedBody: 'The plugin host did not answer. Check that dsh-shortcut-restart is enabled, or run reboot in a terminal.',
        confirmTitle: 'Restart container?',
        confirmBody: 'The container will restart and this page briefly disconnects, then reconnects on its own. Restart now?',
        confirmRestart: 'Restart now',
        cancel: 'Cancel',
        blockedTitle: 'Cannot restart yet',
        blockedIntro: 'These sessions are running or hold background jobs, and a restart would interrupt them. Try again after they finish:',
        blockedUnknown: 'Cannot confirm whether any session is running right now; try again in a moment.',
        gotIt: 'Got it',
        close: 'Close',
      
        jobsCountPrefix: 'background jobs × ',
        unownedJobs: 'Background jobs without a session',},
      de: {
        menuLabel: 'Container neu starten',
        overlayTitle: 'Container wird neu gestartet…',
        overlayBody: 'Der Container startet neu; die Seite verbindet sich danach automatisch neu.',
        overlayFailedTitle: 'Neustart-Befehl konnte nicht gesendet werden',
        overlayFailedBody: 'Der Plugin-Host hat nicht geantwortet. Prüfe, ob dsh-shortcut-restart aktiviert ist, oder führe reboot im Terminal aus.',
        confirmTitle: 'Container neu starten?',
        confirmBody: 'Der Container startet neu, die Seite trennt sich kurz und verbindet sich danach wieder. Jetzt neu starten?',
        confirmRestart: 'Jetzt neu starten',
        cancel: 'Abbrechen',
        blockedTitle: 'Neustart derzeit nicht möglich',
        blockedIntro: 'Diese Sitzungen laufen oder halten Hintergrundaufgaben, und ein Neustart würde sie unterbrechen. Versuche es nach ihrem Ende erneut:',
        blockedUnknown: 'Es kann derzeit nicht bestätigt werden, ob Sitzungen laufen; versuche es gleich noch einmal.',
        gotIt: 'Verstanden',
        close: 'Schließen',
      
        jobsCountPrefix: 'Hintergrundaufgaben × ',
        unownedJobs: 'Hintergrundaufgaben ohne Sitzung',},
      es: {
        menuLabel: 'Reiniciar contenedor',
        overlayTitle: 'Reiniciando el contenedor…',
        overlayBody: 'El contenedor se está reiniciando; la página se reconecta automáticamente.',
        overlayFailedTitle: 'No se pudo enviar el comando de reinicio',
        overlayFailedBody: 'El host del plugin no respondió. Comprueba que dsh-shortcut-restart esté activado o ejecuta reboot en un terminal.',
        confirmTitle: '¿Reiniciar contenedor?',
        confirmBody: 'El contenedor se reiniciará y esta página se desconectará un momento y se reconectará sola. ¿Reiniciar ahora?',
        confirmRestart: 'Reiniciar ahora',
        cancel: 'Cancelar',
        blockedTitle: 'No se puede reiniciar todavía',
        blockedIntro: 'Estas sesiones están en ejecución o tienen tareas en segundo plano, y un reinicio las interrumpiría. Vuelve a intentarlo cuando terminen:',
        blockedUnknown: 'Ahora no se puede confirmar si hay sesiones en ejecución; inténtalo de nuevo en un momento.',
        gotIt: 'Entendido',
        close: 'Cerrar',
      
        jobsCountPrefix: 'tareas en segundo plano × ',
        unownedJobs: 'Tareas en segundo plano sin sesión',},
      fr: {
        menuLabel: 'Redémarrer le conteneur',
        overlayTitle: 'Redémarrage du conteneur…',
        overlayBody: 'Le conteneur redémarre ; la page se reconnecte automatiquement.',
        overlayFailedTitle: 'Échec de l’envoi de la commande de redémarrage',
        overlayFailedBody: 'L’hôte du plugin n’a pas répondu. Vérifiez que dsh-shortcut-restart est activé, ou lancez reboot dans un terminal.',
        confirmTitle: 'Redémarrer le conteneur ?',
        confirmBody: 'Le conteneur va redémarrer ; la page se déconnecte un instant puis se reconnecte seule. Redémarrer maintenant ?',
        confirmRestart: 'Redémarrer maintenant',
        cancel: 'Annuler',
        blockedTitle: 'Redémarrage impossible pour le moment',
        blockedIntro: 'Ces sessions sont en cours d’exécution ou détiennent des tâches en arrière-plan ; un redémarrage les interromprait. Réessayez une fois terminées :',
        blockedUnknown: 'Impossible de confirmer si des sessions sont en cours ; réessayez dans un instant.',
        gotIt: 'Compris',
        close: 'Fermer',
      
        jobsCountPrefix: 'tâches en arrière-plan × ',
        unownedJobs: 'Tâches en arrière-plan sans session',},
      ja: {
        menuLabel: 'コンテナーを再起動',
        overlayTitle: 'コンテナーを再起動しています…',
        overlayBody: 'コンテナーを再起動しています。再起動後にページは自動的に再接続します。',
        overlayFailedTitle: '再起動コマンドを送信できませんでした',
        overlayFailedBody: 'プラグインのホストが応答しませんでした。dsh-shortcut-restart が有効か確認するか、端末で reboot を実行してください。',
        confirmTitle: 'コンテナーを再起動しますか？',
        confirmBody: 'コンテナーを再起動すると、ページは一時的に切断され、復旧後に自動的に再接続します。今すぐ再起動しますか？',
        confirmRestart: '今すぐ再起動',
        cancel: 'キャンセル',
        blockedTitle: '今は再起動できません',
        blockedIntro: '以下のセッションは実行中かバックグラウンドジョブを保持しており、再起動すると中断されます。終了後に再試行してください：',
        blockedUnknown: '実行中のセッションがあるか確認できません。しばらくしてから再試行してください。',
        gotIt: 'わかりました',
        close: '閉じる',
      
        jobsCountPrefix: 'バックグラウンドジョブ × ',
        unownedJobs: 'セッションに属さないバックグラウンドジョブ',},
      pt: {
        menuLabel: 'Reiniciar contêiner',
        overlayTitle: 'Reiniciando o contêiner…',
        overlayBody: 'O contêiner está reiniciando; a página reconecta automaticamente.',
        overlayFailedTitle: 'Falha ao enviar o comando de reinício',
        overlayFailedBody: 'O host do plugin não respondeu. Verifique se dsh-shortcut-restart está ativado ou execute reboot em um terminal.',
        confirmTitle: 'Reiniciar contêiner?',
        confirmBody: 'O contêiner será reiniciado e esta página desconectará por um instante, reconectando sozinha depois. Reiniciar agora?',
        confirmRestart: 'Reiniciar agora',
        cancel: 'Cancelar',
        blockedTitle: 'Não é possível reiniciar agora',
        blockedIntro: 'Estas sessões estão em execução ou mantêm tarefas em segundo plano, e um reinício as interromperia. Tente novamente quando terminarem:',
        blockedUnknown: 'Não é possível confirmar se há sessões em execução agora; tente novamente em um momento.',
        gotIt: 'Entendi',
        close: 'Fechar',
      
        jobsCountPrefix: 'tarefas em segundo plano × ',
        unownedJobs: 'Tarefas em segundo plano sem sessão',},
      ru: {
        menuLabel: 'Перезапустить контейнер',
        overlayTitle: 'Перезапуск контейнера…',
        overlayBody: 'Контейнер перезапускается; страница переподключится автоматически.',
        overlayFailedTitle: 'Не удалось отправить команду перезапуска',
        overlayFailedBody: 'Хост плагина не ответил. Убедитесь, что dsh-shortcut-restart включён, или выполните reboot в терминале.',
        confirmTitle: 'Перезапустить контейнер?',
        confirmBody: 'Контейнер перезапустится, страница ненадолго отключится и переподключится сама. Перезапустить сейчас?',
        confirmRestart: 'Перезапустить сейчас',
        cancel: 'Отмена',
        blockedTitle: 'Перезапуск пока невозможен',
        blockedIntro: 'Эти сессии выполняются или держат фоновые задачи, перезапуск прервал бы их. Повторите после их завершения:',
        blockedUnknown: 'Сейчас нельзя подтвердить, выполняются ли сессии; повторите попытку чуть позже.',
        gotIt: 'Понятно',
        close: 'Закрыть',
      
        jobsCountPrefix: 'фоновые задачи × ',
        unownedJobs: 'Фоновые задачи без сессии',},
    }

    /** Client context of this plugin's `apply`, for service reads outside React props. */
    let clientCtx
    /** Translate bound to the namespace in `apply`, kept as a prop fallback. */
    let boundTranslate

    /** The account-menu trigger when the opened surface belongs to it, else null. */
    const accountTriggerFor = (surface) => {
      const expanded = Array.from(document.querySelectorAll('button[aria-haspopup="menu"][aria-expanded="true"]'))
        .filter(button => ACCOUNT_MENU_LABELS.has(button.getAttribute('aria-label') ?? ''))
      const positionAnchor = surface.style.getPropertyValue('position-anchor')
      if (positionAnchor !== '') {
        // The menu's own positioning protocol names its trigger; trust it when readable.
        return expanded.find(button => {
          const root = button.closest('span')
          return root !== null && root.style.getPropertyValue('anchor-name') === positionAnchor
        }) ?? null
      }
      return expanded.length === 1 ? expanded[0] : null
    }

    /**
     * Sessions the Host list reports as running. Blank drafts never run; a
     * catalog that has not arrived yet answers `unknown` instead of a guess.
     */
    const readRunningSessions = () => {
      const list = clientCtx?.sessions?.list
      if (list === undefined) return { unknown: true }
      const snapshot = list.getSnapshot()
      if (snapshot.phase !== 'ready') return { unknown: true }
      const titles = snapshot.ids
        .map(id => snapshot.byId[id])
        .filter(row => row !== undefined && row.running === true && row.blank !== true)
        .map(row => row.displayTitle)
      return { titles }
    }

    /**
     * Live background jobs across the workspace: briefly open every session's
     * `job.list` roster, read the live rows, and release the streams again.
     * Settled jobs never block; an unreadable roster counts as empty.
     */
    const collectBackgroundJobs = async (translate) => {
      const jobs = clientCtx?.jobs
      const list = clientCtx?.sessions?.list
      if (jobs === undefined || list === undefined) return { entries: [] }
      const snapshot = list.getSnapshot()
      if (snapshot.phase !== 'ready') return { entries: [] }
      const ids = snapshot.ids.filter(id => snapshot.byId[id]?.blank !== true)
      if (ids.length === 0) return { entries: [] }
      const stops = []
      try {
        for (const id of ids) {
          try { stops.push(jobs.watchRows(id)) } catch { /* one unreadable roster does not sink the check */ }
        }
        await new Promise(resolve => {
          const deadline = Date.now() + 1500
          const tick = () => {
            const rows = jobs.state.getSnapshot().rows
            if (ids.every(id => rows[id] !== undefined) || Date.now() > deadline) { resolve(undefined); return }
            setTimeout(tick, 50)
          }
          tick()
        })
      } finally {
        for (const stop of stops) { try { stop() } catch { /* already released */ } }
      }
      const rows = jobs.state.getSnapshot().rows
      const live = row => row.status === 'running' || row.status === 'stopping'
      const entries = []
      const unowned = new Set()
      for (const id of ids) {
        const roster = rows[id] ?? []
        for (const row of roster) if (live(row) && row.owner === undefined) unowned.add(row.id)
        const owned = roster.filter(row => live(row) && row.owner === id)
        if (owned.length > 0) entries.push({ title: snapshot.byId[id]?.displayTitle ?? id, jobs: owned.length })
      }
      if (unowned.size > 0) entries.push({ title: translate('unownedJobs'), jobs: unowned.size })
      return { entries }
    }

    /** Inert surface: observes the account menu and inserts the restart row. */
    function RestartContainerSurface({ t }) {
      const propT = useRef(t)
      propT.current = t
      // The framework injects `t` for the declared locale; bind() and English cover the rest.
      const tr = (key) => {
        if (typeof propT.current === 'function') return propT.current(key)
        if (typeof boundTranslate === 'function') return boundTranslate(key)
        return dictionaries.en[key]
      }
      const [phase, setPhase] = useState('idle')
      const [blocked, setBlocked] = useState({ unknown: false, entries: [] })
      const primaryButton = useRef(null)
      const cancelButton = useRef(null)

      /** The confirmed step after the confirmation dialog: send the reboot request. */
      const performRestart = () => {
        setPhase('restarting')
        fetch(ROUTE, { method: 'POST' })
          .then(response => { if (!response.ok) setPhase('failed') })
          .catch(() => undefined) // The server dies with the container while this request is in flight.
      }

      useEffect(() => {
        const requestRestart = () => {
          // Host rows close the menu through owner state; close it the way the menu itself does on Escape.
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
          const running = readRunningSessions()
          if (running.unknown === true) {
            setBlocked({ unknown: true, entries: [] })
            setPhase('blocked')
            return
          }
          // Running sessions first; the background-job sweep joins asynchronously.
          const merged = (running.titles ?? []).map(title => ({ title }))
          void collectBackgroundJobs(tr).then(result => {
            for (const entry of result.entries) {
              const existing = merged.find(candidate => candidate.title === entry.title)
              if (existing === undefined) merged.push(entry)
              else existing.jobs = (existing.jobs ?? 0) + entry.jobs
            }
            if (merged.length > 0) {
              setBlocked({ unknown: false, entries: merged })
              setPhase('blocked')
              return
            }
            setPhase('confirm')
          })
        }

        const enhance = (surface) => {
          const rows = surface.querySelectorAll('button[role="menuitem"]')
          if (rows.length < 2) return
          const last = rows[rows.length - 1]
          const wrap = last.parentElement
          const list = wrap?.parentElement ?? null
          if (wrap === null || list === null) return
          if (list.querySelector(`[${ROW_ATTRIBUTE}]`) !== null) return
          // Clone the last row so the insert inherits its exact markup and styling.
          const clone = wrap.cloneNode(true)
          clone.setAttribute(ROW_ATTRIBUTE, '')
          const row = clone.querySelector('button[role="menuitem"]')
          if (row === null) return
          const spans = Array.from(row.querySelectorAll(':scope > span'))
          const labelSpan = spans.find(span => span.querySelector('svg') === null && (span.textContent ?? '').trim() !== '')
          if (labelSpan === undefined) return
          labelSpan.textContent = tr('menuLabel')
          const iconSpan = spans.find(span => span.querySelector('svg') !== null)
          if (iconSpan !== undefined) iconSpan.innerHTML = RESTART_ICON
          row.addEventListener('click', requestRestart)
          list.insertBefore(clone, wrap)
        }

        const consider = (node) => {
          if (!(node instanceof HTMLElement)) return
          if (node.getAttribute('role') !== 'menu' || node.getAttribute('aria-hidden') === 'true') return
          if (accountTriggerFor(node) === null) return
          enhance(node)
        }

        const observer = new MutationObserver(records => {
          for (const record of records) for (const node of record.addedNodes) consider(node)
        })
        observer.observe(document.body, { childList: true })
        return () => observer.disconnect()
      }, [])

      // While restarting, watch the RPC connection: once it has dropped and
      // come back, the container is up again and the notice retires itself.
      useEffect(() => {
        if (phase !== 'restarting') return
        const state = clientCtx?.connection?.state
        if (state === undefined) return
        let sawOutage = state.getSnapshot() !== 'connected'
        const check = () => {
          const value = state.getSnapshot()
          if (value !== 'connected') { sawOutage = true; return }
          if (sawOutage) setPhase('idle')
        }
        return state.subscribe(check)
      }, [phase])

      // Dialog surfaces answer Escape the way the host's own overlays do.
      useEffect(() => {
        if (phase !== 'blocked' && phase !== 'failed' && phase !== 'confirm') return
        const onKey = (event) => { if (event.key === 'Escape') setPhase('idle') }
        document.addEventListener('keydown', onKey)
        return () => { document.removeEventListener('keydown', onKey) }
      }, [phase])

      // Landing focus keeps the dialog keyboard-first; a confirmation lands on
      // its cancelling action so an accidental Enter declines the restart.
      useEffect(() => {
        if (phase !== 'blocked' && phase !== 'failed' && phase !== 'confirm') return
        ;(phase === 'confirm' ? cancelButton : primaryButton).current?.focus()
      }, [phase])

      if (phase === 'idle') return null
      const failed = phase === 'failed'
      const restarting = phase === 'restarting'
      const confirming = phase === 'confirm'
      const title = restarting ? tr('overlayTitle') : failed ? tr('overlayFailedTitle') : confirming ? tr('confirmTitle') : tr('blockedTitle')
      const bodyStyle = { fontSize: '14px', lineHeight: '22px', color: 'var(--dsw-alias-label-secondary)' }
      const primaryButtonStyle = {
        padding: '6px 18px', fontSize: '13px', lineHeight: '20px',
        color: 'var(--dsw-alias-label-primary-foreground)', background: 'var(--dsw-alias-button-primary-fill)',
        border: 'none', borderRadius: '10px', cursor: 'pointer',
      }
      const ghostButtonStyle = {
        padding: '5px 17px', fontSize: '13px', lineHeight: '20px',
        color: 'var(--dsw-alias-label-primary)', background: 'transparent',
        border: '1px solid var(--dsw-alias-border-l2)', borderRadius: '10px', cursor: 'pointer',
      }
      return h('div', {
        style: {
          position: 'fixed', inset: '0', zIndex: 1200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--dsw-alias-bg-mask-1)',
        },
      }, h('div', {
        role: restarting ? 'status' : 'dialog',
        'aria-modal': restarting ? undefined : 'true',
        'aria-label': title,
        style: {
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
          maxWidth: 'min(440px, calc(100vw - 48px))', padding: '28px 36px', textAlign: 'center',
          background: 'var(--dsw-alias-bg-layer-2)', color: 'var(--dsw-alias-label-primary)',
          border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 'var(--dsw-radius-lg)',
          boxShadow: 'var(--dsw-shadow-lv3)',
        },
      },
        restarting ? h('span', {
          'aria-hidden': 'true',
          style: { color: 'var(--dsw-alias-label-primary)', display: 'inline-flex' },
          dangerouslySetInnerHTML: { __html: RESTART_ICON.replace('viewBox="0 0 16 16"', 'width="24" height="24" viewBox="0 0 16 16"') },
        }) : undefined,
        h('div', { style: { fontSize: '16px', fontWeight: 600, color: failed ? 'var(--dsw-alias-state-warn-label)' : 'var(--dsw-alias-label-primary)' } }, title),
        restarting && h('div', { style: bodyStyle }, tr('overlayBody')),
        failed && h('div', { style: bodyStyle }, tr('overlayFailedBody')),
        confirming && h('div', { style: bodyStyle }, tr('confirmBody')),
        phase === 'blocked' && h('div', { style: { ...bodyStyle, textAlign: 'left', alignSelf: 'stretch' } },
          blocked.unknown ? tr('blockedUnknown') : tr('blockedIntro')),
        phase === 'blocked' && !blocked.unknown && h('ul', {
          style: {
            alignSelf: 'stretch', listStyle: 'none', margin: 0, padding: '4px 12px',
            maxHeight: '168px', overflowY: 'auto', textAlign: 'left',
            background: 'var(--dsw-alias-bg-layer-1)', borderRadius: 'var(--dsw-radius-lg)',
            border: '1px solid var(--dsw-alias-border-l1)',
          },
        }, blocked.entries.map((entry, index) => h('li', {
          key: index,
          style: { padding: '5px 4px', fontSize: '13px', lineHeight: '20px', color: 'var(--dsw-alias-label-secondary)', borderBottom: index === blocked.entries.length - 1 ? undefined : '1px solid var(--dsw-alias-border-l1)', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '12px' },
        }, h('span', { style: { minWidth: 0, overflowWrap: 'anywhere' } }, entry.title),
          entry.jobs === undefined ? undefined : h('span', { style: { flexShrink: 0, fontSize: '12px', color: 'var(--dsw-alias-label-tertiary)' } }, `${tr('jobsCountPrefix')}${entry.jobs}`)))),
        confirming ? h('div', { style: { display: 'flex', gap: '10px', marginTop: '8px' } },
          h('button', {
            ref: cancelButton,
            type: 'button',
            onClick: () => { setPhase('idle') },
            style: ghostButtonStyle,
          }, tr('cancel')),
          h('button', {
            type: 'button',
            onClick: () => { performRestart() },
            style: primaryButtonStyle,
          }, tr('confirmRestart')),
        ) : restarting ? undefined : h('button', {
          ref: primaryButton,
          type: 'button',
          onClick: () => { setPhase('idle') },
          style: { ...primaryButtonStyle, marginTop: '8px' },
        }, phase === 'blocked' ? tr('gotIt') : tr('close')),
      ))
    }

    return {
      inject: ['slots', 'locale', 'sessions', 'connection', 'jobs'],
      apply(ctx) {
        clientCtx = ctx
        ctx.effect(() => ctx.locale.register(NAMESPACE, dictionaries), 'dsh-shortcut-restart: locale')
        if (typeof ctx.locale?.bind === 'function') boundTranslate = ctx.locale.bind(NAMESPACE)
        ctx.effect(() => ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay', id: 'dsh-shortcut-restart', order: 900, locale: NAMESPACE,
        }, RestartContainerSurface)), 'dsh-shortcut-restart: shell.overlay')
      },
    }
  },
})
