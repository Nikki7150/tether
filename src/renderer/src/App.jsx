import { useEffect, useRef, useState } from 'react';
import './styles/App.css'
import AddTask from './components/AddTask';
import TaskList from './components/TaskList';
import { useTaskStore } from './store/useTaskStore';

function App() {
  const [expanded, setExpanded] = useState(false);
  const [focusRequestId, setFocusRequestId] = useState(0);
  const panelContentRef = useRef(null);
  const { tasks } = useTaskStore();
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

    requestAnimationFrame(() => {
      if (!panelContentRef.current) return;
      const requiredHeight = panelContentRef.current.scrollHeight;
      window.electron.ipcRenderer.send('set-panel-height', requiredHeight);
    });
  }, [expanded, tasks.length]);

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
      {!expanded && <button className='num-tasks' onClick={toggle}>{incompleteTotalTasks}</button>}
      {expanded && (
        <div className='to-do-list-container' ref={panelContentRef} onMouseDown={(e) => e.stopPropagation()}>
          <button className='toggle-close' onClick={toggle}>X</button>
          <AddTask focusRequestId={focusRequestId} />
          <TaskList />
        </div>
      )}
    </div>
  )
}

export default App
