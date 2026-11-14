import { useEffect, useRef, useState } from 'react';
import './styles/App.css'
import AddTask from './components/AddTask';
import TaskList from './components/TaskList';
import Settings from './components/Settings';
import { useTaskStore } from './store/useTaskStore';
import Logo from './assets/tether-logo.png';

function App() {
  const [expanded, setExpanded] = useState(false);
  const [focusRequestId, setFocusRequestId] = useState(0);
  const panelContentRef = useRef(null);
  const { tasks, loaded, loadTasks } = useTaskStore();
  const [view, setView] = useState('tasks');
  const [notionConnected, setNotionConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);
  const [notice, setNotice] = useState(null);

  const handleMouseDown = () => {
    let hasMoved = false;
    window.electron.ipcRenderer.send('drag-start');
    const onMove = () => {
      window.electron.ipcRenderer.send('drag-move');
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.electron.ipcRenderer.send('drag-end');
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };
  const toggle = () => {
    const next = !expanded
    setExpanded(next)
    window.electron.ipcRenderer.send('set-expanded', next)
    setView('tasks');
  }
  const incompleteTotalTasks = tasks.filter((task) => !task.completed).length;

  useEffect(() => {
    if (!expanded) return;
    const panel = panelContentRef.current;
    if (!panel) return;
    const noticeEl = panel.querySelector('.sync-notice');
    const header = panel.querySelector('.panel-header');
    const add = panel.querySelector('.add-task-container');
    const target = panel.querySelector(view === 'tasks' ? '.task-list-inner' : '.settings-view');
    if (!header || !target) return;
    const EXTRA = 80;
    const measure = () => {
      if (window.innerWidth < 250) return;
      const required = header.offsetHeight + (add ? add.offsetHeight : 0) + target.offsetHeight + EXTRA + (noticeEl ? noticeEl.offsetHeight : 0);
      window.electron.ipcRenderer.send('set-panel-height', required);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(target);
    return () => observer.disconnect();
  }, [expanded, view, notice]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (!loaded) return;
    window.electron.ipcRenderer.invoke('tasks:save', tasks).catch(console.error);
  }, [tasks, loaded]);

  useEffect(() => {
    window.electron.ipcRenderer.invoke('notion:status')
      .then((status) => setNotionConnected(status.connected))
      .catch(() => setNotionConnected(false));
  }, []);

  useEffect(() => {
    const handleFocusAddTaskInput = () => {
      if (!expanded) {
        setExpanded(true);
        window.electron.ipcRenderer.send('set-expanded', true);
      }
      setView('tasks');
      setFocusRequestId((prev) => prev + 1);
    };
    const handleOpenSettings = () => {
      if (!expanded) {
        setExpanded(true);
        window.electron.ipcRenderer.send('set-expanded', true);
      }
      setView('settings');
    };
    window.electron.ipcRenderer.on('focus-add-task-input', handleFocusAddTaskInput);
    window.electron.ipcRenderer.on('open-settings', handleOpenSettings);
    return () => {
      window.electron.ipcRenderer.removeListener('focus-add-task-input', handleFocusAddTaskInput);
      window.electron.ipcRenderer.removeListener('open-settings', handleOpenSettings);
    };
  }, [expanded]);

  const flashNotice = (text) => {
    setNotice({ kind: 'info', text });
    setTimeout(() =>
      setNotice((n) => (n?.kind === 'info' ? null : n))
    , 3000);
  }

  const runSync = async ({ manual = false } = {}) => {
    if (syncingRef.current) return;
    const { tasks: latest, markSynced } = useTaskStore.getState();
    const pending = latest.filter((t) => t.completed && !t.syncedAt);
    if (pending.length === 0) {
      if (manual) flashNotice('Everything is already synced');
      return;
    }
    syncingRef.current = true;
    setSyncing(true);
    try {
      const result = await window.electron.ipcRenderer.invoke('notion:sync', pending);
      if (result.syncedIds.length > 0) markSynced(result.syncedIds);
      if (result.error === 'auth') {
        setNotice({ kind: 'error', text: 'Notion connection expired. Reconnect in Settings.' });
      } else if (result.error === 'not-configured') {
        setNotionConnected(false);
      } else if (result.error === 'network') {
        if (manual) flashNotice("Couldn't reach Notion. Will try again later.");
      } else {
        setNotice(null);
      }
    } catch (error) {
      console.error('sync crashed:', error);
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  };

  const didLaunchSync = useRef(false);
  useEffect(() => {
    if (!loaded || !notionConnected || didLaunchSync.current) return;
    didLaunchSync.current = true;
    runSync();
  }, [loaded,  notionConnected]); // Launch sync

  useEffect(() => {
    if (!notionConnected) return;
    const HOUR_MS = 60 * 60 * 1000;
    const intervalId = setInterval(() => {
      runSync();
    }, HOUR_MS);
    return () => {
      clearInterval(intervalId);
    };
  }, [notionConnected])

  useEffect(() => setNotice(null), [notionConnected]);

  return (
    <div className={expanded ? 'app expanded' : 'app'} onMouseDown={handleMouseDown}>
      {!expanded && <button className='num-tasks' onClick={toggle}>{loaded ? incompleteTotalTasks : '-'}</button>}
      {expanded && (
        <div className='panel' ref={panelContentRef}>
          <header className='panel-header'>
            <button className='toggle-close' onClick={toggle} onMouseDown={(e) => e.stopPropagation()}>X</button>
            <img src={Logo} alt="Tether logo" className="logo" />
            {notionConnected ? (
              <button
                className='toggle-close'
                onClick={() => runSync({ manual: true })}
                disabled={syncing}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {syncing ? '...' : 'Sync'}
              </button>
            ) : (
              <span></span>
            )}
          </header>
          {notice && (
            <p className={`sync-notice ${notice.kind}`} onMouseDown={(e) => e.stopPropagation()}>
              {notice.text}
              {notice.kind === 'error' && <button onClick={() => setView('settings')}>Settings</button>}
            </p>
          )}
          {view === 'tasks' ? (
            <div className='to-do-list-container' onMouseDown={(e) => e.stopPropagation()}>
              <AddTask focusRequestId={focusRequestId} />
              <TaskList />
            </div>
          ) : (
            <Settings
              notionConnected={notionConnected}
              setNotionConnected={setNotionConnected}
              onBack={() => setView('tasks')}
            />
          )}
          
        </div>
      )}
    </div>
  )
}

export default App
