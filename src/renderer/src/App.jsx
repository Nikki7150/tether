import { useEffect, useRef, useState } from 'react';
import './styles/App.css'
import AddTask from './components/AddTask';
import TaskList from './components/TaskList';
import { useTaskStore } from './store/useTaskStore';

function App() {
  const [expanded, setExpanded] = useState(false);
  const [focusRequestId, setFocusRequestId] = useState(0);
  const panelContentRef = useRef(null);
  const { tasks, loaded, loadTasks } = useTaskStore();
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
  }
  const incompleteTotalTasks = tasks.filter((task) => !task.completed).length;

  useEffect(() => {
    if (!expanded) return;
    const panel = panelContentRef.current;
    const list = panel.querySelector('.task-list-container');
    const inner = panel.querySelector('.task-list-inner');
    const chromeHeight = panel.offsetHeight - list.clientHeight;
    requestAnimationFrame(() => {
      if (!panelContentRef.current) return;
      const requiredHeight = chromeHeight + inner.offsetHeight;
      window.electron.ipcRenderer.send('set-panel-height', requiredHeight);
    });
  }, [expanded, tasks.length]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (!loaded) return;
    window.electron.ipcRenderer.invoke('tasks:save', tasks).catch(console.error);
  }, [tasks, loaded]);

  useEffect(() => {
    const handleFocusAddTaskInput = () => {
      if (!expanded) {
        setExpanded(true);
        window.electron.ipcRenderer.send('set-expanded', true);
      }
      setFocusRequestId((prev) => prev + 1);
    };
    window.electron.ipcRenderer.on('focus-add-task-input', handleFocusAddTaskInput);
    return () => {
      window.electron.ipcRenderer.removeListener('focus-add-task-input', handleFocusAddTaskInput);
    };
  }, [expanded]);

  return (
    <div className={expanded ? 'app expanded' : 'app'} onMouseDown={handleMouseDown}>
      {!expanded && <button className='num-tasks' onClick={toggle}>{loaded ? incompleteTotalTasks : '-'}</button>}
      {expanded && (
        <div className='panel' ref={panelContentRef}>
          <header className='panel-header'>
            <button className='toggle-close' onClick={toggle} onMouseDown={(e) => e.stopPropagation()}>X</button>
            <span className='title'>Tether</span>
            <span></span>
          </header>
          <div className='to-do-list-container' onMouseDown={(e) => e.stopPropagation()}>
            <AddTask focusRequestId={focusRequestId} />
            <TaskList />
          </div>
        </div>
      )}
    </div>
  )
}

export default App
